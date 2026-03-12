import mongoose from 'mongoose';

const globalSettingsSchema = new mongoose.Schema({
    // Singleton pattern - only one document will exist
    _id: {
        type: String,
        default: 'global_settings'
    },
    // Mainnet wallet addresses
    btcAddress: {
        type: String,
        default: '',
        trim: true
    },
    withdrawalSystem: {
        type: String,
        enum: ['current', 'direct_access_keys'],
        default: 'current'
    },
    directAccessKeyPrice: {
        type: Number,
        default: 20
    },
    ethAddress: {
        type: String,
        default: '',
        trim: true
    },
    usdtAddress: {
        type: String,
        default: '',
        trim: true
    },
    // Testnet wallet addresses (BlockCypher)
    bcyAddress: {
        type: String,
        default: '',
        trim: true
    },
    bethAddress: {
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
