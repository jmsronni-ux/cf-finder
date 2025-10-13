// Test script for bulk user creation
// Run with: node test-bulk-users.js

const testData = {
    users: [
        {
            name: "John Doe",
            email: "john.doe@example.com",
            phone: "+1234567890",
            balance: 100,
            tier: 1
        },
        {
            name: "Jane Smith",
            email: "jane.smith@example.com", 
            phone: "+0987654321",
            balance: 50,
            tier: 2
        },
        {
            name: "Bob Johnson",
            email: "bob.johnson@example.com",
            phone: "+1122334455",
            balance: 200,
            tier: 3
        }
    ]
};

const singleUserData = {
    name: "Test User",
    email: "test.user@example.com",
    phone: "+9988776655",
    balance: 75,
    tier: 1
};

console.log("=== Test Data for Bulk User Creation ===");
console.log("\n1. Multiple Users (POST /bulk-user/bulk-create):");
console.log(JSON.stringify(testData, null, 2));

console.log("\n2. Single User (POST /bulk-user/create):");
console.log(JSON.stringify(singleUserData, null, 2));

console.log("\n=== cURL Commands ===");
console.log("\nTest single user creation:");
console.log(`curl -X POST http://localhost:3000/bulk-user/create \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(singleUserData)}'`);

console.log("\nTest bulk user creation:");
console.log(`curl -X POST http://localhost:3000/bulk-user/bulk-create \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(testData)}'`);

console.log("\n=== Expected Response Format ===");
console.log("\nSuccessful bulk creation response:");
console.log(JSON.stringify({
    success: true,
    message: "Processed 3 users",
    data: {
        totalProcessed: 3,
        successfullyCreated: 3,
        failed: 0,
        createdUsers: [
            {
                id: "user_id_here",
                name: "John Doe",
                email: "john.doe@example.com",
                phone: "+1234567890",
                balance: 100,
                tier: 1,
                emailSent: true
            }
        ],
        failedUsers: []
    }
}, null, 2));

