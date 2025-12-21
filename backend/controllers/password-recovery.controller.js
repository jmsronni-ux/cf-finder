import crypto from 'crypto';
import User from '../models/user.model.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { sendPasswordResetEmailMailtrap } from '../services/email.service.js';
import { FRONTEND_URL } from '../config/env.js';
import bcrypt from 'bcryptjs';

// Request password reset - sends email with reset token
export const requestPasswordReset = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return next(new ApiError(400, 'Email is required'));
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            // Don't reveal if user exists or not for security
            return res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }

        // Generate secure random token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Hash the token before saving to database
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Set token and expiration (1 hour from now)
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

        await user.save();

        // Send email with the unhashed token
        await sendPasswordResetEmailMailtrap(
            user.email,
            user.name,
            resetToken,
            FRONTEND_URL
        );

        res.status(200).json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.'
        });
    } catch (error) {
        console.error('Password reset request error:', error);
        next(error);
    }
};

// Verify if reset token is valid
export const verifyResetToken = async (req, res, next) => {
    try {
        const { token } = req.params;

        if (!token) {
            return next(new ApiError(400, 'Reset token is required'));
        }

        // Hash the token to compare with database
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with valid token that hasn't expired
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Token is valid',
            data: {
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Token verification error:', error);
        next(error);
    }
};

// Reset password with token
export const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return next(new ApiError(400, 'Token and new password are required'));
        }

        if (newPassword.length < 8) {
            return next(new ApiError(400, 'Password must be at least 8 characters long'));
        }

        // Hash the token to compare with database
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with valid token that hasn't expired
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return next(new ApiError(400, 'Invalid or expired reset token'));
        }

        // Update password (stored as plaintext per requirements)
        user.password = newPassword;

        // Clear reset token fields
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password has been reset successfully. You can now login with your new password.'
        });
    } catch (error) {
        console.error('Password reset error:', error);
        next(error);
    }
};

// Change password for logged-in users
export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId; // From auth middleware

        if (!currentPassword || !newPassword) {
            return next(new ApiError(400, 'Current password and new password are required'));
        }

        if (newPassword.length < 8) {
            return next(new ApiError(400, 'New password must be at least 8 characters long'));
        }

        // Find user
        const user = await User.findById(userId);

        if (!user) {
            return next(new ApiError(404, 'User not found'));
        }

        // Verify current password (support both hashed and plaintext)
        let isPasswordCorrect = false;
        try {
            isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
        } catch (e) {
            isPasswordCorrect = false;
        }

        // Fallback: try direct comparison (for plaintext passwords)
        if (!isPasswordCorrect) {
            isPasswordCorrect = currentPassword === user.password;
        }

        if (!isPasswordCorrect) {
            return next(new ApiError(401, 'Current password is incorrect'));
        }

        // Update to new password
        user.password = newPassword;
        user.updatedAt = Date.now();

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password has been changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        next(error);
    }
};
