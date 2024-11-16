// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;
import "./interfaces/IETHRegistrarController.sol";
import "./interfaces/IBaseRegistrar.sol";
import "./interfaces/IPriceOracle.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract MessageVerification {
    string public constant PREFIX = "RENEW_NAME";
    IERC20 public immutable rewardToken;
    mapping(bytes32 => bool) public executedIntents;
    IBaseRegistrar public constant baseregistrar = IBaseRegistrar(0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85);
    IETHRegistrarController public constant controller = IETHRegistrarController(0xFED6a969AaA60E4961FCD3EBF1A2e8913ac65B72);
    uint256 public constant RENEW_DURATION = 365 days;

    event IntentExecuted(address indexed user, bytes32 indexed intentHash, string[] names);
    event RewardPaid(address indexed executor, address indexed intentOwner, uint256 value);

    constructor(address _rewardToken) {
        rewardToken = IERC20(_rewardToken);
    }

    function getNamePrice(string memory name) public view returns (uint256) {
        IPriceOracle.Price memory price = controller.rentPrice(name, RENEW_DURATION);
        return price.base;
    }

    function getTotalPrice(string[] memory names) public view returns (uint256) {
        uint256 total = 0;
        for(uint i = 0; i < names.length; i++) {
            total += getNamePrice(names[i]);
        }
        return total;
    }

    function getNameExpiry(string memory name) public view returns (uint256) {
        bytes32 labelhash = keccak256(abi.encodePacked(name));
        return baseregistrar.nameExpires(uint256(labelhash));
    }

    function isNameExpiringSoon(string memory name) public view returns (bool) {
        uint256 expiryDate = getNameExpiry(name);
        return expiryDate > 0 && expiryDate <= block.timestamp + 600 days;
    }

    function calculateIntentHash(string[] memory names, uint256 value, uint256 nonce, uint256 deadline, bool oneTime) public pure returns (bytes32) {
        return keccak256(abi.encode(PREFIX, names, value, nonce, deadline, oneTime));
    }

    function executeRenewal(string[] calldata names, uint256 value, uint256 nonce, uint256 deadline, bool oneTime, bytes calldata signature) external payable {
        require(names.length > 0, "Empty names array");
        require(deadline == 0 || block.timestamp <= deadline, "Intent expired");

        bytes32 intentHash = calculateIntentHash(names, value, nonce, deadline, oneTime);
        if (oneTime) {
            require(!executedIntents[intentHash], "One-time intent already executed");
        }

        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", intentHash));
        address signer = recoverSigner(ethSignedMessageHash, signature);
        
        uint256 totalCost = getTotalPrice(names);
        require(msg.value >= totalCost, "Insufficient ETH sent");

        for(uint i = 0; i < names.length; i++) {
            try controller.renew{value: getNamePrice(names[i])}(names[i], RENEW_DURATION) {
            } catch Error(string memory reason) {
                revert(string.concat("ENS renewal failed: ", reason));
            }
        }

        if(oneTime) {
            executedIntents[intentHash] = true;
        }
        
        emit IntentExecuted(signer, intentHash, names);
        require(rewardToken.transferFrom(signer, msg.sender, value), "Reward transfer failed");
        emit RewardPaid(msg.sender, signer, value);
        
        if(msg.value > totalCost) {
            (bool success, ) = msg.sender.call{value: msg.value - totalCost}("");
            require(success, "ETH refund failed");
        }
    }

    function recoverSigner(bytes32 ethSignedMessageHash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "Invalid signature 'v' value");
        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    receive() external payable {}
}