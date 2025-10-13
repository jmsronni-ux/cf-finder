import { config } from "dotenv";

config({ path: `.env.${process.env.NODE_ENV || "development" }.local` });

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
    ADMIN_EMAIL
} = process.env;