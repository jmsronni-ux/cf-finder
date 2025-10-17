import mongoose from 'mongoose';

const withdrawalRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  networkRewards: {
    type: Map,
    of: Number,
    default: new Map()
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  requestedAt: {
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
  rejectionReason: {
    type: String
  },
  adminNotes: {
    type: String
  },
  // Track which networks were requested
  requestedNetworks: [{
    network: {
      type: String,
      enum: ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL']
    },
    amount: {
      type: Number,
      min: 0
    }
  }],
  // Track if this was required for tier upgrade
  isTierUpgradeRequirement: {
    type: Boolean,
    default: false
  },
  targetTier: {
    type: Number,
    min: 1,
    max: 5
  },
  metadata: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
});

// Index for efficient queries
withdrawalRequestSchema.index({ userId: 1, status: 1 });
withdrawalRequestSchema.index({ level: 1, status: 1 });
withdrawalRequestSchema.index({ requestedAt: -1 });

// Update the updatedAt field on save
withdrawalRequestSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);

export default WithdrawalRequest;
