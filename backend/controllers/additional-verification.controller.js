import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import AdditionalVerificationQuestionnaire from '../models/additional-verification-questionnaire.model.js';
import AdditionalVerificationSubmission from '../models/additional-verification-submission.model.js';
import { uploadBufferToGridFS, getFileMetadata, getFileStream } from '../services/gridfs.service.js';
import { validateAnswers, validateDocumentsPayload } from '../utils/additional-verification.utils.js';
import { sendAdditionalVerificationSubmissionReceivedEmail } from '../services/email.service.js';
import User from '../models/user.model.js';

const respondValidationErrors = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            errors: errors.array()
        });
        return true;
    }
    return false;
};

export const getActiveQuestionnaires = async (req, res) => {
    const questionnaires = await AdditionalVerificationQuestionnaire.find({ status: 'active' }).sort({ updatedAt: -1 });
    res.json({
        success: true,
        data: questionnaires
    });
};

export const uploadAdditionalDocument = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'File is required' });
    }

    try {
        const { buffer, originalname, mimetype } = req.file;
        const uploadResult = await uploadBufferToGridFS({
            buffer,
            filename: originalname,
            mimetype,
            metadata: {
                userId: req.user._id.toString(),
                feature: 'additional-verification'
            }
        });

        res.status(201).json({
            success: true,
            data: uploadResult
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Unable to upload file'
        });
    }
};

export const submitAdditionalVerification = async (req, res) => {
    if (respondValidationErrors(req, res)) {
        return;
    }

    const { questionnaireId, profile = {}, answers = [], documents = [] } = req.body;

    const questionnaire = await AdditionalVerificationQuestionnaire.findOne({
        _id: questionnaireId,
        status: 'active'
    });

    if (!questionnaire) {
        return res.status(404).json({ success: false, message: 'Questionnaire not found or inactive' });
    }

    const { errors: answerErrors, normalizedAnswers } = validateAnswers(questionnaire, answers);
    if (answerErrors.length) {
        return res.status(400).json({ success: false, errors: answerErrors });
    }

    const { errors: documentErrors, normalizedDocuments } = validateDocumentsPayload(documents);
    if (documentErrors.length) {
        return res.status(400).json({ success: false, errors: documentErrors });
    }

    // Validate required file fields
    const fileFields = questionnaire.fields.filter(f => f.type === 'file' && f.required);
    if (fileFields.length > 0 && normalizedDocuments.length === 0) {
        const requiredFileFieldTitles = fileFields.map(f => f.title || f.key).join(', ');
        return res.status(400).json({ 
            success: false, 
            errors: [`Required file upload(s) missing: ${requiredFileFieldTitles}`] 
        });
    }

    // Ensure documents exist and belong to user
    for (const doc of normalizedDocuments) {
        const fileMeta = await getFileMetadata(doc.fileId);
        if (!fileMeta) {
            return res.status(400).json({ success: false, message: 'One or more documents are invalid' });
        }
        if (fileMeta.metadata?.userId !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'You can only attach your own files' });
        }
    }

    const submission = await AdditionalVerificationSubmission.create({
        user: req.user._id,
        questionnaire: questionnaire._id,
        profile,
        answers: normalizedAnswers,
        documents: normalizedDocuments
    });

    // Send confirmation email to user
    const user = await User.findById(req.user._id);
    if (user) {
        sendAdditionalVerificationSubmissionReceivedEmail(
            user.email,
            user.name,
            questionnaire.title,
            submission._id
        ).catch(err => console.error('Failed to send submission received email:', err));
    }

    res.status(201).json({
        success: true,
        data: submission
    });
};

export const getMySubmissions = async (req, res) => {
    const submissions = await AdditionalVerificationSubmission.find({ user: req.user._id })
        .populate('questionnaire', 'title status')
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        data: submissions
    });
};

export const downloadOwnDocument = async (req, res) => {
    const { fileId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res.status(400).json({ success: false, message: 'Invalid file id' });
    }

    const submission = await AdditionalVerificationSubmission.findOne({
        user: req.user._id,
        'documents.fileId': fileId
    });

    if (!submission) {
        return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const document = submission.documents.find(doc => doc.fileId.toString() === fileId);

    try {
        const fileMeta = await getFileMetadata(fileId);
        if (!fileMeta) {
            return res.status(404).json({ success: false, message: 'File metadata missing' });
        }

        res.setHeader('Content-Type', fileMeta.contentType || document.mimeType);
        res.setHeader('Content-Disposition', `inline; filename=\"${document.filename}\"`);

        const stream = getFileStream(fileId);
        stream.on('error', () => {
            res.status(500).json({ success: false, message: 'Failed to stream file' });
        });
        stream.pipe(res);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Unable to download file'
        });
    }
};

