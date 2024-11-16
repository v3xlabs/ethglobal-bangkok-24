const express = require("express");
const ethers = require("ethers");
require("dotenv").config();

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

const app = express();
app.use(express.json());

function checkSig(data) {
  const hash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["string", "string[]", "uint256"],
      ["RENEW_NAME", data.msg.names, data.msg.value]
    )
  );
  const addr = ethers.utils.verifyMessage(
    ethers.utils.arrayify(hash),
    data.sig
  );
  return addr.toLowerCase() === data.signer.toLowerCase();
}

async function checkTokens(addr, value) {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const token = new ethers.Contract(
    process.env.TOKEN_ADDRESS,
    ERC20_ABI,
    provider
  );
  const bal = await token.balanceOf(addr);
  return bal.gte(value);
}

function validateInput(data) {
  if (!data.msg?.names?.length) return "no names";
  if (!data.msg?.value) return "no value";
  if (!data.sig || !data.signer) return "missing sig or signer";
  try {
    ethers.BigNumber.from(data.msg.value);
  } catch {
    return "bad value format";
  }
  if (!ethers.utils.isAddress(data.signer)) return "invalid address";
  return null;
}

/**
 * ! mocked for now - just checks if sig structure is correct and if signer has enough funds
 * todo - add check for user having allowance set for solver smart contract
 * add mempool
 * submitting action request to solver API
 * todo - add more actions
 * test with sepolia ens
 * oracles for other tokens
 */
app.post("/submit", async (req, res) => {
  try {
    const err = validateInput(req.body);
    if (err) return res.status(400).json({ error: err });

    if (!checkSig(req.body))
      return res.status(400).json({ error: "bad signature" });

    const hasTokens = await checkTokens(req.body.signer, req.body.msg.value);
    if (!hasTokens) return res.status(400).json({ error: "not enough tokens" });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Running on ${port}`));
