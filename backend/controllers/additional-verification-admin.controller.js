import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import AdditionalVerificationQuestionnaire from '../models/additional-verification-questionnaire.model.js';
import AdditionalVerificationSubmission from '../models/additional-verification-submission.model.js';
import { getFileMetadata, getFileStream } from '../services/gridfs.service.js';
import User from '../models/user.model.js';
import { 
    sendAdditionalVerificationApprovedEmail, 
    sendAdditionalVerificationRejectedEmail 
} from '../services/email.service.js';

const handleValidation = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return true;
    }
    return false;
};

export const listQuestionnaires = async (req, res) => {
    if (handleValidation(req, res)) return;

    const questionnaires = await AdditionalVerificationQuestionnaire.find()
        .sort({ updatedAt: -1 });

    res.json({ success: true, data: questionnaires });
};

export const createQuestionnaire = async (req, res) => {
    if (handleValidation(req, res)) return;

    const questionnaire = await AdditionalVerificationQuestionnaire.create({
        ...req.body,
        createdBy: req.user._id,
        updatedBy: req.user._id
    });

    res.status(201).json({ success: true, data: questionnaire });
};

export const updateQuestionnaire = async (req, res) => {
    if (handleValidation(req, res)) return;

    const { id } = req.params;
    const questionnaire = await AdditionalVerificationQuestionnaire.findByIdAndUpdate(
        id,
        { ...req.body, updatedBy: req.user._id },
        { new: true }
    );

    if (!questionnaire) {
        return res.status(404).json({ success: false, message: 'Questionnaire not found' });
    }

    res.json({ success: true, data: questionnaire });
};

export const getQuestionnaireById = async (req, res) => {
    const questionnaire = await AdditionalVerificationQuestionnaire.findById(req.params.id);
    if (!questionnaire) {
        return res.status(404).json({ success: false, message: 'Questionnaire not found' });
    }

    res.json({ success: true, data: questionnaire });
};

export const listSubmissions = async (req, res) => {
    if (handleValidation(req, res)) return;

    const { status, userId, questionnaireId, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) query.user = userId;
    if (questionnaireId && mongoose.Types.ObjectId.isValid(questionnaireId)) query.questionnaire = questionnaireId;

    // Add search functionality
    if (search) {
        const searchRegex = new RegExp(search, 'i');
        const matchedUsers = await User.find({
            $or: [{ name: searchRegex }, { email: searchRegex }]
        }).select('_id');
        const userIds = matchedUsers.map(user => user._id);

        if (userIds.length > 0) {
            query.user = { $in: userIds };
        } else {
            // If no users match, return empty results
            query.user = { $in: [] };
        }
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [submissions, totalItems] = await Promise.all([
        AdditionalVerificationSubmission.find(query)
            .populate('user', 'name email')
            .populate('questionnaire', 'title')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        AdditionalVerificationSubmission.countDocuments(query)
    ]);

    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

    res.json({
        success: true,
        data: submissions,
        pagination: {
            page,
            limit,
            totalPages,
            totalItems
        }
    });
};

export const getSubmissionById = async (req, res) => {
    const submission = await AdditionalVerificationSubmission.findById(req.params.id)
        .populate('user', 'name email')
        .populate('questionnaire');

    if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    res.json({ success: true, data: submission });
};

export const updateSubmissionStatus = async (req, res) => {
    if (handleValidation(req, res)) return;

    const { status, reviewNote } = req.body;
    const submission = await AdditionalVerificationSubmission.findByIdAndUpdate(
        req.params.id,
        {
            status,
            reviewNote,
            reviewer: req.user._id,
            reviewedAt: new Date()
        },
        { new: true }
    );

    if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Fetch populated submission for email
    const populatedSubmission = await AdditionalVerificationSubmission.findById(submission._id)
        .populate('user', 'name email')
        .populate('questionnaire', 'title');

    // Send email notification to user based on status
    if (populatedSubmission && populatedSubmission.user && populatedSubmission.questionnaire) {
        if (status === 'approved') {
            sendAdditionalVerificationApprovedEmail(
                populatedSubmission.user.email,
                populatedSubmission.user.name,
                populatedSubmission.questionnaire.title,
                populatedSubmission._id
            ).catch(err => console.error('Failed to send additional verification approved email:', err));
        } else if (status === 'rejected') {
            sendAdditionalVerificationRejectedEmail(
                populatedSubmission.user.email,
                populatedSubmission.user.name,
                populatedSubmission.questionnaire.title,
                populatedSubmission._id,
                reviewNote || ''
            ).catch(err => console.error('Failed to send additional verification rejected email:', err));
        }
    }

    res.json({ success: true, data: submission });
};

export const allowResubmission = async (req, res) => {
    if (handleValidation(req, res)) return;

    const submission = await AdditionalVerificationSubmission.findById(req.params.id);
    if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Delete the submission to allow user to resubmit
    await AdditionalVerificationSubmission.findByIdAndDelete(req.params.id);

    res.json({ 
        success: true, 
        message: 'Submission deleted. User can now resubmit the questionnaire.',
        data: { deleted: true }
    });
};

export const adminDownloadDocument = async (req, res) => {
    const { fileId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res.status(400).json({ success: false, message: 'Invalid file id' });
    }

    const submission = await AdditionalVerificationSubmission.findOne({ 'documents.fileId': fileId });
    if (!submission) {
        return res.status(404).json({ success: false, message: 'Document not tied to any submission' });
    }

    const document = submission.documents.find(doc => doc.fileId.toString() === fileId);
    try {
        const meta = await getFileMetadata(fileId);
        if (!meta) {
            return res.status(404).json({ success: false, message: 'File metadata missing' });
        }

        res.setHeader('Content-Type', meta.contentType || document.mimeType);
        res.setHeader('Content-Disposition', `inline; filename=\"${document.filename}\"`);

        const stream = getFileStream(fileId);
        stream.on('error', () => {
            res.status(500).json({ success: false, message: 'Failed to stream file' });
        });
        stream.pipe(res);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Unable to open file'
        });
    }
};

