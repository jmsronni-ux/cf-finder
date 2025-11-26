import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema({
    addressLine1: { type: String, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true },
    dateOfBirth: { type: Date }
}, { _id: false });

const answerSchema = new mongoose.Schema({
    fieldKey: { type: String, required: true },
    value: mongoose.Schema.Types.Mixed
}, { _id: false });

const documentSchema = new mongoose.Schema({
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const submissionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    questionnaire: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdditionalVerificationQuestionnaire',
        required: true
    },
    profile: profileSchema,
    answers: {
        type: [answerSchema],
        default: []
    },
    documents: {
        type: [documentSchema],
        default: []
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewNote: {
        type: String,
        trim: true
    },
    reviewedAt: {
        type: Date
    }
}, { timestamps: true });

submissionSchema.index({ questionnaire: 1, status: 1 });

const AdditionalVerificationSubmission = mongoose.model(
    'AdditionalVerificationSubmission',
    submissionSchema
);

export default AdditionalVerificationSubmission;

