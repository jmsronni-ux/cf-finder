import mongoose from 'mongoose';

const scheduledActionSchema = new mongoose.Schema({
    requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'KeyGenerationRequest',
        required: true
    },
    actionType: {
        type: String,
        enum: ['approve', 'reject'],
        required: true
    },
    nodeStatusOutcome: {
        type: String,
        enum: ['success', 'fail'],
        default: 'success'
    },
    approvedAmount: {
        type: Number,
        default: null
    },
    adminComment: {
        type: String,
        default: ''
    },
    scheduledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    executeAt: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'executed', 'cancelled', 'failed'],
        default: 'pending'
    },
    executedAt: {
        type: Date,
        default: null
    },
    error: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Index for efficient due-action queries
scheduledActionSchema.index({ status: 1, executeAt: 1 });

// Ensure only one pending scheduled action per request
scheduledActionSchema.index(
    { requestId: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: 'pending' } }
);

const ScheduledAction = mongoose.model('ScheduledAction', scheduledActionSchema);

export default ScheduledAction;
