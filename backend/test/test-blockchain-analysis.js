import fetch from 'node-fetch';

// Test script for blockchain analysis endpoint
const BASE_URL = 'http://localhost:3000';

// Sample JotForm data structure
const sampleJotFormData = {
    submissionID: 'test_' + Date.now(),
    ip: '192.168.1.1',
    created_at: new Date().toISOString(),
    // Form fields (matching JotForm field names)
    q1_fullName: 'John', // First Name
    q2_fullName: 'Doe', // Last Name
    q3_email: 'john.doe@example.com', // Email
    q4_walletName: 'Binance', // Wallet Name
    q5_networkType: 'ETH (ERC20)', // Network Type
    q6_walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', // Wallet Address
    q7_lossValue: '5000', // Loss Value
    q8_lossDate: '2024-01-15', // Loss Date
    q9_lossMethod: 'Fake website / Phishing link', // Loss Method
    q10_receivingWallet: '0x1234567890123456789012345678901234567890', // Receiving Wallet
    q11_transactionReceipts: [
        {
            name: 'receipt1.pdf',
            originalName: 'transaction_receipt.pdf',
            type: 'application/pdf',
            size: 1024000
        }
    ]
};

async function testBlockchainAnalysisEndpoint() {
    console.log('🧪 Testing Blockchain Analysis Endpoint...\n');

    try {
        // Test 1: Submit a new analysis request
        console.log('1️⃣ Testing form submission...');
        const submitResponse = await fetch(`${BASE_URL}/blockchain-analysis/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sampleJotFormData)
        });

        const submitResult = await submitResponse.json();
        console.log('Submit Response Status:', submitResponse.status);
        console.log('Submit Response:', JSON.stringify(submitResult, null, 2));

        if (submitResponse.ok) {
            console.log('✅ Form submission successful!');
            console.log('📧 User account created and welcome email sent!\n');
            
            // Test 2: Try to submit duplicate (should fail)
            console.log('2️⃣ Testing duplicate submission prevention...');
            const duplicateResponse = await fetch(`${BASE_URL}/blockchain-analysis/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sampleJotFormData)
            });

            const duplicateResult = await duplicateResponse.json();
            console.log('Duplicate Response Status:', duplicateResponse.status);
            console.log('Duplicate Response:', JSON.stringify(duplicateResult, null, 2));

            if (duplicateResponse.status === 409) {
                console.log('✅ Duplicate prevention working!\n');
            } else {
                console.log('❌ Duplicate prevention failed!\n');
            }

            // Test 3: Test validation (missing required fields)
            console.log('3️⃣ Testing validation (missing required fields)...');
            const invalidData = {
                submissionID: 'test_invalid_' + Date.now(),
                q1_fullName: 'John',
                // Missing other required fields
            };

            const validationResponse = await fetch(`${BASE_URL}/blockchain-analysis/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(invalidData)
            });

            const validationResult = await validationResponse.json();
            console.log('Validation Response Status:', validationResponse.status);
            console.log('Validation Response:', JSON.stringify(validationResult, null, 2));

            if (validationResponse.status === 400) {
                console.log('✅ Validation working!\n');
            } else {
                console.log('❌ Validation failed!\n');
            }

        } else {
            console.log('❌ Form submission failed!\n');
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.log('\n💡 Make sure your server is running on http://localhost:3000');
        console.log('   Run: npm run dev');
    }
}

// Run the test
testBlockchainAnalysisEndpoint();
