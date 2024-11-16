#!/bin/bash

NETWORK=${1:-mainnet}

ADDRESSES=(
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"  # Anvil default account 0
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"  # Anvil default account 1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"  # Anvil default account 2
)

if [ "$NETWORK" = "mainnet" ]; then
    ETH_WHALE="0x00000000219ab540356cBB839Cbe05303d7705Fa"  # ETH 2.0 Deposit Contract
    AMOUNT="100000000000000000000" # 100 ETH
    echo "Using Mainnet configuration..."
elif [ "$NETWORK" = "sepolia" ]; then
    ETH_WHALE="0xEDDE602E73103edAD2822F94179DeDa8654f325a"  # Sepolia Faucet
    AMOUNT="10000000000000000000" # 10 ETH
    echo "Using Sepolia configuration..."
else
    echo "Invalid network. Use 'mainnet' or 'sepolia'"
    exit 1
fi

for ADDRESS in "${ADDRESSES[@]}"
do
    cast rpc anvil_impersonateAccount $ETH_WHALE
    
    cast send --unlocked $ADDRESS \
        --from $ETH_WHALE \
        --value $AMOUNT
    
    cast rpc anvil_stopImpersonatingAccount $ETH_WHALE
    
    if [ "$NETWORK" = "mainnet" ]; then
        echo "Sent 100 ETH to $ADDRESS"
    else
        echo "Sent 10 ETH to $ADDRESS"
    fi
done

echo "ETH airdrop completed successfully on $NETWORK!"
