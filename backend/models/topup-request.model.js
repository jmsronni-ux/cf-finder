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
        min: [1, 'Amount must be at least 1']
    },
    cryptocurrency: {
        type: String,
        enum: ['BTC', 'USDT', 'ETH'],
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

const TopupRequest = mongoose.model('TopupRequest', topupRequestSchema);

export default TopupRequest;



