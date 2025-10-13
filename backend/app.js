import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';
import balanceRouter from './routes/balance.routes.js';
import cryptRouter from './routes/crypt.routes.js';
import bulkUserRouter from './routes/bulk-user.routes.js';
import tierRouter from './routes/tier.routes.js';
import blockchainAnalysisRouter from './routes/blockchain-analysis.routes.js';
import topupRequestRouter from './routes/topup-request.routes.js';
import withdrawRequestRouter from './routes/withdraw-request.routes.js';
import tierRequestRouter from './routes/tier-request.routes.js';
import connectDB from './database/mongodb.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';
import arcjetMiddleware from './middlewares/arcjet.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var app = express();

connectDB();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Serve frontend static files in production (when built)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/balance', balanceRouter);
app.use('/crypt', cryptRouter);
app.use('/bulk-user', bulkUserRouter);
app.use('/tier', tierRouter);
app.use('/blockchain-analysis', blockchainAnalysisRouter);
app.use('/topup-request', topupRequestRouter);
app.use('/withdraw-request', withdrawRequestRouter);
app.use('/tier-request', tierRequestRouter);
app.use(arcjetMiddleware);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);
export default app;
