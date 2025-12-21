import User from "../models/user.model.js";
import NetworkReward from "../models/network-reward.model.js";
import ConversionRate from "../models/conversion-rate.model.js";
import bcrypt from "bcryptjs";
import { ApiError } from "../middlewares/error.middleware.js";
import mongoose from "mongoose";
import { sendLoginCredentials } from "../services/email.service.js";
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
        
        // Get conversion rates (once for all users)
        const conversionRates = await ConversionRate.find({});
        const conversionRatesMap = {};
        conversionRates.forEach(rate => {
            conversionRatesMap[rate.network] = rate.rateToUSD;
        });
        
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
                
                // Calculate level rewards and commission percentages
                const levelRewards = {};
                const levelCommissions = {};
                for (let level = 1; level <= 5; level++) {
                    const levelNetworkRewards = globalRewards.filter(r => r.level === level && r.isActive);
                    let totalUSDValue = 0;
                    let commissionPercent = 0;
                    
                    for (const reward of levelNetworkRewards) {
                        const conversionRate = conversionRatesMap[reward.network] || 1;
                        const usdValue = reward.rewardAmount * conversionRate;
                        totalUSDValue += usdValue;
                    }
                    
                    // Use the first network's commission percent for this level
                    if (levelNetworkRewards.length > 0 && typeof levelNetworkRewards[0].commissionPercent === 'number') {
                        commissionPercent = levelNetworkRewards[0].commissionPercent;
                    }
                    
                    levelRewards[`lvl${level}reward`] = Math.round(totalUSDValue * 100) / 100;
                    levelCommissions[`lvl${level}Commission`] = commissionPercent;
                }
                
                // Create user object with global rewards populated
                const newUserData = {
                    name: userData.name,
                    email: userData.email.toLowerCase().trim(),
                    password: generatedPassword,
                    phone: userData.phone || '',
                    balance: userData.balance || 0,
                    tier: userData.tier || 1,
                    ...levelRewards, // Add calculated level rewards
                    ...levelCommissions // Add calculated level commissions
                };
                
                // Populate network rewards for each level with global defaults
                for (let level = 1; level <= 5; level++) {
                    const levelNetworkRewards = {};
                    const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
                    
                    for (const network of networks) {
                        const globalReward = globalRewards.find(r => r.level === level && r.network === network);
                        levelNetworkRewards[network] = globalReward ? globalReward.rewardAmount : 0;
                    }
                    
                    newUserData[`lvl${level}NetworkRewards`] = levelNetworkRewards;
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
        
        // Get conversion rates
        const conversionRates = await ConversionRate.find({});
        const conversionRatesMap = {};
        conversionRates.forEach(rate => {
            conversionRatesMap[rate.network] = rate.rateToUSD;
        });
        
        // Generate random password
        const generatedPassword = generateRandomPassword();
        
        // Calculate level rewards and commission percentages
        const levelRewards = {};
        const levelCommissions = {};
        for (let level = 1; level <= 5; level++) {
            const levelNetworkRewards = globalRewards.filter(r => r.level === level && r.isActive);
            let totalUSDValue = 0;
            let commissionPercent = 0;
            
            for (const reward of levelNetworkRewards) {
                const conversionRate = conversionRatesMap[reward.network] || 1;
                const usdValue = reward.rewardAmount * conversionRate;
                totalUSDValue += usdValue;
            }
            
            // Use the first network's commission percent for this level
            if (levelNetworkRewards.length > 0 && typeof levelNetworkRewards[0].commissionPercent === 'number') {
                commissionPercent = levelNetworkRewards[0].commissionPercent;
            }
            
            levelRewards[`lvl${level}reward`] = Math.round(totalUSDValue * 100) / 100;
            levelCommissions[`lvl${level}Commission`] = commissionPercent;
        }
        
        // Create user with global rewards populated
        const newUserData = {
            name,
            email: email.toLowerCase().trim(),
            password: generatedPassword,
            phone: phone || '',
            balance: balance || 0,
            tier: tier || 1,
            ...levelRewards,
            ...levelCommissions
        };
        
        // Populate network rewards for each level with global defaults
        for (let level = 1; level <= 5; level++) {
            const levelNetworkRewards = {};
            const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
            
            for (const network of networks) {
                const globalReward = globalRewards.find(r => r.level === level && r.network === network);
                levelNetworkRewards[network] = globalReward ? globalReward.rewardAmount : 0;
            }
            
            newUserData[`lvl${level}NetworkRewards`] = levelNetworkRewards;
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

