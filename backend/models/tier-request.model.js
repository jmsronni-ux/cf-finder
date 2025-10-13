import mongoose from 'mongoose';

const tierRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    requestedTier: {
        type: Number,
        required: [true, 'Requested tier is required'],
        min: 1,
        max: 5,
        validate: {
            validator: (tier) => tier >= 1 && tier <= 5,
            message: 'Tier must be between 1 and 5'
        }
    },
    currentTier: {
        type: Number,
        required: [true, 'Current tier is required'],
        min: 0,
        max: 5
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminNote: {
        type: String,
        default: ''
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reviewedAt: {
        type: Date,
        default: null
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

// Index for faster queries
tierRequestSchema.index({ userId: 1, status: 1 });
tierRequestSchema.index({ status: 1, createdAt: -1 });

const TierRequest = mongoose.model('TierRequest', tierRequestSchema);

export default TierRequest;

