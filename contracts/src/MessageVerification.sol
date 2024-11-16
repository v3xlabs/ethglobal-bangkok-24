// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interfaces/IETHRegistrarController.sol";
import "./interfaces/IBaseRegistrar.sol";
import "./interfaces/IPriceOracle.sol";

contract MessageVerification {
    mapping(address => uint256) public messageCount;
    mapping(address => mapping(uint256 => string[])) private userMessages;
    mapping(address => mapping(uint256 => uint256)) private messageValues;

    IBaseRegistrar public constant baseregistrar = IBaseRegistrar(0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85);
    IETHRegistrarController public constant controller = IETHRegistrarController(0xFED6a969AaA60E4961FCD3EBF1A2e8913ac65B72);
    uint256 public constant RENEW_DURATION = 365 days;

    function getNamePrice(string calldata name) public view returns (uint256) {
        return controller.rentPrice(name, RENEW_DURATION).base;
    }

    function getNameExpiry(string calldata name) public view returns (uint256) {
        bytes32 labelhash = keccak256(abi.encodePacked(name));
        return baseregistrar.nameExpires(uint256(labelhash));
    }

    function verifyAndStoreMessage(string[] calldata names, uint256 value, bytes calldata signature) external payable {
        require(names.length > 0, "Empty names array");
        string memory prefix = "RENEW_NAME";
        bytes32 messageHash = keccak256(abi.encode(prefix, names, value));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        
        address signer = recoverSigner(ethSignedMessageHash, signature);
        require(signer == msg.sender, "Invalid signature");
        
        uint256 total = 0;
        for(uint i = 0; i < names.length; i++) {
            uint256 price = controller.rentPrice(names[i], RENEW_DURATION).base;
            total += price;
            controller.renew{value: price}(names[i], RENEW_DURATION);
        }
        require(msg.value >= total, "Insufficient ETH sent");
        
        uint256 currentCount = messageCount[msg.sender];
        string[] storage messageArray = userMessages[msg.sender][currentCount];
        for(uint i = 0; i < names.length; i++) {
            messageArray.push(names[i]);
        }
        messageValues[msg.sender][currentCount] = value;
        messageCount[msg.sender]++;
        
        if(msg.value > total) {
            payable(msg.sender).transfer(msg.value - total);
        }
    }

    function getUserMessageCount(address user) external view returns (uint256) {
        return messageCount[user];
    }

    function getUserMessage(address user, uint256 index) external view returns (string[] memory, uint256) {
        require(index < messageCount[user], "Message index out of bounds");
        string[] storage messages = userMessages[user][index];
        string[] memory result = new string[](messages.length);
        for(uint i = 0; i < messages.length; i++) {
            result[i] = messages[i];
        }
        return (result, messageValues[user][index]);
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

        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Invalid signature 'v' value");

        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    receive() external payable {}
}