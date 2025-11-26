import mongoose from 'mongoose';

const fieldSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    type: {
        type: String,
        enum: ['text', 'textarea', 'select', 'date', 'file'],
        default: 'text'
    },
    required: {
        type: Boolean,
        default: false
    },
    placeholder: {
        type: String,
        trim: true,
        default: ''
    },
    options: {
        type: [String],
        default: []
    },
    step: {
        type: Number,
        default: 1,
        min: 1
    }
}, { _id: false });

const questionnaireSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'archived'],
        default: 'draft',
        index: true
    },
    fields: {
        type: [fieldSchema],
        default: []
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

questionnaireSchema.index({ status: 1, updatedAt: -1 });

const AdditionalVerificationQuestionnaire = mongoose.model(
    'AdditionalVerificationQuestionnaire',
    questionnaireSchema
);

export default AdditionalVerificationQuestionnaire;

