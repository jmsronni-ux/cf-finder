import User from "../models/user.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import mongoose from "mongoose";
import { createTransferRequest } from "./transfer-request.controller.js";

export const getBalance = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        res.status(200).json({ success: true, message: "Balance fetched successfully", data: user.balance });
    } catch (error) {
        next(error);
    }
};      

export const getBalanceById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        res.status(200).json({ success: true, message: "Balance fetched successfully", data: user.balance });
    } catch (error) {
        next(error);
    }
};      

export const createBalance = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        user.balance += req.body.amount;
        await user.save({ session });
        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ success: true, message: "Balance created successfully", data: user.balance });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

export const updateBalance = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        user.balance += req.body.amount;
        await user.save({ session });
        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ success: true, message: "Balance updated successfully", data: user.balance });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

export const deleteBalance = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        await user.deleteOne({ session });
        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ success: true, message: "Balance deleted successfully", data: user.balance });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

export const transferBalance = async (req, res, next) => {
    const { amount, direction } = req.body;

    if (!amount || amount <= 0) {
        return next(new ApiError(400, "Invalid transfer amount"));
    }

    if (!['dashboard_to_available', 'available_to_dashboard'].includes(direction)) {
        return next(new ApiError(400, "Invalid transfer direction"));
    }

    // Onchain → Available: goes through admin approval
    if (direction === 'dashboard_to_available') {
        return createTransferRequest(req, res, next);
    }

    // Available → Onchain: instant transfer (no admin approval needed)
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).session(session);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        if (user.availableBalance < amount) {
            throw new ApiError(400, `Insufficient available balance. Available: $${user.availableBalance}`);
        }
        user.availableBalance -= amount;
        user.balance += amount;

        await user.save({ session });
        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: "Transfer successful",
            data: {
                balance: user.balance,
                availableBalance: user.availableBalance
            }
        });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};