import User from "../models/user.model.js";
import NetworkReward from "../models/network-reward.model.js";
import bcrypt from "bcryptjs";
import { ApiError } from "../middlewares/error.middleware.js";
import mongoose from "mongoose";
import { sendLoginCredentials } from "../utils/email.service.js";
import crypto from "crypto";

// Generate a secure random password
const generateRandomPassword = (length = 12) => {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
};

// Create users from JSON data and send login credentials via email
export const createUsersFromJson = async (req, res, next) => {
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        
        const { users } = req.body;
        
        // Validate input
        if (!users || !Array.isArray(users)) {
            throw new ApiError(400, "Invalid input: 'users' must be an array");
        }
        
        if (users.length === 0) {
            throw new ApiError(400, "No users provided");
        }
        
        // Get global rewards for all levels (once for all users)
        const globalRewards = await NetworkReward.find({ isActive: true });
        
        const createdUsers = [];
        const failedUsers = [];
        
        // Process each user
        for (let i = 0; i < users.length; i++) {
            const userData = users[i];
            
            try {
                // Validate required fields
                if (!userData.name || !userData.email) {
                    failedUsers.push({
                        index: i,
                        email: userData.email || 'unknown',
                        error: 'Name and email are required'
                    });
                    continue;
                }
                
                // Check if user already exists
                const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
                if (existingUser) {
                    failedUsers.push({
                        index: i,
                        email: userData.email,
                        error: 'User already exists'
                    });
                    continue;
                }
                
                // Generate random password
                const generatedPassword = generateRandomPassword();
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(generatedPassword, salt);
                
                // Create user object with global rewards populated
                const newUserData = {
                    name: userData.name,
                    email: userData.email.toLowerCase().trim(),
                    password: hashedPassword,
                    phone: userData.phone || '',
                    balance: userData.balance || 0,
                    tier: userData.tier || 1
                };
                
                // Populate network rewards for each level with global defaults
                for (let level = 1; level <= 5; level++) {
                    const levelRewards = {};
                    const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
                    
                    for (const network of networks) {
                        const globalReward = globalRewards.find(r => r.level === level && r.network === network);
                        levelRewards[network] = globalReward ? globalReward.rewardAmount : 0;
                    }
                    
                    newUserData[`lvl${level}NetworkRewards`] = levelRewards;
                }
                
                // Create user in database
                const newUser = await User.create([newUserData], { session });
                
                // Send email with login credentials
                try {
                    await sendLoginCredentials(
                        newUserData.email,
                        newUserData.name,
                        generatedPassword
                    );
                    
                    createdUsers.push({
                        id: newUser[0]._id,
                        name: newUserData.name,
                        email: newUserData.email,
                        phone: newUserData.phone,
                        balance: newUserData.balance,
                        tier: newUserData.tier,
                        emailSent: true
                    });
                } catch (emailError) {
                    // User created but email failed
                    createdUsers.push({
                        id: newUser[0]._id,
                        name: newUserData.name,
                        email: newUserData.email,
                        phone: newUserData.phone,
                        balance: newUserData.balance,
                        tier: newUserData.tier,
                        emailSent: false,
                        emailError: emailError.message
                    });
                }
                
            } catch (userError) {
                failedUsers.push({
                    index: i,
                    email: userData.email || 'unknown',
                    error: userError.message
                });
            }
        }
        
        await session.commitTransaction();
        session.endSession();
        
        // Prepare response
        const response = {
            success: true,
            message: `Processed ${users.length} users`,
            data: {
                totalProcessed: users.length,
                successfullyCreated: createdUsers.length,
                failed: failedUsers.length,
                createdUsers,
                failedUsers
            }
        };
        
        // Return appropriate status code
        if (createdUsers.length === users.length) {
            res.status(201).json(response);
        } else if (createdUsers.length > 0) {
            res.status(207).json(response); // Multi-status
        } else {
            res.status(400).json(response);
        }
        
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

// Create single user from JSON and send login credentials
export const createUserFromJson = async (req, res, next) => {
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        
        const { name, email, phone, balance, tier } = req.body;
        
        // Validate required fields
        if (!name || !email) {
            throw new ApiError(400, "Name and email are required");
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            throw new ApiError(400, "User already exists");
        }
        
        // Get global rewards for all levels
        const globalRewards = await NetworkReward.find({ isActive: true });
        
        // Generate random password
        const generatedPassword = generateRandomPassword();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(generatedPassword, salt);
        
        // Create user with global rewards populated
        const newUserData = {
            name,
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            phone: phone || '',
            balance: balance || 0,
            tier: tier || 1
        };
        
        // Populate network rewards for each level with global defaults
        for (let level = 1; level <= 5; level++) {
            const levelRewards = {};
            const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
            
            for (const network of networks) {
                const globalReward = globalRewards.find(r => r.level === level && r.network === network);
                levelRewards[network] = globalReward ? globalReward.rewardAmount : 0;
            }
            
            newUserData[`lvl${level}NetworkRewards`] = levelRewards;
        }
        
        const newUser = await User.create([newUserData], { session });
        
        // Send email with login credentials
        let emailSent = false;
        let emailError = null;
        
        try {
            await sendLoginCredentials(email, name, generatedPassword);
            emailSent = true;
        } catch (error) {
            emailError = error.message;
        }
        
        await session.commitTransaction();
        session.endSession();
        
        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: {
                user: {
                    id: newUser[0]._id,
                    name: newUserData.name,
                    email: newUserData.email,
                    phone: newUserData.phone,
                    balance: newUserData.balance,
                    tier: newUserData.tier
                },
                emailSent,
                emailError
            }
        });
        
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

