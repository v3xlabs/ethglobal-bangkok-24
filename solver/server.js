const express = require("express");
const cors = require("cors");
const ethers = require("ethers");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const fs = require("fs");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Constants
const PREFIX = "RENEW_NAME";
const CONTRACT_ABI = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      "../contracts/out/MessageVerification.sol/MessageVerification.json"
    )
  )
).abi;

// Initialize database
async function initDB() {
  const db = await open({
    filename: "intents.db",
    driver: sqlite3.Database,
  });

  // Create intents table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS intents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signer TEXT NOT NULL,
      signature TEXT NOT NULL,
      names TEXT NOT NULL,
      value TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      status TEXT DEFAULT 'pending'
    )`);

  // Create expiry table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS name_expiry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      expiry_date INTEGER NOT NULL,
      intent_id INTEGER,
      FOREIGN KEY(intent_id) REFERENCES intents(id)
    )`);

  return db;
}

// Verify token balance
async function verifyTokenBalance(address) {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const tokenContract = new ethers.Contract(
    process.env.TOKEN_ADDRESS,
    ["function balanceOf(address) view returns (uint256)"],
    provider
  );

  const balance = await tokenContract.balanceOf(address);
  const requiredBalance = ethers.utils.parseUnits(
    process.env.REQUIRED_TOKEN_AMOUNT,
    18
  );

  return balance.gte(requiredBalance);
}

// Get ENS expiry dates
async function getExpiryDates(names) {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    CONTRACT_ABI,
    provider
  );

  const expiryDates = [];
  for (const name of names) {
    try {
      const expiry = await contract.getNameExpiry(name);
      expiryDates.push({
        name,
        expiry: expiry.toNumber(),
      });
    } catch (error) {
      console.error(`Error getting expiry for ${name}:`, error);
      expiryDates.push({
        name,
        expiry: 0,
        error: error.message,
      });
    }
  }

  return expiryDates;
}

// Initialize DB connection
let db;
(async () => {
  db = await initDB();
})();

// API Endpoints
app.post("/api/verify-intent", async (req, res) => {
  try {
    const { names, value, signature } = req.body;

    // Basic input validation
    if (!Array.isArray(names) || !names.length || !value || !signature) {
      return res.status(400).json({ error: "Invalid input parameters" });
    }

    // Recreate message hash
    const messageHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["string", "string[]", "uint256"],
        [PREFIX, names, value]
      )
    );

    // Verify signature
    const msgHash = ethers.utils.hashMessage(
      ethers.utils.arrayify(messageHash)
    );
    const signer = ethers.utils.recoverAddress(msgHash, signature);

    // Verify token balance
    const hasEnoughTokens = await verifyTokenBalance(signer);
    if (!hasEnoughTokens) {
      return res.status(403).json({ error: "Insufficient token balance" });
    }

    // Get expiry dates
    const expiryDates = await getExpiryDates(names);

    // Store in database
    const result = await db.run(
      `INSERT INTO intents (signer, signature, names, value, timestamp) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        signer,
        signature,
        JSON.stringify(names),
        value,
        Math.floor(Date.now() / 1000),
      ]
    );

    // Store expiry dates
    for (const { name, expiry } of expiryDates) {
      await db.run(
        `INSERT INTO name_expiry (name, expiry_date, intent_id) 
         VALUES (?, ?, ?)`,
        [name, expiry, result.lastID]
      );
    }

    // Write expiry dates to file
    const expiryLog = {
      intentId: result.lastID,
      signer,
      timestamp: new Date().toISOString(),
      expiryDates,
    };

    fs.appendFileSync("expiry_log.jsonl", JSON.stringify(expiryLog) + "\n");

    res.json({
      success: true,
      intentId: result.lastID,
      signer,
      expiryDates,
    });
  } catch (error) {
    console.error("Error processing intent:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get intents for an address
app.get("/api/intents/:address", async (req, res) => {
  try {
    const intents = await db.all(
      `SELECT i.*, GROUP_CONCAT(ne.name || ':' || ne.expiry_date) as expiry_data
       FROM intents i
       LEFT JOIN name_expiry ne ON ne.intent_id = i.id
       WHERE i.signer = ?
       GROUP BY i.id
       ORDER BY i.timestamp DESC`,
      [req.params.address.toLowerCase()]
    );

    // Format the response
    const formattedIntents = intents.map((intent) => ({
      ...intent,
      names: JSON.parse(intent.names),
      expiryData: intent.expiry_data
        ? Object.fromEntries(
            intent.expiry_data.split(",").map((entry) => {
              const [name, expiry] = entry.split(":");
              return [name, parseInt(expiry)];
            })
          )
        : {},
    }));

    res.json(formattedIntents);
  } catch (error) {
    console.error("Error fetching intents:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all expiry dates
app.get("/api/expiry-dates", async (req, res) => {
  try {
    const expiryDates = await db.all(
      `SELECT name, expiry_date, intent_id 
       FROM name_expiry 
       ORDER BY expiry_date ASC`
    );
    res.json(expiryDates);
  } catch (error) {
    console.error("Error fetching expiry dates:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
