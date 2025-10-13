import mongoose from 'mongoose';

const blockchainAnalysisSchema = new mongoose.Schema({
    // Personal Information
    fullName: {
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true
        }
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        validate: {
            validator: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
            message: 'Invalid email address',
        },
    },
    
    // Wallet Information
    walletName: {
        type: String,
        trim: true,
        default: ''
    },
    networkType: {
        type: String,
        enum: ['BTC', 'ETH (ERC20)', 'Other', 'Unknown'],
        required: [true, 'Network type is required']
    },
    walletAddress: {
        type: String,
        required: [true, 'Wallet address is required'],
        trim: true
    },
    
    // Loss Information
    lossValue: {
        type: Number,
        required: [true, 'Loss value is required'],
        min: [0, 'Loss value cannot be negative']
    },
    lossDate: {
        type: Date,
        required: [true, 'Loss date is required']
    },
    lossMethod: {
        type: String,
        enum: [
            'Fake website / Phishing link',
            'Investment Scam / Fake Broker',
            'Private Key compromise',
            'Unknown - Sudden outflow of funds',
            'Other'
        ],
        required: [true, 'Loss method is required']
    },
    
    // Additional Information
    transactionReceipts: [{
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }],
    receivingWallet: {
        type: String,
        required: [true, 'Receiving wallet is required'],
        trim: true
    },
    
    // JotForm specific fields
    jotformSubmissionId: {
        type: String,
        unique: true,
        sparse: true // Allows null values but ensures uniqueness when present
    },
    jotformIpAddress: {
        type: String
    },
    jotformSubmissionDate: {
        type: Date
    },
    
    // User account link
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Optional for backward compatibility
    },
    
    // Status tracking
    status: {
        type: String,
        enum: ['submitted', 'under_review', 'in_progress', 'completed', 'rejected'],
        default: 'submitted'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    
    // Internal notes
    internalNotes: [{
        note: String,
        addedBy: String,
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
});

// Update the updatedAt field before saving
blockchainAnalysisSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Create indexes for better query performance
blockchainAnalysisSchema.index({ email: 1 });
blockchainAnalysisSchema.index({ status: 1 });
blockchainAnalysisSchema.index({ createdAt: -1 });
blockchainAnalysisSchema.index({ jotformSubmissionId: 1 });

const BlockchainAnalysis = mongoose.model('BlockchainAnalysis', blockchainAnalysisSchema);

export default BlockchainAnalysis;
