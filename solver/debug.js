require("dotenv").config();
const ethers = require("ethers");
const fs = require("fs");

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL, {
    chainId: 31337,
    name: "anvil-local",
    ensAddress: null,
  });

  await provider.ready;
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contractJson = JSON.parse(
    fs.readFileSync(
      "../contracts/out/MessageVerification.sol/MessageVerification.json",
      "utf8"
    )
  );
  const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    contractJson.abi,
    wallet
  );

  const prefix = "RENEW_NAME";
  const messages = ["test1", "test2", "test3"];
  const value = ethers.BigNumber.from("123456789");

  try {
    const messageHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["string", "string[]", "uint256"],
        [prefix, messages, value]
      )
    );
    const signature = await wallet.signMessage(
      ethers.utils.arrayify(messageHash)
    );
    console.log("Messages:", messages);
    console.log("Value:", value.toString());
    console.log("Signature:", signature);

    const tx = await contract.verifyAndStoreMessage(messages, value, signature);
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("Messages stored successfully!");

    const count = await contract.getUserMessageCount(wallet.address);
    console.log("Message count:", count.toString());

    const [storedMessages, storedValue] = await contract.getUserMessage(
      wallet.address,
      count.sub(1)
    );
    console.log("Stored messages:", storedMessages);
    console.log("Stored value:", storedValue.toString());
  } catch (error) {
    console.error("Error:", error);
    if (error.error) {
      console.error("Error details:", error.error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
