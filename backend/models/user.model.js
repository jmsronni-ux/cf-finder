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
    lvl2NetworkRewards: {
        BTC: { type: Number, default: 0 },
        ETH: { type: Number, default: 0 },
        TRON: { type: Number, default: 0 },
        USDT: { type: Number, default: 0 },
        BNB: { type: Number, default: 0 },
        SOL: { type: Number, default: 0 }
    },
    lvl3NetworkRewards: {
        BTC: { type: Number, default: 0 },
        ETH: { type: Number, default: 0 },
        TRON: { type: Number, default: 0 },
        USDT: { type: Number, default: 0 },
        BNB: { type: Number, default: 0 },
        SOL: { type: Number, default: 0 }
    },
    lvl4NetworkRewards: {
        BTC: { type: Number, default: 0 },
        ETH: { type: Number, default: 0 },
        TRON: { type: Number, default: 0 },
        USDT: { type: Number, default: 0 },
        BNB: { type: Number, default: 0 },
        SOL: { type: Number, default: 0 }
    },
    lvl5NetworkRewards: {
        BTC: { type: Number, default: 0 },
        ETH: { type: Number, default: 0 },
        TRON: { type: Number, default: 0 },
        USDT: { type: Number, default: 0 },
        BNB: { type: Number, default: 0 },
        SOL: { type: Number, default: 0 }
    },
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
    }
});

const User = mongoose.model('User', userSchema);

export default User;