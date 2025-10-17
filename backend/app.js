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
import userNetworkRewardRouter from './routes/user-network-reward.routes.js';
import withdrawalRequestRouter from './routes/withdrawal-request.routes.js';
import migrationRouter from './routes/migration.routes.js';
import blockchainAnalysisRouter from './routes/blockchain-analysis.routes.js';
import topupRequestRouter from './routes/topup-request.routes.js';
import withdrawRequestRouter from './routes/withdraw-request.routes.js';
import tierRequestRouter from './routes/tier-request.routes.js';
import connectDB from './database/mongodb.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';
import arcjetMiddleware from './middlewares/arcjet.middleware.js';
import { FRONTEND_URL, NODE_ENV } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var app = express();

// Debug environment variables
console.log('Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('PORT:', process.env.PORT);

connectDB();

// Run migrations on startup (only in production or when MIGRATE_ON_STARTUP is true)
if (process.env.NODE_ENV === 'production' || process.env.MIGRATE_ON_STARTUP === 'true') {
  import('./scripts/run-migrations.js').catch(error => {
    console.error('Migration failed:', error);
  });
}

// CORS configuration - allow requests from frontend
const allowedOrigins = FRONTEND_URL 
  ? FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

console.log('CORS Configuration:');
console.log('NODE_ENV:', NODE_ENV);
console.log('FRONTEND_URL:', FRONTEND_URL);
console.log('Allowed Origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    console.log('CORS Request from origin:', origin);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('No origin, allowing request');
      return callback(null, true);
    }
    
    // If FRONTEND_URL is not set in production, allow all origins (for initial deployment)
    if (!FRONTEND_URL && NODE_ENV === 'production') {
      console.log('⚠️  FRONTEND_URL not set, allowing all origins. Set FRONTEND_URL for better security.');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin) || NODE_ENV === 'development') {
      console.log('✅ Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('❌ Origin blocked:', origin);
      console.log('Allowed origins:', allowedOrigins);
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
app.use('/user-network-reward', userNetworkRewardRouter);
app.use('/withdrawal-request', withdrawalRequestRouter);
app.use('/migration', migrationRouter);
app.use('/blockchain-analysis', blockchainAnalysisRouter);
app.use('/topup-request', topupRequestRouter);
app.use('/withdraw-request', withdrawRequestRouter);
app.use('/tier-request', tierRequestRouter);
app.use(arcjetMiddleware);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'CF Finder API is running!', 
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    frontendUrl: FRONTEND_URL,
    mongoUri: MONGO_URI ? 'Set' : 'Not Set',
    jwtSecret: JWT_SECRET ? 'Set' : 'Not Set'
  });
});

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);
export default app;
