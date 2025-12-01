import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from '../models/user.model.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try loading from multiple potential env files
const envFiles = [
    '.env.development.local',
    '.env.local',
    '.env.development',
    '.env'
];

let envLoaded = false;
for (const envFile of envFiles) {
    const result = dotenv.config({ path: join(__dirname, '..', envFile) });
    if (!result.error && process.env.MONGO_URI) {
        console.log(`✅ Loaded environment from ${envFile}`);
        envLoaded = true;
        break;
    }
}

if (!envLoaded || !process.env.MONGO_URI) {
    console.error('❌ Error: MONGO_URI not found in environment variables');
    console.error('📝 Please create one of these files in the backend directory:');
    envFiles.forEach(file => console.error(`   - ${file}`));
    console.error('');
    console.error('Add this line to your env file:');
    console.error('MONGO_URI=mongodb://localhost:27017/your-database-name');
    console.error('');
    console.error('Or if using MongoDB Atlas:');
    console.error('MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name');
    process.exit(1);
}

const createTestUser = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Test user data
        const testUserData = {
            name: 'Testplain Pass',
            email: 'testplainpass@example.com',
            password: 'superplainpass123', // THIS will be saved as plain text
            phone: '+12345098765',
            balance: 5000,
            tier: 1,
            // Custom tier prices (null = use defaults: $50, $100, $250, $500)
            // Uncomment to test custom pricing:
            // tier2Price: 25,   // 50% discount on tier 2
            // tier3Price: 50,   // 50% discount on tier 3
            // tier4Price: 125,  // 50% discount on tier 4
            // tier5Price: 250   // 50% discount on tier 5
        };

        // Check if user already exists
        const existingUser = await User.findOne({ email: testUserData.email });
        if (existingUser) {
            console.log('⚠️  Test user already exists!');
            console.log('📧 Email:', existingUser.email);
            console.log('🔑 Password: superplainpass123');
            return;
        }

        // NO hashing, save as plain text
        // const salt = await bcrypt.genSalt(10);
        // const hashedPassword = await bcrypt.hash(testUserData.password, salt);

        // Create the test user
        const testUser = new User({
            name: testUserData.name,
            email: testUserData.email,
            password: testUserData.password, // PLAINTEXT
            phone: testUserData.phone,
            balance: testUserData.balance,
            tier: testUserData.tier,
            tier2Price: testUserData.tier2Price,
            tier3Price: testUserData.tier3Price,
            tier4Price: testUserData.tier4Price,
            tier5Price: testUserData.tier5Price
        });

        await testUser.save();

        console.log('🎉 Test user created successfully!');
        console.log('📧 Email:', testUserData.email);
        console.log('🔑 Password:', testUserData.password);
        console.log('💰 Balance:', testUserData.balance);
        console.log('🏆 Tier:', testUserData.tier);
        console.log('📱 Phone:', testUserData.phone);
        console.log('💎 Custom Tier Prices:');
        console.log('   Tier 2:', testUserData.tier2Price !== undefined ? `$${testUserData.tier2Price}` : 'Default ($50)');
        console.log('   Tier 3:', testUserData.tier3Price !== undefined ? `$${testUserData.tier3Price}` : 'Default ($100)');
        console.log('   Tier 4:', testUserData.tier4Price !== undefined ? `$${testUserData.tier4Price}` : 'Default ($250)');
        console.log('   Tier 5:', testUserData.tier5Price !== undefined ? `$${testUserData.tier5Price}` : 'Default ($500)');
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
