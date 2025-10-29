import mongoose from 'mongoose';

const networkRewardSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  network: {
    type: String,
    required: true,
    enum: ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL']
  },
  rewardAmount: {
    type: Number,
    required: true,
    min: 0
  },
  // Commission percentage for this network at this level (0-100)
  commissionPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
});

// Compound index to ensure unique combination of level and network
networkRewardSchema.index({ level: 1, network: 1 }, { unique: true });

// Update the updatedAt field on save
networkRewardSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

const NetworkReward = mongoose.model('NetworkReward', networkRewardSchema);

export default NetworkReward;
