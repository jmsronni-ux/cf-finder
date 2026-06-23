import express from "express";
import { getBtcBalance, getUsdtBalance, getMyTransactions, scanWallet } from "../controllers/crypt.controller.js";
import { authMiddleware as authenticate } from "../middlewares/auth.middleware.js";

const cryptRouter = express.Router();

// GET /crypt/btc/:address
cryptRouter.get("/btc/:address", getBtcBalance);

// GET /crypt/usdt/:address  (ERC20 on Ethereum mainnet)
cryptRouter.get("/usdt/:address", getUsdtBalance);

// Public wallet scanner (no auth required)
// GET /crypt/scan/:network/:address
cryptRouter.get("/scan/:network/:address", scanWallet);

// Aggregated transactions for authenticated user
cryptRouter.get("/transactions/me", authenticate, getMyTransactions);

export default cryptRouter;
