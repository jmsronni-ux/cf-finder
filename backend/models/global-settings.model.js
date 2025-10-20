import mongoose from 'mongoose';

const globalSettingsSchema = new mongoose.Schema({
    // Singleton pattern - only one document will exist
    _id: {
        type: String,
        default: 'global_settings'
    },
    // Topup request settings
    topupWalletAddress: {
        type: String,
        default: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8',
        trim: true
    },
    topupQrCodeUrl: {
        type: String,
        default: '',
        trim: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const GlobalSettings = mongoose.model('GlobalSettings', globalSettingsSchema);

export default GlobalSettings;

