import { config } from "dotenv";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load from .env file if it exists (for local development)
// In production (Render), environment variables are already in process.env
const envPath = `.env.${process.env.NODE_ENV || "development"}.local`;
if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  // If no .env file, environment variables should already be in process.env (e.g., Render)
  console.log(`No ${envPath} file found, using environment variables from hosting platform`);
}

export const {
  PORT,
  NODE_ENV,
  MONGO_URI,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN,
  ARCJET_KEY,
  ARCJET_ENV,
  ETHERSCAN_API_KEY,
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
  ADMIN_EMAIL,
  FRONTEND_URL,
  MAILTRAP_API_TOKEN,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TELEGRAM_BOT_USERNAME,
  WEBHOOK_SECRET,
  PAYMENT_GATEWAY_URL,
  WALLET_SYNC_SECRET
} = process.env;