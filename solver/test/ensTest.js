require("dotenv").config();
const ethers = require("ethers");
const fs = require("fs");

async function debug() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const names = ["test1", "test2"];
  const value = ethers.BigNumber.from("123456789");

  console.log("\n=== Message Components ===");
  const PREFIX = "RENEW_NAME";

  const messageHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["string", "string[]", "uint256"],
      [PREFIX, names, value]
    )
  );
  console.log(`Original message hash: ${messageHash}`);

  const ethSignedMsg = ethers.utils.arrayify(messageHash);
  console.log(`Message to sign: ${ethers.utils.hexlify(ethSignedMsg)}`);

  const flatSig = await wallet.signMessage(ethSignedMsg);
  console.log(`\n=== Signature Details ===`);
  console.log(`Signature: ${flatSig}`);

  const msgHash = ethers.utils.hashMessage(ethSignedMsg);
  const recoveredAddress = ethers.utils.recoverAddress(msgHash, flatSig);
  console.log(`\n=== Verification ===`);
  console.log(`Recovered address: ${recoveredAddress}`);
  console.log(`Expected address: ${wallet.address}`);
  console.log(
    `Signature valid locally: ${
      recoveredAddress.toLowerCase() === wallet.address.toLowerCase()
    }`
  );

  const contractJson = JSON.parse(
    fs.readFileSync(
      "../contracts/out/MessageVerification.sol/MessageVerification.json"
    )
  );
  const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    contractJson.abi,
    wallet
  );

  console.log("\n=== Pre-Transaction Name Expiry ===");
  for (let name of names) {
    const expiry = await contract.getNameExpiry(name);
    console.log(
      `${name}.eth expiry before: ${new Date(expiry * 1000).toISOString()}`
    );
  }

  console.log("\n=== Price Calculation ===");
  let total = ethers.BigNumber.from(0);
  for (let name of names) {
    const price = await contract.getNamePrice(name);
    total = total.add(price);
    console.log(`Price for ${name}: ${ethers.utils.formatEther(price)} ETH`);
  }
  console.log(`Total needed: ${ethers.utils.formatEther(total)} ETH`);

  console.log("\n=== Sending Transaction ===");
  try {
    const tx = await contract.verifyAndStoreMessage(names, value, flatSig, {
      value: total,
      gasLimit: 500000,
    });
    console.log(`Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(
      `Transaction status: ${receipt.status === 1 ? "Success" : "Failed"}`
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log("\n=== Post-Transaction Message Checks ===");
    const messageCount = await contract.getUserMessageCount(wallet.address);
    console.log(`Total message count for user: ${messageCount}`);

    const latestMessageIndex = messageCount.sub(1);
    const [storedMessages, storedValue] = await contract.getUserMessage(
      wallet.address,
      latestMessageIndex
    );
    console.log("\nLatest stored message details:");
    console.log(`Message index: ${latestMessageIndex}`);
    console.log(`Stored names: ${storedMessages.join(", ")}`);
    console.log(`Stored value: ${storedValue}`);

    console.log("\n=== Post-Transaction Name Expiry ===");
    for (let name of names) {
      const expiry = await contract.getNameExpiry(name);
      console.log(
        `${name}.eth expiry after: ${new Date(expiry * 1000).toISOString()}`
      );
    }
  } catch (e) {
    console.error("Transaction failed:", e.message);
    if (e.error && e.error.data) {
      const reason = ethers.utils.toUtf8String("0x" + e.error.data.slice(138));
      console.log("Revert reason:", reason);
    }
  }
}

debug().catch(console.error);
