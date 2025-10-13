/**
 * Utility to fetch wallet balances from blockchain APIs
 * Uses public blockchain explorers and APIs
 */

import fetch from 'node-fetch';

/**
 * Fetch Bitcoin balance using blockchain.info API
 */
export const getBitcoinBalance = async (address) => {
    try {
        if (!address || !address.trim()) return null;
        
        const response = await fetch(`https://blockchain.info/q/addressbalance/${address}`);
        if (!response.ok) return null;
        
        const satoshis = await response.text();
        // Convert satoshis to BTC
        const btc = parseFloat(satoshis) / 100000000;
        return btc;
    } catch (error) {
        console.error('Error fetching Bitcoin balance:', error.message);
        return null;
    }
};

/**
 * Fetch Ethereum balance using Etherscan API (or public node)
 */
export const getEthereumBalance = async (address) => {
    try {
        if (!address || !address.trim()) return null;
        
        // Using public Ethereum node (Cloudflare)
        const response = await fetch('https://cloudflare-eth.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [address, 'latest'],
                id: 1
            })
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        if (!data.result) return null;
        
        // Convert wei to ETH
        const weiBalance = parseInt(data.result, 16);
        const ethBalance = weiBalance / 1e18;
        return ethBalance;
    } catch (error) {
        console.error('Error fetching Ethereum balance:', error.message);
        return null;
    }
};

/**
 * Fetch Tron balance using TronGrid API
 */
export const getTronBalance = async (address) => {
    try {
        if (!address || !address.trim()) return null;
        
        const response = await fetch(`https://api.trongrid.io/v1/accounts/${address}`);
        if (!response.ok) return null;
        
        const data = await response.json();
        if (!data.data || !data.data[0]) return null;
        
        // Convert sun to TRX
        const sunBalance = data.data[0].balance || 0;
        const trxBalance = sunBalance / 1000000;
        return trxBalance;
    } catch (error) {
        console.error('Error fetching Tron balance:', error.message);
        return null;
    }
};

/**
 * Fetch USDT ERC-20 balance using Etherscan API (or public node)
 */
export const getUSDTBalance = async (address) => {
    try {
        if (!address || !address.trim()) return null;
        
        // USDT Contract address on Ethereum
        const usdtContractAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7';
        
        // ABI for balanceOf function
        const balanceOfABI = '0x70a08231000000000000000000000000' + address.substring(2).toLowerCase();
        
        const response = await fetch('https://cloudflare-eth.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{
                    to: usdtContractAddress,
                    data: balanceOfABI
                }, 'latest'],
                id: 1
            })
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        if (!data.result || data.result === '0x') return null;
        
        // USDT has 6 decimals
        const balance = parseInt(data.result, 16) / 1e6;
        return balance;
    } catch (error) {
        console.error('Error fetching USDT balance:', error.message);
        return null;
    }
};

/**
 * Fetch all wallet balances for a user
 */
export const getAllWalletBalances = async (wallets) => {
    if (!wallets) return {};
    
    const balances = {};
    
    try {
        // Fetch all balances in parallel with timeout protection
        const promises = [];
        
        if (wallets.btc) {
            promises.push(
                Promise.race([
                    getBitcoinBalance(wallets.btc).then(bal => ({ key: 'btc', balance: bal })),
                    new Promise(resolve => setTimeout(() => resolve({ key: 'btc', balance: null }), 5000))
                ])
            );
        }
        
        if (wallets.eth) {
            promises.push(
                Promise.race([
                    getEthereumBalance(wallets.eth).then(bal => ({ key: 'eth', balance: bal })),
                    new Promise(resolve => setTimeout(() => resolve({ key: 'eth', balance: null }), 5000))
                ])
            );
        }
        
        if (wallets.tron) {
            promises.push(
                Promise.race([
                    getTronBalance(wallets.tron).then(bal => ({ key: 'tron', balance: bal })),
                    new Promise(resolve => setTimeout(() => resolve({ key: 'tron', balance: null }), 5000))
                ])
            );
        }
        
        if (wallets.usdtErc20) {
            promises.push(
                Promise.race([
                    getUSDTBalance(wallets.usdtErc20).then(bal => ({ key: 'usdtErc20', balance: bal })),
                    new Promise(resolve => setTimeout(() => resolve({ key: 'usdtErc20', balance: null }), 5000))
                ])
            );
        }
        
        const results = await Promise.all(promises);
        
        // Build balances object
        results.forEach(result => {
            if (result && result.key) {
                balances[result.key] = result.balance !== null ? result.balance : 0;
            }
        });
        
    } catch (error) {
        console.error('Error fetching wallet balances:', error.message);
    }
    
    return balances;
};

/**
 * Format balance for display
 */
export const formatBalance = (balance, decimals = 6) => {
    if (balance === null || balance === undefined) return 'N/A';
    return balance.toFixed(decimals);
};

