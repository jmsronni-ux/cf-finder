import mongoose from 'mongoose';

const scannerLeadSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: [true, 'Wallet address is required'],
        trim: true,
    },
    network: {
        type: String,
        required: [true, 'Network is required'],
        trim: true,
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
    },
    telegram: {
        type: String,
        trim: true,
        default: '',
    },
    whatsapp: {
        type: String,
        trim: true,
        default: '',
    },
    threatIndex: {
        type: Number,
        default: 0,
    },
    severity: {
        type: String,
        enum: ['clear', 'low', 'moderate', 'critical'],
        default: 'clear',
    },
    balance: {
        type: Number,
        default: 0,
    },
    currency: {
        type: String,
        default: '',
    },
    source: {
        type: String,
        default: 'wallet_scanner',
    },
    contacted: {
        type: Boolean,
        default: false,
    },
    contactedAt: {
        type: Date,
        default: null,
    },
    adminNote: {
        type: String,
        trim: true,
        default: '',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const ScannerLead = mongoose.model('ScannerLead', scannerLeadSchema);

export default ScannerLead;
