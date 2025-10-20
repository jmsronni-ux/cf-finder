import GlobalSettings from "../models/global-settings.model.js";
import { ApiError } from "../middlewares/error.middleware.js";

// Get global settings (public - no auth required)
export const getGlobalSettings = async (req, res, next) => {
    try {
        let settings = await GlobalSettings.findById('global_settings');
        
        // If no settings exist, create default
        if (!settings) {
            settings = await GlobalSettings.create({
                _id: 'global_settings',
                topupWalletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8',
                topupQrCodeUrl: ''
            });
        }
        
        res.status(200).json({ 
            success: true, 
            message: "Global settings fetched successfully", 
            data: settings 
        });
    } catch (error) {
        console.error('Error fetching global settings:', error);
        next(error);
    }
};

// Update global settings (Admin only)
export const updateGlobalSettings = async (req, res, next) => {
    try {
        // Check if user is admin
        if (!req.user || !req.user.isAdmin) {
            throw new ApiError(403, "Access denied. Admin privileges required.");
        }

        const { topupWalletAddress, topupQrCodeUrl } = req.body;
        
        let settings = await GlobalSettings.findById('global_settings');
        
        if (!settings) {
            // Create if doesn't exist
            settings = await GlobalSettings.create({
                _id: 'global_settings',
                topupWalletAddress: topupWalletAddress || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8',
                topupQrCodeUrl: topupQrCodeUrl || ''
            });
        } else {
            // Update existing
            if (topupWalletAddress !== undefined) {
                settings.topupWalletAddress = topupWalletAddress;
            }
            if (topupQrCodeUrl !== undefined) {
                settings.topupQrCodeUrl = topupQrCodeUrl;
            }
            settings.updatedAt = Date.now();
            await settings.save();
        }
        
        res.status(200).json({ 
            success: true, 
            message: "Global settings updated successfully", 
            data: settings 
        });
    } catch (error) {
        console.error('Error updating global settings:', error);
        next(error);
    }
};

