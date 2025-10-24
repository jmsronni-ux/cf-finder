import mongoose from 'mongoose';

const walletVerificationRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    walletAddress: {
        type: String,
        required: [true, 'Wallet address is required'],
        trim: true
    },
    walletType: {
        type: String,
        required: [true, 'Wallet type is required'],
        enum: ['btc', 'eth', 'tron', 'usdtErc20'],
        lowercase: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    blockchainData: {
        balance: {
            type: Number,
            default: 0
        },
        transactionCount: {
            type: Number,
            default: 0
        },
        latestTransactions: {
            type: [mongoose.Schema.Types.Mixed],
            default: []
        },
        lastFetched: {
            type: Date,
            default: Date.now
        }
    },
    rejectionReason: {
        type: String,
        trim: true
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
walletVerificationRequestSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Index for efficient queries
walletVerificationRequestSchema.index({ userId: 1, status: 1 });
walletVerificationRequestSchema.index({ status: 1, createdAt: -1 });

const WalletVerificationRequest = mongoose.model('WalletVerificationRequest', walletVerificationRequestSchema);

export default WalletVerificationRequest;
