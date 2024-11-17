# Intent-Based ENS Solver Network For ENS Auto-Renewals

A decentralized public good enabling gasless, automated ENS domain renewals through intent-based transactions and off-chain solvers.

## Intent Management:

Users generate signed intents specifying: target ENS domain names, maximum price parameters (renewal fee + gas fee + solver reward), renewal conditions (expiration threshold, gas price threshold).

## Off-Chain Infrastructure:

- REST API endpoints for intent submission and validation
- Local mempool implementation for intent storage and management
- Continuous monitoring of: ENS domain expiration timestamps, Ethereum network gas prices, user token balances.

## Value Proposition:

- Eliminates manual renewal tracking
- Reduces gas costs thanks to execution timing
- Improves UX through gasless intent submission
- Ensures ENS domains for individuals and important projects in web3 don't expire

## Frontend

User friendly UI with intent creation and management.

## Contracts

Deployed to local fork of Ethereum Sepolia.

## API Overview

Current flow:

1. User signs action using `sign message` Metamask feature which should contain array of ENS names and a numeric value which represents reward for executing each action.
2. Backend solver submits tx on-chain.
3. Contract verifies signatures and token balances.
4. Auto-renew ENS names if conditions are met (`X` days until expiry date, gas price at or below `Y`).

## API Endpoints

### Add new intent

curl -X POST http://localhost:3000/api/verify-intent \
 -H "Content-Type: application/json" \
 -d '{
"names": ["test1", "test2"],
"value": "123456789",
"signature": "0x4c1ffe17790d5773ba5c357893adc5a94e44cd8fd437363bc639597e6c054eef6f591b3bd95dbbf822b663b75817fcb5b68ecbcb4c05daf68d6aa16c2224d3db1b"
}'

### Get intents for address

curl http://localhost:3000/api/intents/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

## Get all expiry dates

curl http://localhost:3000/api/expiry-dates

````

## Setup

1. Install dependencies:

```bash
npm install ethers@5.7.2 express dotenv
````

2. Dotenv onfiguration:

```bash
RPC_URL=your_rpc_url
CONTRACT_ADDRESS=your_contract_address
TOKEN_ADDRESS=your_token_address // for the payment token - should be WETH mock
PORT=3000
```

3. Run API server:

```bash
node server.js
```
