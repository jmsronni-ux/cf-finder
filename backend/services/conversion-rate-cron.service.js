import cron from 'node-cron';
import ConversionRate from '../models/conversion-rate.model.js';
import { fetchRealTimeRates, clearConversionRatesCache } from '../utils/crypto-conversion.js';

let cronJob = null;

/**
 * Update conversion rates from CoinGecko API
 * Only updates if auto mode is enabled
 */
async function updateConversionRates() {
  try {
    console.log('[Conversion Rate Cron] Starting scheduled rate update...');
    
    // Check current rates and auto mode status
    const rates = await ConversionRate.find({});
    const isAuto = rates.length > 0 ? rates.some(r => r.isAuto) : false;
    
    // If no rates exist, we'll create them with auto mode enabled
    // If rates exist but auto mode is disabled, skip update
    if (!isAuto && rates.length > 0) {
      console.log('[Conversion Rate Cron] Auto mode is disabled, skipping update');
      return;
    }

    // Fetch real-time rates from CoinGecko
    const realTimeRates = await fetchRealTimeRates();

    if (!realTimeRates || Object.keys(realTimeRates).length === 0) {
      console.error('[Conversion Rate Cron] Failed to fetch real-time rates from CoinGecko');
      return;
    }

    // If no rates exist, initialize them with auto mode enabled
    if (rates.length === 0) {
      console.log('[Conversion Rate Cron] No rates found, initializing with real-time rates and auto mode enabled');
    }

    // Update each rate in the database (create if doesn't exist)
    const results = [];
    for (const [network, rateToUSD] of Object.entries(realTimeRates)) {
      try {
        const rate = await ConversionRate.findOneAndUpdate(
          { network },
          {
            network,
            rateToUSD,
            isAuto: true, // Ensure auto mode is set
            $set: {
              'metadata.updatedAt': new Date()
            },
            $setOnInsert: {
              'metadata.createdAt': new Date()
            }
          },
          { 
            upsert: true, // Create if doesn't exist
            new: true 
          }
        );
        
        if (rate) {
          results.push({ network, rateToUSD });
        }
      } catch (error) {
        console.error(`[Conversion Rate Cron] Error updating ${network}:`, error);
      }
    }

    // Clear cache since we updated DB
    clearConversionRatesCache();

    console.log(`[Conversion Rate Cron] Successfully updated ${results.length} conversion rates:`, 
      results.map(r => `${r.network}: $${r.rateToUSD}`).join(', '));
  } catch (error) {
    console.error('[Conversion Rate Cron] Error updating conversion rates:', error);
  }
}

/**
 * Start the cron job to update conversion rates every 5 minutes
 */
export function startConversionRateCron() {
  // Stop existing job if any
  if (cronJob) {
    cronJob.stop();
  }

  // Schedule job to run every 5 minutes
  // Cron format: '*/5 * * * *' means "every 5 minutes"
  cronJob = cron.schedule('*/5 * * * *', async () => {
    await updateConversionRates();
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('[Conversion Rate Cron] Scheduled job started - will update rates every 5 minutes');
  
  // Run immediately on startup to get fresh rates
  updateConversionRates().catch(error => {
    console.error('[Conversion Rate Cron] Error in initial rate update:', error);
  });

  return cronJob;
}

/**
 * Stop the cron job
 */
export function stopConversionRateCron() {
  if (cronJob) {
    cronJob.stop();
    console.log('[Conversion Rate Cron] Scheduled job stopped');
    cronJob = null;
  }
}

/**
 * Get the current cron job status
 */
export function getCronJobStatus() {
  return {
    isRunning: cronJob !== null && cronJob.running !== false,
    schedule: '*/5 * * * * (every 5 minutes)'
  };
}

export default {
  start: startConversionRateCron,
  stop: stopConversionRateCron,
  getStatus: getCronJobStatus,
  updateNow: updateConversionRates
};

