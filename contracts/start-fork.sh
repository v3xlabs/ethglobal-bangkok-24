#!/bin/bash
source .env

NETWORK=${1:-mainnet}

if [ "$NETWORK" = "mainnet" ]; then
    RPC_URL=$MAINNET_RPC_URL
    echo "Starting Mainnet fork..."
elif [ "$NETWORK" = "sepolia" ]; then
    RPC_URL=$SEPOLIA_RPC_URL
    echo "Starting Sepolia fork..."
else
    echo "Invalid network. Use 'mainnet' or 'sepolia'"
    exit 1
fi

anvil --fork-url $RPC_URL \
      --block-time 12
