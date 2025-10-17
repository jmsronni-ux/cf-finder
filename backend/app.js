import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';

import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';
import balanceRouter from './routes/balance.routes.js';
import cryptRouter from './routes/crypt.routes.js';
import bulkUserRouter from './routes/bulk-user.routes.js';
import tierRouter from './routes/tier.routes.js';
import levelRouter from './routes/level.routes.js';
import networkRewardRouter from './routes/network-reward.routes.js';
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

// CORS configuration - allow requests from frontend
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // If FRONTEND_URL is not set in production, allow all origins (for initial deployment)
    if (!process.env.FRONTEND_URL && process.env.NODE_ENV === 'production') {
      console.log('⚠️  FRONTEND_URL not set, allowing all origins. Set FRONTEND_URL for better security.');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Only serve frontend static files if they exist (monorepo deployment)
// For separate services deployment, comment this out or remove
if (process.env.SERVE_FRONTEND === 'true') {
  const frontendPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendPath));
  console.log('Serving frontend from:', frontendPath);
}

app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/balance', balanceRouter);
app.use('/crypt', cryptRouter);
app.use('/bulk-user', bulkUserRouter);
app.use('/tier', tierRouter);
app.use('/level', levelRouter);
app.use('/network-reward', networkRewardRouter);
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
