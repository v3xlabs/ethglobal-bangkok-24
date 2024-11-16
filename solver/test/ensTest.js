const { ethers } = require("ethers");
const MessageVerification = require("../../contracts/out/MessageVerification.sol/MessageVerification.json");
const IERC20 = require("../../contracts/out/IERC20.sol/IERC20.json");
require("dotenv").config();

const CONFIG = {
  // CHAIN_ID: process.env.ID,
  RPC_URL: process.env.RPC_URL || "http://localhost:8545",
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
  REWARD_TOKEN: process.env.REWARD_TOKEN,
};

async function main() {
  //   validateConfig();

  const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(
    CONFIG.CONTRACT_ADDRESS,
    MessageVerification.abi,
    wallet
  );
  const rewardToken = new ethers.Contract(
    CONFIG.REWARD_TOKEN,
    IERC20.abi,
    wallet
  );

  const names = ["vitalik"];
  const value = ethers.utils.parseEther("0.1");
  const nonce = Date.now();
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  const oneTime = true;

  try {
    console.log("\nContract Info:");
    console.log("Wallet:", wallet.address);
    console.log("Contract:", contract.address);
    console.log("Reward Token:", CONFIG.REWARD_TOKEN);
    console.log("Names:", names);

    console.log("\nChecking balances:");
    const ethBalance = await provider.getBalance(wallet.address);
    console.log("ETH balance:", ethers.utils.formatEther(ethBalance), "ETH");
    const tokenBalance = await rewardToken.balanceOf(wallet.address);
    console.log("Token balance:", ethers.utils.formatEther(tokenBalance));

    console.log("\nChecking approval:");
    const currentAllowance = await rewardToken.allowance(
      wallet.address,
      contract.address
    );
    console.log(
      "Current allowance:",
      ethers.utils.formatEther(currentAllowance)
    );

    if (currentAllowance.lt(value)) {
      console.log("Approving tokens...");
      const approveTx = await rewardToken.approve(
        contract.address,
        ethers.constants.MaxUint256
      );
      await approveTx.wait();
      console.log("Approval confirmed");
    }

    console.log("\nChecking expiry:");
    for (const name of names) {
      const expiry = await contract.getNameExpiry(name);
      console.log(`${name} expiry:`, new Date(expiry.toNumber() * 1000));
      const isExpiring = await contract.isNameExpiringSoon(name);
      console.log(`${name} expiring soon:`, isExpiring);
    }

    console.log("\nGetting prices:");
    const prices = await Promise.all(
      names.map((name) => contract.getNamePrice(name))
    );
    prices.forEach((price, i) => {
      console.log(`${names[i]} price:`, ethers.utils.formatEther(price), "ETH");
    });

    const totalPrice = await contract.getTotalPrice(names);
    console.log("Total price:", ethers.utils.formatEther(totalPrice), "ETH");

    console.log("\nPreparing signature:");
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

    console.log("\nSubmitting transaction...");
    const tx = await contract.executeRenewal(
      names,
      value,
      nonce,
      deadline,
      oneTime,
      signature,
      {
        value: totalPrice,
        gasLimit: 500000,
      }
    );

    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(
      "\nTransaction confirmed:",
      receipt.status === 1 ? "Success" : "Failed"
    );
    console.log("Gas used:", receipt.gasUsed.toString());

    if (receipt.events) {
      for (const event of receipt.events) {
        if (event.event === "IntentExecuted") {
          console.log("\nIntent executed:");
          console.log("User:", event.args.user);
          console.log("Intent hash:", event.args.intentHash);
          console.log("Names:", event.args.names);
        } else if (event.event === "RewardPaid") {
          console.log("\nReward paid:");
          console.log("Executor:", event.args.executor);
          console.log("Owner:", event.args.intentOwner);
          console.log(
            "Value:",
            ethers.utils.formatEther(event.args.value),
            "ETH"
          );
        }
      }
    }

    console.log("\nChecking new balances:");
    const newEthBalance = await provider.getBalance(wallet.address);
    console.log(
      "New ETH balance:",
      ethers.utils.formatEther(newEthBalance),
      "ETH"
    );
    const newTokenBalance = await rewardToken.balanceOf(wallet.address);
    console.log(
      "New token balance:",
      ethers.utils.formatEther(newTokenBalance)
    );

    console.log("\nChecking new expiry:");
    for (const name of names) {
      const expiry = await contract.getNameExpiry(name);
      console.log(`${name} new expiry:`, new Date(expiry.toNumber() * 1000));
    }
  } catch (error) {
    console.error("\nError occurred:");
    if (error.reason) console.error("Reason:", error.reason);
    if (error.error?.message)
      console.error("Error message:", error.error.message);
    if (error.receipt) {
      console.error("Transaction status:", error.receipt.status);
      console.error("Gas used:", error.receipt.gasUsed.toString());
    }
    throw error;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main };
