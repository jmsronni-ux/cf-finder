import mongoose from 'mongoose';

const keyGenerationRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    nodeId: {
        type: String,
        required: true
    },
    nodeAmount: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        required: true
    },
    keysCount: {
        type: Number,
        required: true,
        min: 1
    },
    directAccessKeyPrice: {
        type: Number,
        required: true,
        min: 0
    },
    totalCost: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    nodeStatus: {
        type: String,
        enum: ['pending', 'success', 'fail'],
        default: 'pending'
    },
    approvedAmount: {
        type: Number,
        default: null
    },
    adminComment: {
        type: String,
        default: ''
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    processedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

const KeyGenerationRequest = mongoose.model('KeyGenerationRequest', keyGenerationRequestSchema);

export default KeyGenerationRequest;
