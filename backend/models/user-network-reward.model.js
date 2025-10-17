import mongoose from 'mongoose';

const userNetworkRewardSchema = new mongoose.Schema({
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
  isActive: {
    type: Boolean,
    default: true
  },
  isCustom: {
    type: Boolean,
    default: false // false = inherited from global, true = custom for this user
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

// Compound index to ensure unique combination of user, level, and network
userNetworkRewardSchema.index({ userId: 1, level: 1, network: 1 }, { unique: true });

// Index for efficient queries by user
userNetworkRewardSchema.index({ userId: 1, level: 1 });

// Update the updatedAt field on save
userNetworkRewardSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

const UserNetworkReward = mongoose.model('UserNetworkReward', userNetworkRewardSchema);

export default UserNetworkReward;
