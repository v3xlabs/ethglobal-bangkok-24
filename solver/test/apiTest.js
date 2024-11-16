const { ethers } = require("ethers");
const axios = require("axios");
require("dotenv").config();

const API_URL = "http://localhost:3000/api";
const CONFIG = {
  RPC_URL: process.env.RPC_URL,
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
  REWARD_TOKEN: process.env.REWARD_TOKEN,
};

const CONTRACT_ABI = [
  "function calculateIntentHash(string[] calldata names, uint256 value, uint256 nonce, uint256 deadline, bool oneTime) public pure returns (bytes32)",
  "function isNameExpiringSoon(string memory name) public view returns (bool)",
  "function getNamePrice(string memory name) public view returns (uint256)",
  "function getTotalPrice(string[] memory names) public view returns (uint256)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

async function testApi() {
  try {
    const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
    const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(
      CONFIG.CONTRACT_ADDRESS,
      CONTRACT_ABI,
      wallet
    );
    const tokenContract = new ethers.Contract(
      CONFIG.REWARD_TOKEN,
      ERC20_ABI,
      wallet
    );

    console.log("\nTest Configuration:");
    console.log("Wallet:", wallet.address);
    console.log("Contract:", CONFIG.CONTRACT_ADDRESS);
    console.log("Token:", CONFIG.REWARD_TOKEN);
    console.log("API URL:", API_URL);

    const names = ["vitalik"];
    const value = ethers.utils.parseEther("0.1").toString();
    const nonce = Date.now();
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const oneTime = true;

    const balance = await tokenContract.balanceOf(wallet.address);
    console.log("\nToken balance:", ethers.utils.formatEther(balance));

    const currentAllowance = await tokenContract.allowance(
      wallet.address,
      CONFIG.CONTRACT_ADDRESS
    );
    console.log(
      "Current allowance:",
      ethers.utils.formatEther(currentAllowance)
    );

    if (currentAllowance.lt(ethers.BigNumber.from(value))) {
      const approveTx = await tokenContract.approve(
        CONFIG.CONTRACT_ADDRESS,
        ethers.constants.MaxUint256
      );
      await approveTx.wait();
      console.log("Token approval confirmed");

      const newAllowance = await tokenContract.allowance(
        wallet.address,
        CONFIG.CONTRACT_ADDRESS
      );
      console.log("New allowance:", ethers.utils.formatEther(newAllowance));
    }

    console.log("\nMessage Parameters:");
    console.log("Names:", names);
    console.log("Value:", ethers.utils.formatEther(value), "ETH");
    console.log("Nonce:", nonce);
    console.log("Deadline:", new Date(deadline * 1000));
    console.log("OneTime:", oneTime);

    const messageHash = await contract.calculateIntentHash(
      names,
      value,
      nonce,
      deadline,
      oneTime
    );
    console.log("Message hash:", messageHash);
    const messageHashBytes = ethers.utils.arrayify(messageHash);
    const signature = await wallet.signMessage(messageHashBytes);
    console.log("Signature:", signature);

    const submitResponse = await axios.post(`${API_URL}/messages`, {
      names,
      value,
      nonce,
      deadline,
      oneTime,
      signature,
    });

    console.log(
      "Submit Response:",
      JSON.stringify(submitResponse.data, null, 2)
    );

    const getResponse = await axios.get(
      `${API_URL}/messages/${wallet.address}`
    );
    console.log("Messages:", JSON.stringify(getResponse.data, null, 2));

    const finalAllowance = await tokenContract.allowance(
      wallet.address,
      CONFIG.CONTRACT_ADDRESS
    );
    console.log("\nFinal allowance:", ethers.utils.formatEther(finalAllowance));
  } catch (error) {
    console.error("\nTest failed:", error);
    if (error.response?.data) {
      console.error("API Error:", error.response.data);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  testApi().catch(console.error);
}

module.exports = { testApi };
