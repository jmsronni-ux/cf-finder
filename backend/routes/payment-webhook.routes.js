import express from 'express';
import { handlePaymentWebhook } from '../controllers/payment-webhook.controller.js';

const router = express.Router();

// Publicly accessible but secured by WEBHOOK_SECRET in body
router.post('/webhook', handlePaymentWebhook);

export default router;
