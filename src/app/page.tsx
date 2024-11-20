"use client";
import React, { useState, useEffect } from 'react';

declare global {
  interface Window {
    ethereum: any;
  }
}
import { ethers } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet } from 'lucide-react';
import ContractABI from '../constant/abi.json';
const P2P_SWAP_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT!;
const P2P_SWAP_ABI = [
  "function createOrder(address _tokenToSell, address _tokenToBuy, uint256 _amountToSell, uint256 _amountToBuy) external returns (uint256)",
  "function executeOrder(uint256 _orderId) external",
  "function cancelOrder(uint256 _orderId) external",
  "function getOrder(uint256 _orderId) external view returns (tuple(address maker, address tokenToSell, address tokenToBuy, uint256 amountToSell, uint256 amountToBuy, bool isActive))"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) view returns (uint256)"
];

const P2PSwapApp = () => {
  console.log(ContractABI);
  console.log(P2P_SWAP_ADDRESS);
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [sellToken, setSellToken] = useState('');
  const [buyToken, setBuyToken] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [orderId, setOrderId] = useState('');
  const [orderDetails, setOrderDetails] = useState(null);

 

  const connectWallet = async () => {
    try {
     
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.AlchemyProvider('sepolia', window.ethereum);
        setProvider(provider);
        setAccount(accounts[0]);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const createOrder = async () => {
    try {
      const signer = provider.getSigner();
      const swapContract = new ethers.Contract(P2P_SWAP_ADDRESS, P2P_SWAP_ABI, signer);
      const tokenContract = new ethers.Contract(sellToken, ERC20_ABI, signer);

      // Approve token transfer
      const approveTx = await tokenContract.approve(P2P_SWAP_ADDRESS, sellAmount);
      await approveTx.wait();

      // Create order
      const tx = await swapContract.createOrder(
        sellToken,
        buyToken,
        ethers.utils.parseEther(sellAmount),
        ethers.utils.parseEther(buyAmount)
      );
      await tx.wait();
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const executeOrder = async () => {
    try {
      const signer = provider.getSigner();
      const swapContract = new ethers.Contract(P2P_SWAP_ADDRESS, P2P_SWAP_ABI, signer);
      const order = await swapContract.getOrder(orderId);
      
      // Approve buy token
      const buyTokenContract = new ethers.Contract(order.tokenToBuy, ERC20_ABI, signer);
      const approveTx = await buyTokenContract.approve(P2P_SWAP_ADDRESS, order.amountToBuy);
      await approveTx.wait();

      // Execute order
      const tx = await swapContract.executeOrder(orderId);
      await tx.wait();
    } catch (error) {
      console.error('Error executing order:', error);
    }
  };

  const fetchOrderDetails = async () => {
    if (!orderId || !provider) return;
    try {
      const swapContract = new ethers.Contract(P2P_SWAP_ADDRESS, P2P_SWAP_ABI, provider);
      const order = await swapContract.getOrder(orderId);
      setOrderDetails(order);
    } catch (error) {
      console.error('Error fetching order:', error);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId, provider]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>P2P Token Swap</CardTitle>
              {!account ? (
                <Button onClick={connectWallet}>
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect Wallet
                </Button>
              ) : (
                <p className="text-sm font-mono">{account.slice(0, 6)}...{account.slice(-4)}</p>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {account ? (
              <Tabs defaultValue="create">
                <TabsList className="w-full">
                  <TabsTrigger value="create" className="flex-1">Create Order</TabsTrigger>
                  <TabsTrigger value="execute" className="flex-1">Execute Order</TabsTrigger>
                </TabsList>

                <TabsContent value="create" className="space-y-4">
                  <Input
                    placeholder="Token to Sell Address"
                    value={sellToken}
                    onChange={(e) => setSellToken(e.target.value)}
                  />
                  <Input
                    placeholder="Amount to Sell"
                    type="number"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                  />
                  <Input
                    placeholder="Token to Buy Address"
                    value={buyToken}
                    onChange={(e) => setBuyToken(e.target.value)}
                  />
                  <Input
                    placeholder="Amount to Buy"
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                  />
                  <Button onClick={createOrder} className="w-full">Create Order</Button>
                </TabsContent>

                <TabsContent value="execute" className="space-y-4">
                  <Input
                    placeholder="Order ID"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                  />
                  {orderDetails && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Order Details</p>
                      <div className="space-y-2 mt-2">
                        <p>Selling: {ethers.utils.formatEther(orderDetails.amountToSell)} Tokens</p>
                        <p>For: {ethers.utils.formatEther(orderDetails.amountToBuy)} Tokens</p>
                        <p>Maker: {orderDetails.maker}</p>
                        <p>Status: {orderDetails.isActive ? 'Active' : 'Inactive'}</p>
                      </div>
                    </div>
                  )}
                  <Button onClick={executeOrder} className="w-full">Execute Order</Button>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Please connect your wallet to continue</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default P2PSwapApp;