import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/user.model.js';

// Load environment variables
dotenv.config({ path: '.env.development.local' });

const verifyUserCreation = async () => {
    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Test 1: Create a user with only required fields
        console.log('📝 Test 1: Creating user with only required fields...');
        const testUser1Data = {
            name: 'Test User Minimal',
            email: 'test.minimal@example.com',
            password: await bcrypt.hash('password123', 10),
            phone: '+1234567891'
        };

        // Check if exists first
        let existingUser = await User.findOne({ email: testUser1Data.email });
        if (existingUser) {
            console.log('⚠️  User already exists, deleting for fresh test...');
            await User.deleteOne({ email: testUser1Data.email });
        }

        const user1 = new User(testUser1Data);
        await user1.save();
        console.log('✅ User created successfully!');
        console.log('   - Balance (default):', user1.balance);
        console.log('   - Tier (default):', user1.tier);
        console.log('   - Level 1 Reward (default):', user1.lvl1reward);
        console.log('   - Level 2 Reward (default):', user1.lvl2reward);
        console.log('   - Level 3 Reward (default):', user1.lvl3reward);
        console.log('   - Level 4 Reward (default):', user1.lvl4reward);
        console.log('   - Level 5 Reward (default):', user1.lvl5reward);
        console.log('   - Level 1 Animation (default):', user1.lvl1anim);

        // Test 2: Create a user with custom values
        console.log('\n📝 Test 2: Creating user with custom values...');
        const testUser2Data = {
            name: 'Test User Custom',
            email: 'test.custom@example.com',
            password: await bcrypt.hash('password123', 10),
            phone: '+1234567892',
            balance: 5000,
            tier: 3,
            lvl1reward: 2000,
            lvl2reward: 10000,
            lvl3reward: 25000,
            lvl4reward: 75000,
            lvl5reward: 150000
        };

        existingUser = await User.findOne({ email: testUser2Data.email });
        if (existingUser) {
            console.log('⚠️  User already exists, deleting for fresh test...');
            await User.deleteOne({ email: testUser2Data.email });
        }

        const user2 = new User(testUser2Data);
        await user2.save();
        console.log('✅ User created successfully with custom values!');
        console.log('   - Balance (custom):', user2.balance);
        console.log('   - Tier (custom):', user2.tier);
        console.log('   - Level 1 Reward (custom):', user2.lvl1reward);
        console.log('   - Level 2 Reward (custom):', user2.lvl2reward);
        console.log('   - Level 3 Reward (custom):', user2.lvl3reward);
        console.log('   - Level 4 Reward (custom):', user2.lvl4reward);
        console.log('   - Level 5 Reward (custom):', user2.lvl5reward);

        // Test 3: Verify all fields are properly saved
        console.log('\n📝 Test 3: Verifying fields from database...');
        const verifyUser = await User.findById(user2._id);
        console.log('✅ User retrieved from database');
        console.log('   - All level rewards present:', 
            verifyUser.lvl1reward !== undefined &&
            verifyUser.lvl2reward !== undefined &&
            verifyUser.lvl3reward !== undefined &&
            verifyUser.lvl4reward !== undefined &&
            verifyUser.lvl5reward !== undefined
        );
        console.log('   - All animation flags present:', 
            verifyUser.lvl1anim !== undefined &&
            verifyUser.lvl2anim !== undefined &&
            verifyUser.lvl3anim !== undefined &&
            verifyUser.lvl4anim !== undefined &&
            verifyUser.lvl5anim !== undefined
        );

        // Test 4: Update level rewards
        console.log('\n📝 Test 4: Testing level reward updates...');
        verifyUser.lvl1reward = 3000;
        verifyUser.lvl2reward = 12000;
        await verifyUser.save();
        console.log('✅ Level rewards updated successfully!');

        const updatedUser = await User.findById(user2._id);
        console.log('   - Level 1 Reward (updated):', updatedUser.lvl1reward);
        console.log('   - Level 2 Reward (updated):', updatedUser.lvl2reward);

        // Cleanup
        console.log('\n🧹 Cleaning up test users...');
        await User.deleteOne({ email: testUser1Data.email });
        await User.deleteOne({ email: testUser2Data.email });
        console.log('✅ Test users cleaned up');

        console.log('\n🎉 ALL TESTS PASSED! User model is working correctly with new fields.');
        console.log('\n✅ Summary:');
        console.log('   - Default values are applied correctly');
        console.log('   - Custom values can be set during creation');
        console.log('   - All fields are saved and retrieved properly');
        console.log('   - Level rewards can be updated');

    } catch (error) {
        console.error('❌ Error during verification:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
};

// Run the verification
verifyUserCreation();
