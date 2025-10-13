import mongoose from "mongoose";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/env.js";
import { ApiError } from "../middlewares/error.middleware.js";


export const signUp = async (req, res, next) => {
    const session = await mongoose.startSession();

    session.startTransaction();

    try {

        const { name, email, password, phone } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new ApiError(400, "User already exists");
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create([{ name, email, password: hashedPassword, phone }], { session });

        const token = jwt.sign({ userId: newUser[0]._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ success: true, message: "User created successfully", data: { token, user: newUser[0] } });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const signIn = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('-password');
        if (!user) {
            return next(new ApiError(404, "User not found"));
        }
        // Need to get password separately for comparison
        const userWithPassword = await User.findOne({ email });
        const isPasswordCorrect = await bcrypt.compare(password, userWithPassword.password);
        if (!isPasswordCorrect) {
            return next(new ApiError(401, "Invalid password"));
        }
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.status(200).json({ success: true, message: "User signed in successfully", data: { token, user } });
    } catch (error) {
        next(error);
    }
};

export const signOut = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
};
