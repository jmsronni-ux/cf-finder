import BlockchainAnalysis from '../models/blockchain-analysis.model.js';
import User from '../models/user.model.js';
import NetworkReward from '../models/network-reward.model.js';
import ConversionRate from '../models/conversion-rate.model.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { sendLoginCredentials } from '../utils/email.service.js';

// Generate a secure random password
const generateRandomPassword = (length = 12) => {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
};

// Submit a new blockchain analysis request and create user account
export const submitAnalysisRequest = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();

        const {
            // JotForm data structure
            submissionID,
            ip,
            created_at,
            // Form fields
            q1_fullName, // First Name
            q2_fullName, // Last Name
            q3_email, // Email
            q4_walletName, // Wallet Name
            q5_networkType, // Network Type
            q6_walletAddress, // Wallet Address
            q7_lossValue, // Loss Value
            q8_lossDate, // Loss Date
            q9_lossMethod, // Loss Method
            q10_receivingWallet, // Receiving Wallet
            // File uploads (if any)
            q11_transactionReceipts
        } = req.body;

        // Validate required fields
        if (!q1_fullName || !q2_fullName || !q3_email || !q6_walletAddress || !q7_lossValue || !q8_lossDate || !q9_lossMethod || !q10_receivingWallet) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                required: ['firstName', 'lastName', 'email', 'walletAddress', 'lossValue', 'lossDate', 'lossMethod', 'receivingWallet']
            });
        }

        // Check if submission already exists (prevent duplicates)
        if (submissionID) {
            const existingSubmission = await BlockchainAnalysis.findOne({ jotformSubmissionId: submissionID });
            if (existingSubmission) {
                return res.status(409).json({
                    success: false,
                    message: 'Submission already exists',
                    submissionId: submissionID
                });
            }
        }

        const fullName = `${q1_fullName} ${q2_fullName}`;
        const email = q3_email.toLowerCase().trim();

        // Check if user already exists
        let existingUser = await User.findOne({ email });
        let userCreated = false;
        let userAccount = null;

        if (!existingUser) {
            // Get global rewards for all levels
            const globalRewards = await NetworkReward.find({ isActive: true });
            
            // Get conversion rates
            const conversionRates = await ConversionRate.find({});
            const conversionRatesMap = {};
            conversionRates.forEach(rate => {
                conversionRatesMap[rate.network] = rate.rateToUSD;
            });
            
            // Generate random password for new user
            const generatedPassword = generateRandomPassword();
            // const salt = await bcrypt.genSalt(10);
            // const hashedPassword = await bcrypt.hash(generatedPassword, salt);

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

            // Create new user account with global rewards populated
            const newUserData = {
                name: fullName,
                email: email,
                password: generatedPassword,
                phone: '', // Phone not provided in form
                balance: 0, // Default balance
                tier: 1, // Default tier
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
            userCreated = true;
            userAccount = newUser[0];

            // Send welcome email with login credentials
            try {
                await sendLoginCredentials(email, fullName, generatedPassword);
                console.log(`Welcome email sent to ${email}`);
            } catch (emailError) {
                console.error(`Failed to send welcome email to ${email}:`, emailError.message);
                // Don't fail the entire process if email fails
            }
        } else {
            userAccount = existingUser;
            console.log(`User ${email} already exists, using existing account`);
        }

        // Create new blockchain analysis record
        const analysisRequest = new BlockchainAnalysis({
            fullName: {
                firstName: q1_fullName,
                lastName: q2_fullName
            },
            email: email,
            walletName: q4_walletName || '',
            networkType: q5_networkType || 'Unknown',
            walletAddress: q6_walletAddress,
            lossValue: parseFloat(q7_lossValue),
            lossDate: new Date(q8_lossDate),
            lossMethod: q9_lossMethod,
            receivingWallet: q10_receivingWallet,
            jotformSubmissionId: submissionID,
            jotformIpAddress: ip,
            jotformSubmissionDate: created_at ? new Date(created_at) : new Date(),
            status: 'submitted',
            // Link to user account
            userId: userAccount._id
        });

        // Handle file uploads if present
        if (q11_transactionReceipts && Array.isArray(q11_transactionReceipts)) {
            analysisRequest.transactionReceipts = q11_transactionReceipts.map(file => ({
                filename: file.name || file.filename,
                originalName: file.originalName || file.name,
                mimetype: file.type || file.mimetype,
                size: file.size || 0
            }));
        }

        await analysisRequest.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: 'Blockchain analysis request submitted successfully',
            data: {
                id: analysisRequest._id,
                submissionId: analysisRequest.jotformSubmissionId,
                status: analysisRequest.status,
                createdAt: analysisRequest.createdAt,
                userAccount: {
                    created: userCreated,
                    userId: userAccount._id,
                    email: userAccount.email,
                    name: userAccount.name
                }
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        
        console.error('Error submitting blockchain analysis request:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: validationErrors
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Duplicate submission detected'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

// Get all blockchain analysis requests (admin only)
export const getAllAnalysisRequests = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, priority } = req.query;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};
        if (status) filter.status = status;
        if (priority) filter.priority = priority;

        const requests = await BlockchainAnalysis.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-internalNotes'); // Exclude internal notes from public view

        const total = await BlockchainAnalysis.countDocuments(filter);

        res.json({
            success: true,
            data: {
                requests,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching analysis requests:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get a specific analysis request by ID
export const getAnalysisRequestById = async (req, res) => {
    try {
        const { id } = req.params;

        const request = await BlockchainAnalysis.findById(id);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Analysis request not found'
            });
        }

        res.json({
            success: true,
            data: request
        });

    } catch (error) {
        console.error('Error fetching analysis request:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Update analysis request status
export const updateAnalysisRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, priority, internalNote } = req.body;

        const request = await BlockchainAnalysis.findById(id);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Analysis request not found'
            });
        }

        // Update status if provided
        if (status) {
            request.status = status;
        }

        // Update priority if provided
        if (priority) {
            request.priority = priority;
        }

        // Add internal note if provided
        if (internalNote) {
            request.internalNotes.push({
                note: internalNote,
                addedBy: req.user?.name || 'System',
                addedAt: new Date()
            });
        }

        await request.save();

        res.json({
            success: true,
            message: 'Analysis request updated successfully',
            data: request
        });

    } catch (error) {
        console.error('Error updating analysis request:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Delete analysis request
export const deleteAnalysisRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const request = await BlockchainAnalysis.findByIdAndDelete(id);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Analysis request not found'
            });
        }

        res.json({
            success: true,
            message: 'Analysis request deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting analysis request:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get statistics for dashboard
export const getAnalysisStatistics = async (req, res) => {
    try {
        const stats = await BlockchainAnalysis.aggregate([
            {
                $group: {
                    _id: null,
                    totalSubmissions: { $sum: 1 },
                    totalLossValue: { $sum: '$lossValue' },
                    avgLossValue: { $avg: '$lossValue' },
                    statusCounts: {
                        $push: '$status'
                    }
                }
            }
        ]);

        const statusCounts = await BlockchainAnalysis.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const priorityCounts = await BlockchainAnalysis.aggregate([
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                totalSubmissions: stats[0]?.totalSubmissions || 0,
                totalLossValue: stats[0]?.totalLossValue || 0,
                avgLossValue: stats[0]?.avgLossValue || 0,
                statusBreakdown: statusCounts,
                priorityBreakdown: priorityCounts
            }
        });

    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
