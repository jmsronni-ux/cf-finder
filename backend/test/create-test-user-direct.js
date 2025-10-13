import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/user.model.js';

// Load environment variables
dotenv.config({ path: '.env.development.local' });

const createTestUser = async () => {
    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Test user data
        const testUserData = {
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123', // This will be hashed
            phone: '+1234567890',
            balance: 1500, // Give them enough balance to test tier upgrades
            tier: 1 // Start at tier 1
        };

        // Check if user already exists
        const existingUser = await User.findOne({ email: testUserData.email });
        if (existingUser) {
            console.log('⚠️  Test user already exists!');
            console.log('📧 Email:', existingUser.email);
            console.log('💰 Balance:', existingUser.balance);
            console.log('🏆 Tier:', existingUser.tier);
            console.log('🔑 Password: password123');
            return;
        }

        // Hash the password
        console.log('🔐 Hashing password...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(testUserData.password, salt);

        // Create the test user
        console.log('👤 Creating test user...');
        const testUser = new User({
            name: testUserData.name,
            email: testUserData.email,
            password: hashedPassword,
            phone: testUserData.phone,
            balance: testUserData.balance,
            tier: testUserData.tier
        });

        await testUser.save();

        console.log('🎉 Test user created successfully!');
        console.log('📧 Email:', testUserData.email);
        console.log('🔑 Password:', testUserData.password);
        console.log('💰 Balance:', testUserData.balance);
        console.log('🏆 Tier:', testUserData.tier);
        console.log('📱 Phone:', testUserData.phone);
        console.log('');
        console.log('🚀 You can now login with these credentials at http://localhost:3000/login');

    } catch (error) {
        console.error('❌ Error creating test user:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('🔌 Disconnected from MongoDB');
    }
};

// Run the script
createTestUser();
