import mongoose from 'mongoose';

const nodeSchema = new mongoose.Schema({
  id: String,
  type: String,
  data: {
    label: String,
    logo: String,
    selected: Boolean,
    isVisible: Boolean,
    hasStarted: Boolean,
    handles: {
      target: {
        position: String
      },
      source: {
        position: String
      },
      sources: [{
        id: String,
        position: String
      }]
    },
    transaction: {
      id: String,
      date: String,
      transaction: String,
      amount: Number,
      currency: String,
      status: String
    },
    pending: Number,
    level: Number
  },
  position: {
    x: Number,
    y: Number
  },
  style: {
    width: Number,
    height: Number
  }
});

const edgeSchema = new mongoose.Schema({
  id: String,
  source: String,
  target: String,
  sourceHandle: String,
  type: String,
  animated: Boolean,
  style: {
    stroke: String,
    strokeWidth: Number
  }
});

const levelSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  nodes: [nodeSchema],
  edges: [edgeSchema],
  metadata: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    version: {
      type: String,
      default: '1.0.0'
    }
  }
});

// Update the updatedAt field on save
levelSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

const Level = mongoose.model('Level', levelSchema);

export default Level;
