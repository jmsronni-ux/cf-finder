import mongoose from 'mongoose';

const globalSettingsSchema = new mongoose.Schema({
    // Singleton pattern - only one document will exist
    _id: {
        type: String,
        default: 'global_settings'
    },
    // Default template for new users
    defaultLevelTemplate: {
        type: String,
        default: 'A'
    },
    // Mainnet wallet addresses
    btcAddress: {
        type: String,
        default: '',
        trim: true
    },
    dashboardPanelVisible: {
        type: Boolean,
        default: true
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
    keyPriceMode: {
        type: String,
        enum: ['static', 'percent'],
        default: 'static'
    },
    directAccessKeyPricePercent: {
        type: Number,
        default: 5
    },
    // Per-level key pricing overrides (level number → { mode, staticPrice, percentPrice })
    // If a level is not in this map, the flat fields above are used as default
    levelKeyPricing: {
        type: Map,
        of: new mongoose.Schema({
            mode: { type: String, enum: ['static', 'percent'], default: 'static' },
            staticPrice: { type: Number, default: 20 },
            percentPrice: { type: Number, default: 5 }
        }, { _id: false }),
        default: {}
    },
    // Transfer fee settings (onchain → available)
    transferFeeMode: {
        type: String,
        enum: ['percent', 'fixed'],
        default: 'fixed'
    },
    transferFeeValue: {
        type: Number,
        default: 0
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
