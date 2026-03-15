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
    level: Number,
    successRate: String,
    customParameters: [{
      title: String,
      value: String
    }]
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
  },
  markerEnd: {
    type: { type: String },
    color: String,
  },
  label: String,
  data: {
    pathShape: String,
    dashEnabled: Boolean,
    dashLength: Number,
    dashGap: Number,
    dashAnimation: Boolean,
    dashAnimationSpeed: Number,
    dotEnabled: Boolean,
    dotShape: String,
    dotCustomPath: String,
    dotSize: Number,
    dotSpeed: Number,
    dotColor: String,
    glowEnabled: Boolean,
    glowIntensity: Number,
    glowSpread: Number,
  },
});

const levelSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true
  },
  templateName: {
    type: String,
    required: true,
    default: 'A'
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

// Compound index to ensure level is unique per template
levelSchema.index({ level: 1, templateName: 1 }, { unique: true });

// Update the updatedAt field on save
levelSchema.pre('save', function (next) {
  this.metadata.updatedAt = new Date();
  next();
});

const Level = mongoose.model('Level', levelSchema);

export default Level;
