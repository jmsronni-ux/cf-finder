import mongoose from 'mongoose';
import { MONGO_URI, NODE_ENV } from '../config/env.js';

if(!MONGO_URI) { 
    throw new Error('MONGO_URI is not defined');
}

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

export default connectDB;