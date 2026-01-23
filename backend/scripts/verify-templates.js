const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env variables from backend .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const Level = require('../models/level.model');
const User = require('../models/user.model');

async function verifyTemplates() {
    try {
        console.log('--- Verifying Level Templates ---');

        // Connect to DB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Check Level Model
        const levelCount = await Level.countDocuments();
        console.log(`Total levels in database: ${levelCount}`);

        const templates = await Level.distinct('templateName');
        console.log('Available templates:', templates);

        if (templates.length === 0) {
            console.log('No templates found. Creating default Template A levels...');
            // You could add logic here to create sample levels if needed
        }

        // 2. Check User Model
        const subAdmins = await User.find({ isSubAdmin: true });
        console.log(`Number of subadmins: ${subAdmins.length}`);
        if (subAdmins.length > 0) {
            console.log('Subadmins found:', subAdmins.map(u => u.email).join(', '));
        }

        const usersWithTemplates = await User.find({ levelTemplate: { $ne: 'A', $exists: true } });
        console.log(`Users with non-default templates: ${usersWithTemplates.length}`);
        if (usersWithTemplates.length > 0) {
            console.log('Users and their templates:');
            usersWithTemplates.forEach(u => console.log(`- ${u.email}: ${u.levelTemplate}`));
        }

        console.log('\n--- Verification Complete ---');
        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verifyTemplates();
