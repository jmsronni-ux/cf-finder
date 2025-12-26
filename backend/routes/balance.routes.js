import express from "express";
import { authMiddleware as authenticate } from "../middlewares/auth.middleware.js";
import User from "../models/user.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import mongoose from "mongoose";

const balanceRouter = express.Router();

// Get user balance
balanceRouter.get("/", authenticate, async (req, res, next) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select('balance');
        
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        res.status(200).json({
            success: true,
            data: {
                balance: user.balance
            }
        });
    } catch (error) {
        next(error);
    }
});

// Create withdrawal request
balanceRouter.post("/withdraw", authenticate, async (req, res, next) => {
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        
        const userId = req.user._id;
        const { amount, wallet } = req.body;
        
        // Validate input
        if (!amount || amount <= 0) {
            throw new ApiError(400, "Invalid withdrawal amount");
        }
        
        if (!wallet) {
            throw new ApiError(400, "Wallet address is required");
        }
        
        const user = await User.findById(userId).session(session);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        
        // Check if user has sufficient balance
        if (user.balance < amount) {
            throw new ApiError(400, `Insufficient balance. Available: ${user.balance}, Requested: ${amount}`);
        }
        
        // Deduct balance
        user.balance -= amount;
        await user.save({ session });
        
        await session.commitTransaction();
        
        res.status(200).json({
            success: true,
            message: "Withdrawal request submitted successfully",
            data: {
                amount,
                wallet,
                remainingBalance: user.balance
            }
        });
        
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
});

export default balanceRouter;
