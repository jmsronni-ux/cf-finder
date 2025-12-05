/**
 * Simple script to verify the cron job is running
 * This checks if the cron service is properly set up
 */

import conversionRateCron from '../services/conversion-rate-cron.service.js';

console.log('='.repeat(60));
console.log('Conversion Rate Cron Job Status');
console.log('='.repeat(60));
console.log('');

// Start the cron job
console.log('Starting cron job...');
const job = conversionRateCron.start();

// Get status
const status = conversionRateCron.getStatus();
console.log(`Status: ${status.isRunning ? '✅ Running' : '❌ Not Running'}`);
console.log(`Schedule: ${status.schedule}`);
console.log('');

console.log('The cron job will:');
console.log('  - Run every 5 minutes');
console.log('  - Update rates from CoinGecko API');
console.log('  - Only update if auto mode is enabled');
console.log('  - Skip updates if auto mode is disabled');
console.log('');

console.log('To test the update function manually, run:');
console.log('  npm run test:cron');
console.log('');

console.log('='.repeat(60));
console.log('Cron job started successfully!');
console.log('='.repeat(60));

// Keep the process alive to see the cron job run
console.log('\nCron job is running. Press Ctrl+C to stop.\n');

// Show when the next run will be
setTimeout(() => {
  console.log('\n⏰ Next scheduled update will run in approximately 5 minutes...');
}, 1000);

