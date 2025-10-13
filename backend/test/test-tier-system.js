// Test script for tier system endpoints
// Run with: node test-tier-system.js

console.log("🎯 Tier System Test Commands\n");

console.log("=== 1. Get All Available Tiers ===");
console.log("curl http://localhost:3000/tier/all\n");

console.log("=== 2. Create Test Users with Different Tiers ===");
console.log("curl -X POST http://localhost:3000/bulk-user/bulk-create \\");
console.log("  -H \"Content-Type: application/json\" \\");
console.log("  -d '{");
console.log("    \"users\": [");
console.log("      {");
console.log("        \"name\": \"Basic User\",");
console.log("        \"email\": \"basic@test.com\",");
console.log("        \"phone\": \"+1111111111\",");
console.log("        \"balance\": 50,");
console.log("        \"tier\": 1");
console.log("      },");
console.log("      {");
console.log("        \"name\": \"Premium User\",");
console.log("        \"email\": \"premium@test.com\",");
console.log("        \"phone\": \"+2222222222\",");
console.log("        \"balance\": 1000,");
console.log("        \"tier\": 5");
console.log("      }");
console.log("    ]");
console.log("  }'\n");

console.log("=== 3. Login and Get User Tier Info ===");
console.log("# First login to get token:");
console.log("curl -X POST http://localhost:3000/auth/sign-in \\");
console.log("  -H \"Content-Type: application/json\" \\");
console.log("  -d '{\"email\": \"basic@test.com\", \"password\": \"generated_password\"}'\n");

console.log("# Then use token to get tier info:");
console.log("curl http://localhost:3000/tier/my-tier \\");
console.log("  -H \"Authorization: Bearer YOUR_TOKEN_HERE\"\n");

console.log("=== 4. Test Tier Upgrade ===");
console.log("curl -X POST http://localhost:3000/tier/upgrade \\");
console.log("  -H \"Content-Type: application/json\" \\");
console.log("  -H \"Authorization: Bearer YOUR_TOKEN_HERE\" \\");
console.log("  -d '{\"targetTier\": 2}'\n");

console.log("=== 5. Admin: Set User Tier ===");
console.log("curl -X POST http://localhost:3000/tier/admin/set-tier \\");
console.log("  -H \"Content-Type: application/json\" \\");
console.log("  -H \"Authorization: Bearer ADMIN_TOKEN_HERE\" \\");
console.log("  -d '{");
console.log("    \"userId\": \"USER_ID_HERE\",");
console.log("    \"tier\": 4");
console.log("  }'\n");

console.log("=== Tier System Overview ===");
console.log("Tier 1 - Basic: Free (starting tier)");
console.log("Tier 2 - Standard: $50 upgrade cost");
console.log("Tier 3 - Professional: $100 upgrade cost");
console.log("Tier 4 - Enterprise: $250 upgrade cost");
console.log("Tier 5 - Premium: $500 upgrade cost\n");

console.log("=== Features by Tier ===");
console.log("Tier 1: Basic analytics, Standard support, 100 API calls/day");
console.log("Tier 2: Advanced analytics, Priority support, 500 API calls/day, Custom branding");
console.log("Tier 3: Premium analytics, 24/7 support, 2000 API calls/day, White-label options");
console.log("Tier 4: Enterprise analytics, Dedicated support, 10000 API calls/day, Custom development");
console.log("Tier 5: All features, Personal account manager, 50000 API calls/day, VIP treatment\n");

console.log("🎉 Tier system is ready for profile page implementation!");




