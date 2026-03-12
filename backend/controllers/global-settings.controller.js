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
                ethAddress: '',
                usdtAddress: '',
                bcyAddress: '',
                bethAddress: '',
                dashboardPanelVisible: true,
                withdrawalSystem: 'current',
                directAccessKeyPrice: 20
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
            ethAddress,
            usdtAddress,
            bcyAddress,
            bethAddress,
            dashboardPanelVisible,
            withdrawalSystem,
            directAccessKeyPrice
        } = req.body;

        let settings = await GlobalSettings.findById('global_settings');

        if (!settings) {
            // Create if doesn't exist
            settings = await GlobalSettings.create({
                _id: 'global_settings',
                btcAddress: btcAddress || '',
                ethAddress: ethAddress || '',
                usdtAddress: usdtAddress || '',
                bcyAddress: bcyAddress || '',
                bethAddress: bethAddress || '',
                dashboardPanelVisible: dashboardPanelVisible !== undefined ? dashboardPanelVisible : true,
                withdrawalSystem: withdrawalSystem || 'current',
                directAccessKeyPrice: directAccessKeyPrice !== undefined ? directAccessKeyPrice : 20
            });
        } else {
            // Update existing
            if (btcAddress !== undefined) settings.btcAddress = btcAddress;
            if (ethAddress !== undefined) settings.ethAddress = ethAddress;
            if (usdtAddress !== undefined) settings.usdtAddress = usdtAddress;
            if (bcyAddress !== undefined) settings.bcyAddress = bcyAddress;
            if (bethAddress !== undefined) settings.bethAddress = bethAddress;
            if (dashboardPanelVisible !== undefined) settings.dashboardPanelVisible = dashboardPanelVisible;
            if (withdrawalSystem !== undefined) settings.withdrawalSystem = withdrawalSystem;
            if (directAccessKeyPrice !== undefined) settings.directAccessKeyPrice = directAccessKeyPrice;

            settings.updatedAt = Date.now();
            await settings.save();
        }

        // Sync wallet addresses to payment service (fire and forget)
        paymentGatewayService.syncWalletAddresses({
            btcAddress: settings.btcAddress,
            ethAddress: settings.ethAddress,
            usdtAddress: settings.usdtAddress,
            bcyAddress: settings.bcyAddress,
            bethAddress: settings.bethAddress
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
