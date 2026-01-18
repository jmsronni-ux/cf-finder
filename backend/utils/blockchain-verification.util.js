/**
 * Blockchain verification utilities for wallet verification system
 * Fetches complete wallet data including balance and transactions
 */

import fetch from 'node-fetch';
import { ETHERSCAN_API_KEY } from '../config/env.js';

/**
 * Fetch Bitcoin transactions using multiple APIs as fallback
 */
export const getBitcoinTransactions = async (address) => {
    try {
        if (!address || !address.trim()) return { transactions: [], error: null };
        
        // Try BlockCypher API first
        try {
            const url = `https://api.blockcypher.com/v1/btc/main/addrs/${encodeURIComponent(address)}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                const txrefs = data.txrefs || [];
                
                // Get latest 10 transactions
                const transactions = txrefs.slice(0, 10).map(tx => ({
                    hash: tx.tx_hash,
                    date: new Date(tx.confirmed || Date.now()),
                    amount: (Number(tx.value || 0) / 1e8) * (tx.tx_input_n === -1 ? 1 : -1),
                    type: tx.tx_input_n === -1 ? 'in' : 'out',
                    explorerUrl: `https://blockchain.com/btc/tx/${tx.tx_hash}`
                }));
                
                // BlockCypher returns balance in satoshis, convert to BTC
                const balanceInSatoshis = data.balance || data.total_received || 0;
                const balance = balanceInSatoshis / 1e8;
                console.log(`BlockCypher BTC balance: ${balance} BTC (${balanceInSatoshis} satoshis)`);
                
                return { 
                    transactions, 
                    balance: balance,
                    transactionCount: txrefs.length,
                    error: null 
                };
            }
        } catch (blockcypherError) {
            console.log('BlockCypher API failed, trying Blockchain.info API...');
        }
        
        // Fallback to Blockchain.info API
        try {
            const url = `https://blockchain.info/rawaddr/${encodeURIComponent(address)}?limit=10`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                const txs = data.txs || [];
                
                const transactions = txs.map(tx => {
                    // Calculate amount for this address
                    let amount = 0;
                    const outputs = tx.out || [];
                    const inputs = tx.inputs || [];
                    
                    // Check outputs (received)
                    outputs.forEach(output => {
                        if (output.addr === address) {
                            amount += output.value / 1e8;
                        }
                    });
                    
                    // Check inputs (sent)
                    inputs.forEach(input => {
                        if (input.prev_out && input.prev_out.addr === address) {
                            amount -= input.prev_out.value / 1e8;
                        }
                    });
                    
                    return {
                        hash: tx.hash,
                        date: new Date(tx.time * 1000),
                        amount: amount,
                        type: amount > 0 ? 'in' : 'out',
                        explorerUrl: `https://blockchain.com/btc/tx/${tx.hash}`
                    };
                });
                
                return { 
                    transactions, 
                    balance: (data.final_balance || 0) / 1e8,
                    transactionCount: data.n_tx || 0,
                    error: null 
                };
            }
        } catch (blockchainError) {
            console.log('Blockchain.info API failed, trying Blockstream API...');
        }
        
        // Final fallback to Blockstream API
        try {
            const url = `https://blockstream.info/api/address/${encodeURIComponent(address)}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                
                // Get transaction history
                const txUrl = `https://blockstream.info/api/address/${encodeURIComponent(address)}/txs`;
                const txResponse = await fetch(txUrl);
                
                if (txResponse.ok) {
                    const txs = await txResponse.json();
                    const transactions = txs.slice(0, 10).map(tx => ({
                        hash: tx.txid,
                        date: new Date(tx.status.block_time * 1000),
                        amount: 0, // Blockstream doesn't provide amount in this endpoint
                        type: 'unknown',
                        explorerUrl: `https://blockstream.info/tx/${tx.txid}`
                    }));
                    
                    return { 
                        transactions, 
                        balance: (data.chain_stats?.funded_txo_sum || 0) / 1e8 - (data.chain_stats?.spent_txo_sum || 0) / 1e8,
                        transactionCount: data.chain_stats?.tx_count || 0,
                        error: null 
                    };
                }
            }
        } catch (blockstreamError) {
            console.error('All Bitcoin APIs failed:', blockstreamError.message);
        }
        
        return { transactions: [], balance: 0, transactionCount: 0, error: 'All Bitcoin APIs failed' };
        
    } catch (error) {
        console.error('Error fetching Bitcoin transactions:', error.message);
        return { transactions: [], balance: 0, transactionCount: 0, error: error.message };
    }
};

/**
 * Fetch Ethereum transactions using Etherscan API
 */
export const getEthereumTransactions = async (address) => {
    try {
        if (!address || !address.trim()) return { transactions: [], error: null };
        
        if (!ETHERSCAN_API_KEY) {
            return { transactions: [], error: 'ETHERSCAN_API_KEY not configured' };
        }
        
        const baseUrl = 'https://api.etherscan.io/api';
        const params = new URLSearchParams({
            module: 'account',
            action: 'txlist',
            address: address,
            startblock: 0,
            endblock: 99999999,
            page: 1,
            offset: 10,
            sort: 'desc',
            apikey: ETHERSCAN_API_KEY
        });
        
        const url = `${baseUrl}?${params.toString()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            return { transactions: [], error: `Etherscan API error: ${response.status}` };
        }
        
        const data = await response.json();
        
        if (data.status === '0') {
            return { transactions: [], error: data.result || 'Etherscan error' };
        }
        
        const txList = Array.isArray(data.result) ? data.result : [];
        
        const transactions = txList.slice(0, 10).map(tx => ({
            hash: tx.hash,
            date: new Date(Number(tx.timeStamp) * 1000),
            amount: (Number(tx.value) / 1e18) * (tx.to?.toLowerCase() === address.toLowerCase() ? 1 : -1),
            type: tx.to?.toLowerCase() === address.toLowerCase() ? 'in' : 'out',
            explorerUrl: `https://etherscan.io/tx/${tx.hash}`
        }));
        
        return { 
            transactions, 
            balance: 0, // Will be fetched separately
            transactionCount: txList.length,
            error: null 
        };
    } catch (error) {
        console.error('Error fetching Ethereum transactions:', error.message);
        return { transactions: [], error: error.message };
    }
};

/**
 * Fetch TRON transactions using TronScan API
 */
export const getTronTransactions = async (address) => {
    try {
        if (!address || !address.trim()) return { transactions: [], error: null };
        
        const url = `https://apilist.tronscanapi.com/api/transaction?address=${encodeURIComponent(address)}&limit=10&sort=-timestamp`;
        const response = await fetch(url);
        
        if (!response.ok) {
            return { transactions: [], error: `TronScan API error: ${response.status}` };
        }
        
        const data = await response.json();
        const txList = Array.isArray(data.data) ? data.data : [];
        
        const transactions = txList.slice(0, 10).map(tx => ({
            hash: tx.hash,
            date: new Date(Number(tx.timestamp)),
            amount: 0, // TRON amount calculation can be complex, leaving as 0 for now
            type: 'unknown',
            explorerUrl: `https://tronscan.org/#/transaction/${tx.hash}`
        }));
        
        return { 
            transactions, 
            balance: 0, // Will be fetched separately
            transactionCount: txList.length,
            error: null 
        };
    } catch (error) {
        console.error('Error fetching TRON transactions:', error.message);
        return { transactions: [], error: error.message };
    }
};

/**
 * Fetch USDT ERC-20 transactions using Etherscan API
 */
export const getUSDTTransactions = async (address) => {
    try {
        if (!address || !address.trim()) return { transactions: [], error: null };
        
        if (!ETHERSCAN_API_KEY) {
            return { transactions: [], error: 'ETHERSCAN_API_KEY not configured' };
        }
        
        const usdtContract = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
        const baseUrl = 'https://api.etherscan.io/api';
        const params = new URLSearchParams({
            module: 'account',
            action: 'tokentx',
            contractaddress: usdtContract,
            address: address,
            page: 1,
            offset: 10,
            sort: 'desc',
            apikey: ETHERSCAN_API_KEY
        });
        
        const url = `${baseUrl}?${params.toString()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            return { transactions: [], error: `Etherscan API error: ${response.status}` };
        }
        
        const data = await response.json();
        
        if (data.status === '0') {
            return { transactions: [], error: data.result || 'Etherscan error' };
        }
        
        const txList = Array.isArray(data.result) ? data.result : [];
        
        const transactions = txList.slice(0, 10).map(tx => {
            const raw = BigInt(tx.value || '0');
            const amount = Number(raw) / 1e6; // USDT has 6 decimals
            
            return {
                hash: tx.hash,
                date: new Date(Number(tx.timeStamp) * 1000),
                amount: amount * (tx.to?.toLowerCase() === address.toLowerCase() ? 1 : -1),
                type: tx.to?.toLowerCase() === address.toLowerCase() ? 'in' : 'out',
                explorerUrl: `https://etherscan.io/tx/${tx.hash}`
            };
        });
        
        return { 
            transactions, 
            balance: 0, // Will be fetched separately
            transactionCount: txList.length,
            error: null 
        };
    } catch (error) {
        console.error('Error fetching USDT transactions:', error.message);
        return { transactions: [], error: error.message };
    }
};

/**
 * Fetch complete wallet data (balance + transactions) for verification
 */
export const fetchCompleteWalletData = async (address, walletType) => {
    try {
        console.log(`Starting blockchain data fetch for ${walletType} address: ${address}`);
        
        if (!address || !address.trim()) {
            throw new Error('Invalid address provided');
        }
        
        let balance = 0;
        let transactionData = { transactions: [], error: null };
        
        // Fetch transactions based on wallet type
        switch (walletType.toLowerCase()) {
            case 'btc':
                try {
                    transactionData = await getBitcoinTransactions(address);
                    balance = transactionData.balance || 0;
                } catch (err) {
                    console.error('Error fetching Bitcoin data:', err.message);
                    transactionData = { transactions: [], error: err.message };
                }
                break;
            case 'eth':
                try {
                    transactionData = await getEthereumTransactions(address);
                } catch (err) {
                    console.error('Error fetching Ethereum transactions:', err.message);
                    transactionData = { transactions: [], error: err.message };
                }
                // Fetch ETH balance separately
                try {
                    // Ensure address has 0x prefix for Ethereum
                    const ethAddress = address.startsWith('0x') ? address : `0x${address}`;
                    const response = await fetch('https://cloudflare-eth.com', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_getBalance',
                            params: [ethAddress.toLowerCase(), 'latest'],
                            id: 1
                        })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.result && data.result !== '0x') {
                            balance = parseInt(data.result, 16) / 1e18;
                            console.log(`ETH balance fetched: ${balance} ETH for address ${ethAddress}`);
                        } else {
                            console.log(`ETH balance result is empty or 0x for address ${ethAddress}`);
                        }
                    } else {
                        const errorText = await response.text();
                        console.error(`ETH balance fetch failed: ${response.status} ${response.statusText} - ${errorText}`);
                    }
                } catch (err) {
                    console.error('Error fetching ETH balance:', err.message);
                }
                break;
            case 'tron':
                try {
                    transactionData = await getTronTransactions(address);
                } catch (err) {
                    console.error('Error fetching TRON transactions:', err.message);
                    transactionData = { transactions: [], error: err.message };
                }
                // Fetch TRON balance separately
                try {
                    const response = await fetch(`https://api.trongrid.io/v1/accounts/${address}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.data && data.data[0]) {
                            balance = (data.data[0].balance || 0) / 1000000;
                            console.log(`TRON balance fetched: ${balance} TRX`);
                        } else {
                            console.log('TRON balance data is empty');
                        }
                    } else {
                        console.error(`TRON balance fetch failed: ${response.status} ${response.statusText}`);
                    }
                } catch (err) {
                    console.error('Error fetching TRON balance:', err.message);
                }
                break;
            case 'usdterc20':
                try {
                    transactionData = await getUSDTTransactions(address);
                } catch (err) {
                    console.error('Error fetching USDT transactions:', err.message);
                    transactionData = { transactions: [], error: err.message };
                }
                // Fetch USDT balance separately
                try {
                    const usdtContract = '0xdac17f958d2ee523a2206206994597c13d831ec7';
                    // Ensure address has 0x prefix and is lowercase
                    const ethAddress = address.startsWith('0x') ? address.toLowerCase() : `0x${address.toLowerCase()}`;
                    // Properly encode the address for balanceOf(address) call
                    const addressParam = ethAddress.substring(2).padStart(64, '0');
                    const balanceOfABI = '0x70a08231' + addressParam;
                    
                    const response = await fetch('https://cloudflare-eth.com', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_call',
                            params: [{
                                to: usdtContract,
                                data: balanceOfABI
                            }, 'latest'],
                            id: 1
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.result && data.result !== '0x') {
                            balance = parseInt(data.result, 16) / 1e6;
                            console.log(`USDT balance fetched: ${balance} USDT for address ${ethAddress}`);
                        } else {
                            console.log(`USDT balance result is empty or 0x for address ${ethAddress}`);
                        }
                    } else {
                        const errorText = await response.text();
                        console.error(`USDT balance fetch failed: ${response.status} ${response.statusText} - ${errorText}`);
                    }
                } catch (err) {
                    console.error('Error fetching USDT balance:', err.message);
                }
                break;
            default:
                return {
                    balance: 0,
                    transactionCount: 0,
                    transactions: [],
                    error: `Unsupported wallet type: ${walletType}`
                };
        }
        
        console.log(`Final balance for ${walletType} address ${address}: ${balance}`);
        console.log(`Transaction count: ${transactionData.transactionCount || 0}`);
        console.log(`Transactions fetched: ${(transactionData.transactions || []).length}`);
        
        return {
            balance,
            transactionCount: transactionData.transactionCount || 0,
            transactions: transactionData.transactions || [],
            error: transactionData.error
        };
    } catch (error) {
        console.error('Error fetching complete wallet data:', error.message);
        return {
            balance: 0,
            transactionCount: 0,
            transactions: [],
            error: error.message
        };
    }
};
