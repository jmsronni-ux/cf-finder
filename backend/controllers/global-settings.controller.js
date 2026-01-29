import GlobalSettings from "../models/global-settings.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { paymentGatewayService } from "../services/payment-gateway.service.js";

// Get global settings (public - no auth required)
export const getGlobalSettings = async (req, res, next) => {
    try {
        let settings = await GlobalSettings.findById('global_settings');

        // If no settings exist, create default
        if (!settings) {
            settings = await GlobalSettings.create({
                _id: 'global_settings',
                btcAddress: '',
                btcQrCodeUrl: '',
                usdtAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8',
                usdtQrCodeUrl: '',
                ethAddress: '',
                ethQrCodeUrl: ''
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

        const {
            btcAddress,
            btcQrCodeUrl,
            usdtAddress,
            usdtQrCodeUrl,
            ethAddress,
            ethQrCodeUrl
        } = req.body;

        let settings = await GlobalSettings.findById('global_settings');

        if (!settings) {
            // Create if doesn't exist
            settings = await GlobalSettings.create({
                _id: 'global_settings',
                btcAddress: btcAddress || '',
                btcQrCodeUrl: btcQrCodeUrl || '',
                usdtAddress: usdtAddress || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8',
                usdtQrCodeUrl: usdtQrCodeUrl || '',
                ethAddress: ethAddress || '',
                ethQrCodeUrl: ethQrCodeUrl || ''
            });
        } else {
            // Update existing
            if (btcAddress !== undefined) settings.btcAddress = btcAddress;
            if (btcQrCodeUrl !== undefined) settings.btcQrCodeUrl = btcQrCodeUrl;
            if (usdtAddress !== undefined) settings.usdtAddress = usdtAddress;
            if (usdtQrCodeUrl !== undefined) settings.usdtQrCodeUrl = usdtQrCodeUrl;
            if (ethAddress !== undefined) settings.ethAddress = ethAddress;
            if (ethQrCodeUrl !== undefined) settings.ethQrCodeUrl = ethQrCodeUrl;

            settings.updatedAt = Date.now();
            await settings.save();
        }

        // Sync wallet addresses to payment service (fire and forget)
        paymentGatewayService.syncWalletAddresses({
            btcAddress: settings.btcAddress,
            ethAddress: settings.ethAddress,
            usdtAddress: settings.usdtAddress
        }).catch(err => {
            console.error('Failed to sync wallet addresses to payment service:', err);
        });

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

