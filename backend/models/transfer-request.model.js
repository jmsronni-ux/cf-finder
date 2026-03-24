import mongoose from 'mongoose';

const transferRequestSchema = new mongoose.Schema({
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
                return value > 0;
            },
            message: 'Amount must be greater than 0'
        }
    },
    feeMode: {
        type: String,
        enum: ['percent', 'fixed'],
        default: 'fixed'
    },
    feeValue: {
        type: Number,
        default: 0
    },
    feeAmount: {
        type: Number,
        default: 0
    },
    netAmount: {
        type: Number,
        required: true
    },
    direction: {
        type: String,
        enum: ['dashboard_to_available'],
        default: 'dashboard_to_available'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminNote: {
        type: String
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    processedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const TransferRequest = mongoose.model('TransferRequest', transferRequestSchema);

export default TransferRequest;
