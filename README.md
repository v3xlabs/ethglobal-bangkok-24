# ENS Auto Renewal

## Frontend

ToDo

## Contracts

ToDo

## API Overview

Current flow:

1. User signs action using `sign message` Metamask feature which should contain array of ENS names and a numeric value which represents reward for executing each action.
2. Backend solver submits tx on-chain.
3. Contract verifies signatures and token balances.
4. Auto-renew ENS names if conditions are met (`X` days until expiry date, gas price at or below `Y`).

## API Endpoints

### POST /verify

Verifies signature and token balance plus approvals for name renewal request. If both are correct, it adds the transaction to the solvers network mempool.

Request body:

```json
{
  "message": {
    "names": ["vitalik.eth", "name.eth"],
    "value": "1000000000000000000"
  },
  "signature": "0x...",
  "signer": "0x..."
}
```

Response:

```json
{
  "ok": true
}
```

## Setup

1. Install dependencies:

```bash
npm install ethers@5.7.2 express dotenv
```

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
