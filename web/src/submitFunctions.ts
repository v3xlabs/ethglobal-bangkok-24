import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  parseEther,
  http,
} from "viem";
import { mainnet } from "viem/chains";
import axios from "axios";

const API_URL = "http://localhost:3000/api";
const CONTRACT_ADDRESS = "0xfa34D7D7aE7C0A2F43A04F4Abf03e8a25c7C8023";

const CONTRACT_ABI = [
  {
    name: "calculateIntentHash",
    type: "function",
    stateMutability: "pure",
    inputs: [
      { name: "names", type: "string[]" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "oneTime", type: "bool" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    name: "isNameExpiringSoon",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ type: "bool" }],
  },
  {
    name: "getNamePrice",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

interface SubmitResponse {
  status: string;
  data: {
    signer: string;
    messageHash: string;
  };
}

export async function submitRenewalIntent(
  names: string[],
  value: string,
  oneTime: boolean = true
): Promise<SubmitResponse> {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
  });

  const walletClient = createWalletClient({
    chain: mainnet,
    transport: custom(window.ethereum),
  });

  const [address] = await walletClient.requestAddresses();
  const nonce = BigInt(Date.now());
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const valueWei = parseEther(value);

  const messageHash = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "calculateIntentHash",
    args: [names, valueWei, nonce, deadline, oneTime],
  });

  const signature = await walletClient.signMessage({
    account: address,
    message: { raw: messageHash as `0x${string}` },
  });

  const response = await axios.post<SubmitResponse>(`${API_URL}/messages`, {
    names,
    value: valueWei.toString(),
    nonce: nonce.toString(),
    deadline: deadline.toString(),
    oneTime,
    signature,
  });

  return response.data;
}

export async function checkNameExpiry(name: string): Promise<boolean> {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
  });

  return await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "isNameExpiringSoon",
    args: [name],
  });
}

export async function getNamePrice(name: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
  });

  const price = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getNamePrice",
    args: [name],
  });

  return formatEther(price);
}
