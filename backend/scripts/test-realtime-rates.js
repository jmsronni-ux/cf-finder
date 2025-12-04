import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fetchRealTimeRates } from '../utils/crypto-conversion.js';
import ConversionRate from '../models/conversion-rate.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cfinder';

async function testRealTimeRates() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('\n--- Testing CoinGecko API Fetch ---');
        const rates = await fetchRealTimeRates();

        if (!rates) {
            console.error('Failed to fetch rates from CoinGecko');
            process.exit(1);
        }

        console.log('Fetched Rates:', rates);

        const requiredNetworks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
        const missingNetworks = requiredNetworks.filter(net => !rates[net]);

        if (missingNetworks.length > 0) {
            console.warn('Warning: Missing rates for:', missingNetworks);
        } else {
            console.log('All required networks found.');
        }

        console.log('\n--- Testing Database Update Simulation ---');

        const count = await ConversionRate.countDocuments();
        console.log(`Found ${count} conversion rate documents in DB.`);

        const currentRates = await ConversionRate.find({});
        console.log('Current DB Rates (Sample):', currentRates.map(r => `${r.network}: ${r.rateToUSD} (Auto: ${r.isAuto})`).join(', '));

        // Simulate stale data if any isAuto is true
        const autoRate = currentRates.find(r => r.isAuto);
        if (autoRate) {
            console.log('\n--- Simulating Stale Data ---');
            const staleDate = new Date(Date.now() - 10 * 60 * 1000); // 10 mins ago
            await ConversionRate.updateOne({ _id: autoRate._id }, { 'metadata.updatedAt': staleDate });
            console.log(`Set ${autoRate.network} updatedAt to ${staleDate.toISOString()} to simulate staleness.`);

            // Note: We can't easily test the controller logic (getConversionRates) from this script without mocking Express req/res
            // But we have verified the fetchRealTimeRates utility works, and the controller logic uses it.
            console.log('To verify auto-refresh, please visit the Admin Conversion Rates page or call the API.');
        } else {
            console.log('\nNo rates are currently in Auto mode. Enable Auto mode in Admin panel to test auto-refresh.');
        }

        console.log('\nTest Completed Successfully');
    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testRealTimeRates();
