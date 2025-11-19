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
        
        // Validation
        if (!email || !password) {
            return next(new ApiError(400, "Email and password are required"));
        }

        // Check JWT_SECRET is available
        if (!JWT_SECRET) {
            console.error('JWT_SECRET is not defined!');
            return next(new ApiError(500, "Server configuration error"));
        }

        // Find user with password
        const user = await User.findOne({ email });
        if (!user) {
            return next(new ApiError(401, "Invalid credentials"));
        }

        // Compare password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return next(new ApiError(401, "Invalid credentials"));
        }

        // Generate token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN || '7d' });
        
        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(200).json({ success: true, message: "User signed in successfully", data: { token, user: userResponse } });
    } catch (error) {
        console.error('Sign-in error:', error);
        next(error);
    }
};

export const signOut = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
};

export const impersonateUser = async (req, res, next) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return next(new ApiError(400, "User ID is required for impersonation"));
        }

        if (!JWT_SECRET) {
            console.error('JWT_SECRET is not defined!');
            return next(new ApiError(500, "Server configuration error"));
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return next(new ApiError(404, "User not found"));
        }

        const token = jwt.sign(
            { userId: targetUser._id },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN || '7d' }
        );

        const userResponse = targetUser.toObject();
        delete userResponse.password;

        res.status(200).json({
            success: true,
            message: `Impersonation successful for ${targetUser.name}`,
            data: {
                token,
                user: userResponse
            }
        });
    } catch (error) {
        console.error('Impersonation error:', error);
        next(error);
    }
};
