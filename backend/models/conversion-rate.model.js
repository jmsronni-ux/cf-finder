import mongoose from 'mongoose';

const conversionRateSchema = new mongoose.Schema({
  network: {
    type: String,
    required: true,
    unique: true,
    enum: ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL', 'BCY']
    // Note: unique: true automatically creates an index, so we don't need the explicit index below
  },
  rateToUSD: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: (value) => value >= 0,
      message: 'Conversion rate must be non-negative'
    }
  },
  isAuto: {
    type: Boolean,
    default: false
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
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
});

// Note: No need for explicit index({ network: 1 }) since unique: true already creates an index

// Update the updatedAt field on save
conversionRateSchema.pre('save', function (next) {
  this.metadata.updatedAt = new Date();
  next();
});

const ConversionRate = mongoose.model('ConversionRate', conversionRateSchema);

export default ConversionRate;

