import express from "express";
import { authMiddleware as authenticate } from "../middlewares/auth.middleware.js";
import User from "../models/user.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { sendEmail } from "../utils/email.service.js";
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
        
        // Send email notification to admin
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
        
        if (adminEmail) {
            try {
                await sendEmail({
                    to: adminEmail,
                    subject: `New Withdrawal Request - ${user.name}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
                            <h2 style="color: #333;">New Withdrawal Request</h2>
                            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                <p style="margin: 10px 0;"><strong>User Name:</strong> ${user.name}</p>
                                <p style="margin: 10px 0;"><strong>User Email:</strong> ${user.email}</p>
                                <p style="margin: 10px 0;"><strong>Wallet Address:</strong> ${wallet}</p>
                                <p style="margin: 10px 0;"><strong>Amount:</strong> $${amount}</p>
                                <p style="margin: 10px 0;"><strong>Remaining Balance:</strong> $${user.balance}</p>
                                <p style="margin: 10px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                            </div>
                            <p style="color: #666; font-size: 14px;">Please process this withdrawal request as soon as possible.</p>
                        </div>
                    `
                });
                console.log('Withdrawal notification email sent successfully');
            } catch (emailError) {
                console.error('Failed to send withdrawal email:', emailError);
                // Don't fail the withdrawal if email fails
            }
        }
        
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
