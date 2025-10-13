import fetch from 'node-fetch';

const createTestUserViaAPI = async () => {
    try {
        console.log('🚀 Creating test user via API...');
        
        // Test user data for single user creation
        const testUserData = {
            name: 'Test User',
            email: 'test@example.com',
            phone: '+1234567890',
            balance: 1500, // Give them enough balance to test tier upgrades
            tier: 1 // Start at tier 1
        };

        // Make API call to create user
        const response = await fetch('http://localhost:3000/bulk-user/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testUserData)
        });

        const responseData = await response.json();
        console.log('📡 API Response:', responseData);

        if (response.ok && responseData.success) {
            console.log('🎉 Test user created successfully!');
            console.log('📧 Email: test@example.com');
            console.log('🔑 Password: Check your email for the generated password');
            console.log('💰 Balance: 1500');
            console.log('🏆 Tier: 1');
            console.log('📱 Phone: +1234567890');
            console.log('');
            console.log('🚀 You can now login with these credentials at http://localhost:3000/login');
            console.log('📬 The password was sent to the email address');
        } else {
            console.log('⚠️  Response:', responseData);
            if (responseData.message && responseData.message.includes('already exists')) {
                console.log('✅ Test user already exists in the database!');
                console.log('📧 Email: test@example.com');
                console.log('🔑 Password: Check your email for the generated password');
            }
        }

    } catch (error) {
        console.error('❌ Error creating test user:', error.message);
        console.log('💡 Make sure your server is running on http://localhost:3000');
    }
};

// Run the script
createTestUserViaAPI();
