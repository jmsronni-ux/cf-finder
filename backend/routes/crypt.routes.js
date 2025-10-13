import express from "express";
import { getBtcBalance, getUsdtBalance, getMyTransactions } from "../controllers/crypt.controller.js";
import { authMiddleware as authenticate } from "../middlewares/auth.middleware.js";

const cryptRouter = express.Router();

// GET /crypt/btc/:address
cryptRouter.get("/btc/:address", getBtcBalance);

// GET /crypt/usdt/:address  (ERC20 on Ethereum mainnet)
cryptRouter.get("/usdt/:address", getUsdtBalance);

export default cryptRouter;

// Aggregated transactions for authenticated user
cryptRouter.get("/transactions/me", authenticate, getMyTransactions);

