import express from 'express';
import multer from 'multer';
import { body, param, query } from 'express-validator';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware.js';
import {
    getActiveQuestionnaires,
    uploadAdditionalDocument,
    submitAdditionalVerification,
    getMySubmissions,
    downloadOwnDocument
} from '../controllers/additional-verification.controller.js';
import {
    listQuestionnaires,
    createQuestionnaire,
    updateQuestionnaire,
    getQuestionnaireById,
    listSubmissions,
    getSubmissionById,
    updateSubmissionStatus,
    allowResubmission,
    adminDownloadDocument
} from '../controllers/additional-verification-admin.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.get('/questionnaires/active', getActiveQuestionnaires);
router.post('/upload', upload.single('file'), uploadAdditionalDocument);
router.post('/',
    body('questionnaireId').isMongoId().withMessage('questionnaireId is required'),
    body('profile').optional().isObject().withMessage('profile must be an object'),
    body('answers').optional().isArray().withMessage('answers must be an array'),
    body('documents').optional().isArray().withMessage('documents must be an array'),
    submitAdditionalVerification
);
router.get('/my', getMySubmissions);
router.get('/files/:fileId', downloadOwnDocument);

const adminRouter = express.Router();
adminRouter.use(adminMiddleware);

adminRouter.get('/questionnaires', listQuestionnaires);
adminRouter.post('/questionnaires',
    body('title').notEmpty().withMessage('Title is required'),
    body('status').optional().isIn(['draft', 'active', 'archived']),
    body('fields').isArray().withMessage('Fields must be an array'),
    createQuestionnaire
);
adminRouter.put('/questionnaires/:id',
    param('id').isMongoId(),
    body('title').optional().notEmpty(),
    body('status').optional().isIn(['draft', 'active', 'archived']),
    body('fields').optional().isArray(),
    updateQuestionnaire
);
adminRouter.get('/questionnaires/:id', param('id').isMongoId(), getQuestionnaireById);

adminRouter.get('/submissions',
    query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    query('status').optional().isIn(['pending', 'approved', 'rejected']),
    query('userId').optional().isMongoId(),
    query('questionnaireId').optional().isMongoId(),
    listSubmissions
);
adminRouter.get('/submissions/:id', param('id').isMongoId(), getSubmissionById);
adminRouter.patch('/submissions/:id/status',
    param('id').isMongoId(),
    body('status').isIn(['pending', 'approved', 'rejected']),
    body('reviewNote').optional().isString(),
    updateSubmissionStatus
);
adminRouter.delete('/submissions/:id/resubmit',
    param('id').isMongoId(),
    allowResubmission
);
adminRouter.get('/files/:fileId', param('fileId').isMongoId(), adminDownloadDocument);

router.use('/admin', adminRouter);

export default router;

