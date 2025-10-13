import { ApiError } from "../middlewares/error.middleware.js";
import { ETHERSCAN_API_KEY } from "../config/env.js";
import User from "../models/user.model.js";

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

