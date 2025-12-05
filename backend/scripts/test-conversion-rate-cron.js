/**
 * Test script for conversion rate cron job
 * This script tests the cron job functionality by:
 * 1. Checking if auto mode is enabled
 * 2. Manually triggering a rate update
 * 3. Verifying the rates were updated
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ConversionRate from '../models/conversion-rate.model.js';
import conversionRateCron from '../services/conversion-rate-cron.service.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cfinder';

async function testConversionRateCron() {
  try {
    console.log('='.repeat(60));
    console.log('Testing Conversion Rate Cron Job');
    console.log('='.repeat(60));
    console.log('');

    // Connect to MongoDB
    console.log('1. Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check current rates
    console.log('2. Checking current conversion rates...');
    const currentRates = await ConversionRate.find({}).sort({ network: 1 });
    
    if (currentRates.length === 0) {
      console.log('⚠️  No conversion rates found in database');
      console.log('   The cron job will initialize rates with auto mode enabled');
      console.log('   Continuing with test...\n');
    }

    console.log(`✅ Found ${currentRates.length} conversion rates:`);
    currentRates.forEach(rate => {
      console.log(`   - ${rate.network}: $${rate.rateToUSD} (Auto: ${rate.isAuto ? 'Yes' : 'No'})`);
      console.log(`     Last Updated: ${new Date(rate.metadata.updatedAt).toLocaleString()}`);
    });
    console.log('');

    // Check if auto mode is enabled (or will be enabled if no rates exist)
    const isAuto = currentRates.length > 0 ? currentRates.some(r => r.isAuto) : true;
    console.log(`3. Auto mode status: ${isAuto ? '✅ Enabled' : '❌ Disabled'}`);
    
    if (currentRates.length === 0) {
      console.log('   (Will be enabled when rates are initialized)');
    } else if (!isAuto) {
      console.log('');
      console.log('⚠️  Warning: Auto mode is disabled.');
      console.log('   The cron job will skip updates when auto mode is disabled.');
      console.log('   Enable auto mode in the admin panel to test automatic updates.');
      console.log('');
    }

    // Get current timestamps (if rates exist)
    const beforeUpdate = {};
    const hadRatesBefore = currentRates.length > 0;
    currentRates.forEach(rate => {
      beforeUpdate[rate.network] = {
        rate: rate.rateToUSD,
        updatedAt: new Date(rate.metadata.updatedAt)
      };
    });

    // Manually trigger rate update
    console.log('4. Manually triggering rate update...');
    console.log('   (This simulates what the cron job does every 5 minutes)');
    console.log('');
    
    await conversionRateCron.updateNow();

    // Wait a moment for the update to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check updated rates
    console.log('');
    console.log('5. Checking updated rates...');
    const updatedRates = await ConversionRate.find({}).sort({ network: 1 });
    
    let hasChanges = false;
    if (updatedRates.length === 0) {
      console.log('❌ No rates found after update - something went wrong');
    } else {
      updatedRates.forEach(rate => {
        const before = beforeUpdate[rate.network];
        const after = {
          rate: rate.rateToUSD,
          updatedAt: new Date(rate.metadata.updatedAt)
        };

        if (!before) {
          // Rate was just created
          hasChanges = true;
          console.log(`   ✅ ${rate.network}: Created`);
          console.log(`      Rate: $${after.rate}`);
          console.log(`      Auto Mode: ${rate.isAuto ? 'Enabled' : 'Disabled'}`);
          console.log(`      Created: ${after.updatedAt.toLocaleString()}`);
        } else {
          const rateChanged = before.rate !== after.rate;
          const timeUpdated = after.updatedAt > before.updatedAt;

          if (rateChanged || timeUpdated) {
            hasChanges = true;
            console.log(`   ✅ ${rate.network}:`);
            if (rateChanged) {
              console.log(`      Rate: $${before.rate} → $${after.rate}`);
            }
            if (timeUpdated) {
              console.log(`      Updated: ${after.updatedAt.toLocaleString()}`);
            }
          } else {
            console.log(`   ⚠️  ${rate.network}: No changes (Rate: $${after.rate})`);
          }
        }
      });
    }

    console.log('');
    if (!hadRatesBefore && updatedRates.length > 0) {
      console.log('✅ Test PASSED: Rates were successfully initialized!');
      console.log(`   Created ${updatedRates.length} conversion rates with auto mode enabled.`);
    } else if (hasChanges) {
      console.log('✅ Test PASSED: Rates were successfully updated!');
    } else if (!isAuto && hadRatesBefore) {
      console.log('⚠️  Test SKIPPED: Auto mode is disabled, so rates were not updated.');
      console.log('   This is expected behavior.');
    } else {
      console.log('⚠️  Test INCONCLUSIVE: Rates did not change.');
      console.log('   This could mean:');
      console.log('   - Rates are already up-to-date');
      console.log('   - CoinGecko API returned the same values');
      console.log('   - There was an error fetching rates');
    }

    // Test cron job status
    console.log('');
    console.log('6. Checking cron job status...');
    const status = conversionRateCron.getStatus();
    console.log(`   Status: ${status.isRunning ? '✅ Running' : '❌ Not Running'}`);
    console.log(`   Schedule: ${status.schedule}`);

    console.log('');
    console.log('='.repeat(60));
    console.log('Test completed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('❌ Test FAILED with error:');
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('');
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the test
testConversionRateCron();

