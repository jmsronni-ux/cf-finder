import { ApiError } from "../middlewares/error.middleware.js";
import { ETHERSCAN_API_KEY } from "../config/env.js";
import User from "../models/user.model.js";
import { fetchCompleteWalletData } from "../utils/blockchain-verification.util.js";
import { validateWalletAddress } from "../utils/wallet-validation.js";

// Uses BlockCypher public API for BTC balances
// Docs: https://www.blockcypher.com/dev/bitcoin/#address-balance-endpoint
export const getBtcBalance = async (req, res, next) => {
  try {
    const { address } = req.params;
    if (!address) throw new ApiError(400, "Address is required");

    const url = `https://api.blockcypher.com/v1/btc/main/addrs/${encodeURIComponent(address)}/balance`;
    const response = await fetch(url);
    if (!response.ok) throw new ApiError(response.status, `BTC balance fetch failed`);
    const data = await response.json();

    const satoshis = Number(data.balance ?? 0);
    const btc = satoshis / 1e8;

    return res.json({ success: true, data: { address, satoshis, btc } });
  } catch (err) {
    next(err);
  }
};

// USDT (ERC20) using Etherscan API
// Docs: https://docs.etherscan.io/api-endpoints/accounts#get-erc20-token-account-balance-for-tokencontractaddress
export const getUsdtBalance = async (req, res, next) => {
  try {
    const { address } = req.params;
    if (!address) throw new ApiError(400, "Address is required");

    if (!ETHERSCAN_API_KEY) throw new ApiError(500, "ETHERSCAN_API_KEY not configured");

    const usdtContract = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
    const baseUrl = "https://api.etherscan.io/api";
    const qs = new URLSearchParams({
      module: "account",
      action: "tokenbalance",
      contractaddress: usdtContract,
      address,
      tag: "latest",
      apikey: ETHERSCAN_API_KEY,
    });
    const url = `${baseUrl}?${qs.toString()}`;

    const response = await fetch(url);
    if (!response.ok) throw new ApiError(response.status, `USDT balance fetch failed`);
    const data = await response.json();

    if (data.status === "0") {
      throw new ApiError(400, data.result || "Etherscan error");
    }

    const raw = BigInt(data.result || "0"); // USDT has 6 decimals
    const usdt = Number(raw) / 1e6;

    return res.json({ success: true, data: { address, raw: raw.toString(), usdt } });
  } catch (err) {
    next(err);
  }
};

// Aggregate transactions for saved wallets
export const getMyTransactions = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('wallets');
    if (!user) throw new ApiError(404, 'User not found');

    const wallets = user.wallets || {};
    const results = [];

    // BTC: use BlockCypher transactions endpoint (light sample mapping)
    if (wallets.btc) {
      try {
        const url = `https://api.blockcypher.com/v1/btc/main/addrs/${encodeURIComponent(wallets.btc)}`;
        const r = await fetch(url);
        if (r.ok) {
          const j = await r.json();
          const txs = (j?.txrefs || []).slice(0, 50).map((t) => ({
            id: t.tx_hash,
            date: new Date((t.confirmed ? Date.parse(t.confirmed) : Date.now())).toISOString(),
            transaction: t.tx_hash,
            amount: (Number(t.value || 0) / 1e8) * (t.tx_input_n === -1 ? 1 : -1),
            currency: 'BTC',
            status: 'Fail'
          }));
          results.push(...txs);
        }
      } catch {}
    }

    // USDT ERC20 on ETH: Etherscan account txs for token transfers (simplified)
    if (wallets.usdtErc20 && ETHERSCAN_API_KEY) {
      try {
        const baseUrl = 'https://api.etherscan.io/api';
        const params = new URLSearchParams({
          module: 'account',
          action: 'tokentx',
          contractaddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          address: wallets.usdtErc20,
          page: '1',
          offset: '50',
          sort: 'desc',
          apikey: ETHERSCAN_API_KEY
        });
        const url = `${baseUrl}?${params.toString()}`;
        const r = await fetch(url);
        if (r.ok) {
          const j = await r.json();
          const list = Array.isArray(j?.result) ? j.result : [];
          for (const t of list) {
            const raw = BigInt(t.value || '0');
            results.push({
              id: t.hash,
              date: new Date(Number(t.timeStamp || 0) * 1000).toISOString(),
              transaction: t.hash,
              amount: Number(raw) / 1e6 * (t.to?.toLowerCase() === wallets.usdtErc20.toLowerCase() ? 1 : -1),
              currency: 'USDT',
              status: 'Fail'
            });
          }
        }
      } catch {}
    }

    // TRON: TronScan API (public)
    if (wallets.tron) {
      try {
        const url = `https://apilist.tronscanapi.com/api/transaction?address=${encodeURIComponent(wallets.tron)}&limit=50&sort=-timestamp`;
        const r = await fetch(url);
        if (r.ok) {
          const j = await r.json();
          const list = Array.isArray(j?.data) ? j.data : [];
          for (const t of list) {
            results.push({
              id: t.hash,
              date: new Date(Number(t.timestamp || 0)).toISOString(),
              transaction: t.hash,
              amount: 0, // Amount decoding can be contract-specific; leaving 0 as placeholder
              currency: 'TRX',
              status: 'Fail'
            });
          }
        }
      } catch {}
    }

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};

// ─── Public wallet scanner ──────────────────────────────────────────────────
// GET /crypt/scan/:network/:address
// Fetches real blockchain data and computes threat index + forensic findings
export const scanWallet = async (req, res, next) => {
  try {
    const { network, address } = req.params;
    if (!network || !address) throw new ApiError(400, "Network and address are required");

    // Normalise network key (frontend may send 'eth', 'btc', etc.)
    const networkKey = network.toLowerCase();

    // Validate the wallet address using existing utility
    const validation = validateWalletAddress(address.trim(), networkKey);
    if (!validation.isValid) {
      throw new ApiError(400, validation.error || "Invalid wallet address");
    }

    // Fetch real blockchain data using existing utility
    const walletData = await fetchCompleteWalletData(address.trim(), networkKey);

    const balance = Number(walletData.balance) || 0;
    const transactionCount = Number(walletData.transactionCount) || 0;
    const transactions = walletData.transactions || [];

    // ── Threat index computation from real data ──────────────────────────

    // Network-specific thresholds for "large" transactions
    const largeThresholds = {
      btc: 1,        // 1 BTC
      eth: 10,       // 10 ETH
      tron: 50000,   // 50k TRX
      usdterc20: 10000, // 10k USDT
      sol: 100,      // 100 SOL
      bnb: 50,       // 50 BNB
    };

    const dustThresholds = {
      btc: 0.00001,
      eth: 0.0001,
      tron: 1,
      usdterc20: 0.01,
      sol: 0.001,
      bnb: 0.0001,
    };

    const largeThreshold = largeThresholds[networkKey] || 1;
    const dustThreshold = dustThresholds[networkKey] || 0.0001;

    // Score components
    const balanceScore = Math.min(Math.sqrt(balance) * 5, 35);
    const txVolumeScore = Math.min(Math.sqrt(transactionCount) * 2, 25);

    const largeTxs = transactions.filter(tx => Math.abs(Number(tx.amount)) >= largeThreshold);
    const largeTransactionScore = Math.min(largeTxs.length * 5, 25);

    const dustTxs = transactions.filter(tx => {
      const amt = Math.abs(Number(tx.amount));
      return amt > 0 && amt < dustThreshold;
    });
    const dustScore = Math.min(dustTxs.length * 3, 15);

    const threatIndex = Math.round(Math.min(balanceScore + txVolumeScore + largeTransactionScore + dustScore, 100));

    // ── Severity label ───────────────────────────────────────────────────
    let severity, severityLabel;
    if (threatIndex <= 25) { severity = 'clear'; severityLabel = 'LEGITIMATE'; }
    else if (threatIndex <= 50) { severity = 'low'; severityLabel = 'LOW RISK'; }
    else if (threatIndex <= 75) { severity = 'moderate'; severityLabel = 'MODERATE RISK'; }
    else { severity = 'critical'; severityLabel = 'CRITICAL THREAT'; }

    // ── Flagged transactions ─────────────────────────────────────────────
    const flaggedTransactions = transactions.map(tx => {
      const amt = Math.abs(Number(tx.amount));
      let status = 'ok';
      let reason = null;
      if (amt >= largeThreshold) {
        status = 'FLAGGED';
        reason = 'High-value transaction';
      } else if (amt > 0 && amt < dustThreshold) {
        status = 'FLAGGED';
        reason = 'Dust / possible poisoning';
      }
      return {
        hash: tx.hash || '',
        date: tx.date || new Date().toISOString(),
        amount: Number(tx.amount) || 0,
        type: tx.type || 'unknown',
        explorerUrl: tx.explorerUrl || '',
        status,
        reason,
      };
    });

    // ── Forensic findings ────────────────────────────────────────────────
    const findings = [];

    if (dustTxs.length > 0) {
      findings.push({
        severity: 'LOW',
        title: `${dustTxs.length} possible dust / spam transfer${dustTxs.length > 1 ? 's' : ''}`,
        description: `Received ${dustTxs.length} negligible-value transfer${dustTxs.length > 1 ? 's' : ''}. Likely a dust-attack / address-poisoning attempt — never interact with these tokens.`,
      });
    }

    if (largeTxs.length >= 3) {
      findings.push({
        severity: 'HIGH',
        title: `${largeTxs.length} large transactions detected`,
        description: `Found ${largeTxs.length} transactions above the ${largeThreshold} ${networkKey.toUpperCase()} threshold. Large-value activity increases risk exposure.`,
      });
    }

    if (threatIndex >= 75) {
      findings.push({
        severity: 'CRIT',
        title: 'High-risk activity profile',
        description: 'This address shows a pattern of high-value transactions combined with significant balance. Exercise extreme caution.',
      });
    }

    if (balance === 0 && transactionCount === 0) {
      findings.push({
        severity: 'INFO',
        title: 'Empty or inactive wallet',
        description: 'This address has no balance and no transaction history on-chain.',
      });
    } else if (threatIndex <= 25) {
      findings.push({
        severity: 'INFO',
        title: 'Normal activity profile',
        description: 'This address shows a normal activity profile with no links to known bad actors.',
      });
    }

    // ── Determine last active date ───────────────────────────────────────
    let lastActive = null;
    if (transactions.length > 0) {
      const dates = transactions.map(tx => new Date(tx.date).getTime()).filter(d => !isNaN(d));
      if (dates.length > 0) {
        lastActive = new Date(Math.max(...dates)).toISOString();
      }
    }

    // Network display names
    const networkNames = {
      btc: 'Bitcoin',
      eth: 'Ethereum',
      tron: 'Tron',
      usdterc20: 'USDT (ERC-20)',
      sol: 'Solana',
      bnb: 'BNB (BSC)',
    };

    const networkCurrencies = {
      btc: 'BTC',
      eth: 'ETH',
      tron: 'TRX',
      usdterc20: 'USDT',
      sol: 'SOL',
      bnb: 'BNB',
    };

    return res.json({
      success: true,
      data: {
        address: address.trim(),
        network: networkKey,
        networkName: networkNames[networkKey] || networkKey.toUpperCase(),
        currency: networkCurrencies[networkKey] || networkKey.toUpperCase(),
        scanTimestamp: new Date().toISOString(),
        balance,
        transactionCount,
        lastActive,
        threatIndex,
        severity,
        severityLabel,
        dustCount: dustTxs.length,
        flaggedCount: largeTxs.length,
        transactions: flaggedTransactions,
        findings,
        error: walletData.error || null,
      },
    });
  } catch (err) {
    next(err);
  }
};
