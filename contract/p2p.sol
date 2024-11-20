// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract P2PSwap is ReentrancyGuard, Ownable {
    struct Order {
        address maker;
        address tokenToSell;
        address tokenToBuy;
        uint256 amountToSell;
        uint256 amountToBuy;
        bool isActive;
    }

    mapping(uint256 => Order) public orders;
    uint256 public orderCount;
    uint256 public fee = 1; // 0.1% fee
    
    event OrderCreated(
        uint256 indexed orderId,
        address indexed maker,
        address tokenToSell,
        address tokenToBuy,
        uint256 amountToSell,
        uint256 amountToBuy
    );
    
    event OrderCancelled(uint256 indexed orderId);
    event OrderExecuted(uint256 indexed orderId, address indexed taker);
    event FeeUpdated(uint256 newFee);

    constructor() Ownable(msg.sender) {}

    function createOrder(
        address _tokenToSell,
        address _tokenToBuy,
        uint256 _amountToSell,
        uint256 _amountToBuy
    ) external returns (uint256) {
        require(_amountToSell > 0 && _amountToBuy > 0, "Invalid amounts");
        require(_tokenToSell != _tokenToBuy, "Cannot swap same token");
        
        IERC20(_tokenToSell).transferFrom(msg.sender, address(this), _amountToSell);
        
        orderCount++;
        orders[orderCount] = Order({
            maker: msg.sender,
            tokenToSell: _tokenToSell,
            tokenToBuy: _tokenToBuy,
            amountToSell: _amountToSell,
            amountToBuy: _amountToBuy,
            isActive: true
        });
        
        emit OrderCreated(
            orderCount,
            msg.sender,
            _tokenToSell,
            _tokenToBuy,
            _amountToSell,
            _amountToBuy
        );
        
        return orderCount;
    }

  function executeOrder(uint256 _orderId) external nonReentrant {
    Order storage order = orders[_orderId];
    require(order.isActive, "Order not active");
    require(msg.sender != order.maker, "Cannot take own order");

    uint256 feeAmount = (order.amountToBuy * fee) / 1000;

    IERC20(order.tokenToBuy).transferFrom(msg.sender, owner(), feeAmount);
    IERC20(order.tokenToBuy).transferFrom(msg.sender, order.maker, order.amountToBuy);
    IERC20(order.tokenToSell).transfer(msg.sender, order.amountToSell);

    order.isActive = false;
    emit OrderExecuted(_orderId, msg.sender);
}

    function cancelOrder(uint256 _orderId) external {
        Order storage order = orders[_orderId];
        require(order.isActive, "Order not active");
        require(msg.sender == order.maker, "Not order maker");
        
        order.isActive = false;
        IERC20(order.tokenToSell).transfer(order.maker, order.amountToSell);
        
        emit OrderCancelled(_orderId);
    }

    function updateFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 30, "Fee too high"); // Max 3%
        fee = _newFee;
        emit FeeUpdated(_newFee);
    }

    function getOrder(uint256 _orderId) external view returns (Order memory) {
        return orders[_orderId];
    }
}