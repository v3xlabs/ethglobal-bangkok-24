require("dotenv").config();
const ethers = require("ethers");

const ENS_ADDRESSES = {
  baseRegistrar: "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85",
  controller: "0xFED6a969AaA60E4961FCD3EBF1A2e8913ac65B72",
};

async function test() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const contractJson = JSON.parse(
    fs.readFileSync("./out/MessageVerification.sol/MessageVerification.json")
  );
  const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    contractJson.abi,
    wallet
  );

  const names = ["test1.eth", "test2.eth"];
  const value = ethers.BigNumber.from("123456789");

  const hash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["string", "string[]", "uint256"],
      ["RENEW_NAME", names, value]
    )
  );

  const sig = await wallet.signMessage(ethers.utils.arrayify(hash));

  let total = ethers.BigNumber.from(0);
  for (let name of names) {
    try {
      const price = await contract.getNamePrice(name);
      total = total.add(price);
      console.log(`Price for ${name}: ${ethers.utils.formatEther(price)} ETH`);
    } catch (e) {
      console.error(`Failed to get price for ${name}:`, e);
      return;
    }
  }

  console.log("Total cost:", ethers.utils.formatEther(total), "ETH");

  try {
    const tx = await contract.verifyAndStoreMessage(names, value, sig, {
      value: total,
      gasLimit: 500000,
    });
    console.log("Transaction sent:", tx.hash);
    await tx.wait();
    console.log("Names renewed!");

    const count = await contract.getUserMessageCount(wallet.address);
    const [storedNames, storedValue] = await contract.getUserMessage(
      wallet.address,
      count.sub(1)
    );
    console.log("Stored names:", storedNames);
    console.log("Stored value:", storedValue.toString());
  } catch (e) {
    console.error("Transaction failed:", e);
  }
}

test().catch(console.error);
