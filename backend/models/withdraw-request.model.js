import mongoose from 'mongoose';

const withdrawRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: function() {
            // Amount is required for direct balance withdrawal, not for addToBalance
            return !this.addToBalance;
        },
        min: [1, 'Amount must be at least 1']
    },
    walletAddress: {
        type: String,
        required: function() {
            // Wallet address is required for direct balance withdrawal, not for addToBalance
            return !this.addToBalance;
        },
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    // Admin-confirmed wallet and amount
    confirmedWallet: {
        type: String,
        trim: true
    },
    confirmedAmount: {
        type: Number
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
    // Network-specific withdrawal details
    networks: {
        type: [String],
        enum: ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'],
        default: []
    },
    networkRewards: {
        type: Map,
        of: Number,
        default: {}
    },
    withdrawAll: {
        type: Boolean,
        default: false
    },
    commissionPaid: {
        type: Number,
        default: 0
    },
    isDirectBalanceWithdraw: {
        type: Boolean,
        default: false
    },
    addToBalance: {
        type: Boolean,
        default: false
    },
    networkRewardsAddedToBalance: {
        type: Number,
        default: 0
    }
});

const WithdrawRequest = mongoose.model('WithdrawRequest', withdrawRequestSchema);

export default WithdrawRequest;
