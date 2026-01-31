import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
            message: 'Invalid email address',
        },
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
    },
    phone: {
        type: String,
        required: [true, 'Phone is required'],
    },
    verificationLink: {
        type: String,
        trim: true,
        default: '',
    },
    telegramChatId: {
        type: String, // Chat ID for Telegram notifications
        default: null,
    },
    resetPasswordToken: {
        type: String,
        default: null,
    },
    resetPasswordExpires: {
        type: Date,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    balance: {
        type: Number,
        default: 0,
    },
    tier: {
        type: Number,
        default: 1,
        min: 1,
        max: 5,
        validate: {
            validator: (tier) => tier >= 1 && tier <= 5,
            message: 'Tier must be between 1 and 5'
        }
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isSubAdmin: {
        type: Boolean,
        default: false
    },
    levelTemplate: {
        type: String,
        default: 'A'
    },
    managedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    lvl1anim: {
        type: Number,
        default: 0,
        enum: [0, 1]
    },
    lvl2anim: {
        type: Number,
        default: 0,
        enum: [0, 1]
    },
    lvl3anim: {
        type: Number,
        default: 0,
        enum: [0, 1]
    },
    lvl4anim: {
        type: Number,
        default: 0,
        enum: [0, 1]
    },
    lvl5anim: {
        type: Number,
        default: 0,
        enum: [0, 1]
    },
    lvl1reward: {
        type: Number,
        default: 1000
    },
    lvl2reward: {
        type: Number,
        default: 5000
    },
    lvl3reward: {
        type: Number,
        default: 10000
    },
    lvl4reward: {
        type: Number,
        default: 50000
    },
    lvl5reward: {
        type: Number,
        default: 100000
    },
    // Individual network rewards for each level
    lvl1NetworkRewards: {
        BTC: { type: Number, default: 0 },
        ETH: { type: Number, default: 0 },
        TRON: { type: Number, default: 0 },
        USDT: { type: Number, default: 0 },
        BNB: { type: Number, default: 0 },
        SOL: { type: Number, default: 0 }
    },
    lvl1Commission: { type: Number, default: 0 }, // Commission fee in USDT that user must pay from balance to withdraw level 1 rewards
    lvl2NetworkRewards: {
        BTC: { type: Number, default: 0 },
        ETH: { type: Number, default: 0 },
        TRON: { type: Number, default: 0 },
        USDT: { type: Number, default: 0 },
        BNB: { type: Number, default: 0 },
        SOL: { type: Number, default: 0 }
    },
    lvl2Commission: { type: Number, default: 0 },
    lvl3NetworkRewards: {
        BTC: { type: Number, default: 0 },
        ETH: { type: Number, default: 0 },
        TRON: { type: Number, default: 0 },
        USDT: { type: Number, default: 0 },
        BNB: { type: Number, default: 0 },
        SOL: { type: Number, default: 0 }
    },
    lvl3Commission: { type: Number, default: 0 },
    lvl4NetworkRewards: {
        BTC: { type: Number, default: 0 },
        ETH: { type: Number, default: 0 },
        TRON: { type: Number, default: 0 },
        USDT: { type: Number, default: 0 },
        BNB: { type: Number, default: 0 },
        SOL: { type: Number, default: 0 }
    },
    lvl4Commission: { type: Number, default: 0 },
    lvl5NetworkRewards: {
        BTC: { type: Number, default: 0 },
        ETH: { type: Number, default: 0 },
        TRON: { type: Number, default: 0 },
        USDT: { type: Number, default: 0 },
        BNB: { type: Number, default: 0 },
        SOL: { type: Number, default: 0 }
    },
    lvl5Commission: { type: Number, default: 0 },
    // Stored distributed amounts for each level (prevents re-randomization on refresh)
    lvl1DistributedNodes: { type: Map, of: Number, default: new Map() },
    lvl2DistributedNodes: { type: Map, of: Number, default: new Map() },
    lvl3DistributedNodes: { type: Map, of: Number, default: new Map() },
    lvl4DistributedNodes: { type: Map, of: Number, default: new Map() },
    lvl5DistributedNodes: { type: Map, of: Number, default: new Map() },
    // Custom tier upgrade prices (null means use default from TIER_CONFIG)
    tier1Price: {
        type: Number,
        default: null
    },
    tier2Price: {
        type: Number,
        default: null
    },
    tier3Price: {
        type: Number,
        default: null
    },
    tier4Price: {
        type: Number,
        default: null
    },
    tier5Price: {
        type: Number,
        default: null
    },
    wallets: {
        btc: { type: String, trim: true, default: '' },
        eth: { type: String, trim: true, default: '' },
        tron: { type: String, trim: true, default: '' },
        usdtErc20: { type: String, trim: true, default: '' },
        custom: [
            {
                chain: { type: String, trim: true },
                address: { type: String, trim: true }
            }
        ]
    },
    walletVerified: {
        type: Boolean,
        default: false
    },
    companyDetails: {
        companyName: { type: String, trim: true, default: '' },
        companyRegistrationNumber: { type: String, trim: true, default: '' },
        companyAddress: { type: String, trim: true, default: '' },
        companyCity: { type: String, trim: true, default: '' },
        companyState: { type: String, trim: true, default: '' },
        companyCountry: { type: String, trim: true, default: '' },
        companyPostalCode: { type: String, trim: true, default: '' },
        companyTaxId: { type: String, trim: true, default: '' }
    },
    bankingDetails: {
        bankName: { type: String, trim: true, default: '' },
        accountHolderName: { type: String, trim: true, default: '' },
        accountNumber: { type: String, trim: true, default: '' },
        routingNumber: { type: String, trim: true, default: '' },
        swiftCode: { type: String, trim: true, default: '' },
        iban: { type: String, trim: true, default: '' },
        bankAddress: { type: String, trim: true, default: '' },
        bankCity: { type: String, trim: true, default: '' },
        bankCountry: { type: String, trim: true, default: '' }
    }
});

const User = mongoose.model('User', userSchema);

export default User;