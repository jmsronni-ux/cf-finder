import User from "../models/user.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import mongoose from "mongoose";

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