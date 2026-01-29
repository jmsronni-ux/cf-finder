import mongoose from 'mongoose';

const topupRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        validate: {
            validator: function (value) {
                return value > 0; // Allow any positive amount, including decimals less than 1 (e.g., 0.01, 0.5)
            },
            message: 'Amount must be greater than 0'
        }
    },
    cryptoAmount: {
        type: Number,
        // Optional because older records won't have it, but new ones should
    },
    cryptocurrency: {
        type: String,
        enum: ['BTC', 'USDT', 'ETH', 'BCY', 'BETH'],
        default: 'BTC'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    processedAt: {
        type: Date
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: {
        type: String
    },
    approvedAmount: {
        type: Number,
        min: [0, 'Approved amount cannot be negative']
    },
    // Payment Gateway Integration Fields
    paymentSessionId: {
        type: String,
        index: true
    },
    paymentAddress: {
        type: String
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'detected', 'confirming', 'confirmed', 'completed', 'expired', 'failed'],
        default: 'pending'
    },
    txHash: {
        type: String
    },
    confirmations: {
        type: Number,
        default: 0
    },
    requiredConfirmations: {
        type: Number
    },
    paymentExpiresAt: {
        type: Date
    }
});

// Pre-save hook to normalize cryptocurrency value
topupRequestSchema.pre('save', function (next) {
    if (this.cryptocurrency) {
        this.cryptocurrency = this.cryptocurrency.toUpperCase().trim();
    }
    next();
});

const TopupRequest = mongoose.model('TopupRequest', topupRequestSchema);

export default TopupRequest;



