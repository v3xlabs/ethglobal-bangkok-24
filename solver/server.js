const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
const { ethers } = require("ethers");
require("dotenv").config();

const app = express();
app.use(express.json());

const CONFIG = {
  RPC_URL: process.env.RPC_URL,
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
  REWARD_TOKEN: process.env.REWARD_TOKEN,
  PORT: process.env.PORT || 3000,
};

let provider;
let contract;
let tokenContract;
let db;

async function initDb() {
  db = await open({
    filename: "./messages.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_address TEXT NOT NULL,
            signature TEXT NOT NULL,
            names TEXT NOT NULL,
            value TEXT NOT NULL,
            nonce INTEGER NOT NULL,
            deadline INTEGER NOT NULL,
            one_time BOOLEAN NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            executed BOOLEAN DEFAULT FALSE,
            execution_tx TEXT,
            execution_time TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_user_address ON messages(user_address);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_signature ON messages(signature);
    `);
}

async function initContracts() {
  provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);

  const abi = [
    "function calculateIntentHash(string[] calldata names, uint256 value, uint256 nonce, uint256 deadline, bool oneTime) public pure returns (bytes32)",
    "function isNameExpiringSoon(string memory name) public view returns (bool)",
    "function getNamePrice(string memory name) public view returns (uint256)",
    "function getTotalPrice(string[] memory names) public view returns (uint256)",
  ];

  contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, abi, provider);

  const tokenAbi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ];

  tokenContract = new ethers.Contract(CONFIG.REWARD_TOKEN, tokenAbi, provider);
}

async function validateMessage(message) {
  const { names, value, nonce, deadline, oneTime, signature } = message;

  if (!names || !Array.isArray(names) || names.length === 0) {
    throw new Error("Invalid names array");
  }

  if (!ethers.utils.isHexString(signature) || signature.length !== 132) {
    throw new Error("Invalid signature format");
  }

  try {
    const messageHash = await contract.calculateIntentHash(
      names,
      value,
      nonce,
      deadline,
      oneTime
    );
    const messageHashBytes = ethers.utils.arrayify(messageHash);
    const ethSignedMessageHash = ethers.utils.hashMessage(messageHashBytes);
    const signer = ethers.utils.recoverAddress(ethSignedMessageHash, signature);

    const balance = await tokenContract.balanceOf(signer);
    if (balance.lt(ethers.BigNumber.from(value))) {
      throw new Error("Insufficient token balance");
    }

    const allowance = await tokenContract.allowance(
      signer,
      CONFIG.CONTRACT_ADDRESS
    );
    if (allowance.lt(ethers.BigNumber.from(value))) {
      throw new Error("Insufficient token allowance");
    }

    for (const name of names) {
      const isExpiring = await contract.isNameExpiringSoon(name);
      if (!isExpiring) {
        throw new Error(`Name ${name} is not expiring soon`);
      }
    }

    return { signer, messageHash };
  } catch (error) {
    throw new Error(`Validation failed: ${error.message}`);
  }
}

app.post("/api/messages", async (req, res) => {
  try {
    const message = req.body;
    console.log("Received message:", message);

    const { signer, messageHash } = await validateMessage(message);
    console.log("Validation passed:", { signer, messageHash });

    await db.run(
      `INSERT INTO messages 
            (user_address, signature, names, value, nonce, deadline, one_time) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        signer,
        message.signature,
        JSON.stringify(message.names),
        message.value,
        message.nonce,
        message.deadline,
        message.oneTime ? 1 : 0,
      ]
    );

    res.json({
      status: "success",
      data: { signer, messageHash },
    });
  } catch (error) {
    console.error("Error processing message:", error);
    res.status(400).json({
      status: "error",
      error: error.message,
    });
  }
});

app.get("/api/messages/:address", async (req, res) => {
  try {
    const messages = await db.all(
      "SELECT * FROM messages WHERE user_address = ? ORDER BY created_at DESC",
      [req.params.address]
    );

    res.json({
      status: "success",
      data: messages.map((msg) => ({
        ...msg,
        names: JSON.parse(msg.names),
        oneTime: !!msg.one_time,
        executed: !!msg.executed,
      })),
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

app.put("/api/messages/:id/executed", async (req, res) => {
  try {
    const { tx_hash } = req.body;
    if (!tx_hash) throw new Error("Transaction hash required");

    await db.run(
      `UPDATE messages 
            SET executed = TRUE, 
                execution_tx = ?, 
                execution_time = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      [tx_hash, req.params.id]
    );

    res.json({ status: "success" });
  } catch (error) {
    console.error("Error updating message:", error);
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

async function start() {
  await initDb();
  await initContracts();
  app.listen(CONFIG.PORT, () => {
    console.log(`Server running on port ${CONFIG.PORT}`);
  });
}

start().catch(console.error);
