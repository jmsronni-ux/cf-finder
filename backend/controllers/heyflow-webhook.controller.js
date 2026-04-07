import User from "../models/user.model.js";
import NetworkReward from "../models/network-reward.model.js";
import ConversionRate from "../models/conversion-rate.model.js";
import GlobalSettings from "../models/global-settings.model.js";
import mongoose from "mongoose";
import crypto from "crypto";
import { sendHeyflowWelcomeEmail } from "../services/email.service.js";
import { ApiError } from "../middlewares/error.middleware.js";

// Generate a secure random password
const generateRandomPassword = (length = 12) => {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        password += charset.charAt(randomBytes[i] % charset.length);
    }
    return password;
};

/**
 * Heyflow Webhook Handler
 * 
 * Receives form submission data from Heyflow, extracts user info,
 * creates a new user with a random password, and sends login credentials via email.
 *
 * Expected payload:
 * {
 *   "flowID": "...",
 *   "id": "...",
 *   "createdAt": "...",
 *   "fields": {
 *     "Full Name": "...",
 *     "Email address": "...",
 *     "Phone Number": "...",
 *     "Country ": "...",
 *     ...
 *   }
 * }
 */
export const handleHeyflowWebhook = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const payload = req.body;

        // Debug: log the full incoming payload to see exact field names
        console.log("[Heyflow Webhook] Incoming payload:", JSON.stringify(payload, null, 2));

        // Validate basic Heyflow payload structure
        if (!payload || !payload.fields) {
            console.error("[Heyflow Webhook] Missing 'fields' in payload. Top-level keys:", Object.keys(payload || {}));
            throw new ApiError(400, "Invalid Heyflow webhook payload: missing 'fields'");
        }

        const fields = payload.fields;

        // Extract user data from Heyflow fields
        const name = fields["Full Name"];
        const email = fields["Email address"];
        const phone = fields["Phone Number"] || "";
        const country = fields["Country "] || fields["Country"] || "";

        // Validate required fields
        if (!name || !name.trim()) {
            throw new ApiError(400, "Missing required field: 'Full Name'");
        }
        if (!email || !email.trim()) {
            throw new ApiError(400, "Missing required field: 'Email address'");
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            throw new ApiError(400, `Invalid email address: '${email}'`);
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            // User already exists — return 200 to prevent Heyflow from retrying
            await session.abortTransaction();
            session.endSession();
            console.log(`[Heyflow Webhook] User already exists: ${normalizedEmail}`);
            return res.status(200).json({
                success: true,
                message: "User already exists, skipping creation",
                data: { email: normalizedEmail, alreadyExists: true }
            });
        }

        // Generate random password
        const generatedPassword = generateRandomPassword();

        // Get default level template from global settings
        const settings = await GlobalSettings.findById("global_settings");
        const defaultLevelTemplate = settings ? settings.defaultLevelTemplate : "A";

        // Get global rewards for all levels
        const globalRewards = await NetworkReward.find({ isActive: true });

        // Get conversion rates
        const conversionRates = await ConversionRate.find({});
        const conversionRatesMap = {};
        conversionRates.forEach(rate => {
            conversionRatesMap[rate.network] = rate.rateToUSD;
        });

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

            if (levelNetworkRewards.length > 0 && typeof levelNetworkRewards[0].commissionPercent === "number") {
                commissionPercent = levelNetworkRewards[0].commissionPercent;
            }

            levelRewards[`lvl${level}reward`] = Math.round(totalUSDValue * 100) / 100;
            levelCommissions[`lvl${level}Commission`] = commissionPercent;
        }

        // Build user data
        const newUserData = {
            name: name.trim(),
            email: normalizedEmail,
            password: generatedPassword,
            phone: phone.trim(),
            levelTemplate: defaultLevelTemplate,
            ...levelRewards,
            ...levelCommissions
        };

        // Populate network rewards for each level with global defaults
        const networks = ["BTC", "ETH", "TRON", "USDT", "BNB", "SOL"];
        for (let level = 1; level <= 5; level++) {
            const levelNetworkRewards = {};
            for (const network of networks) {
                const globalReward = globalRewards.find(r => r.level === level && r.network === network);
                levelNetworkRewards[network] = globalReward ? globalReward.rewardAmount : 0;
            }
            newUserData[`lvl${level}NetworkRewards`] = levelNetworkRewards;
        }

        // Create user in database
        const newUser = await User.create([newUserData], { session });

        // Send email with login credentials
        let emailSent = false;
        let emailError = null;

        try {
            await sendHeyflowWelcomeEmail(normalizedEmail, name.trim(), generatedPassword);
            emailSent = true;
        } catch (error) {
            console.error(`[Heyflow Webhook] Failed to send email to ${normalizedEmail}:`, error.message);
            emailError = error.message;
        }

        await session.commitTransaction();
        session.endSession();

        console.log(`[Heyflow Webhook] User created: ${normalizedEmail} (flowID: ${payload.flowID}, submissionID: ${payload.id})`);

        res.status(201).json({
            success: true,
            message: "User created successfully from Heyflow submission",
            data: {
                user: {
                    id: newUser[0]._id,
                    name: newUserData.name,
                    email: newUserData.email,
                    phone: newUserData.phone
                },
                emailSent,
                emailError,
                heyflow: {
                    flowID: payload.flowID,
                    submissionID: payload.id
                }
            }
        });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        console.error("[Heyflow Webhook] Error:", error.message);
        next(error);
    }
};
