# Conversion Rate Cron Job Implementation

## Overview

A scheduled cron job has been implemented to automatically update conversion rates from CoinGecko API every 5 minutes when auto mode is enabled. This ensures rates stay current even when no one is viewing the admin panel.

## How It Works

### Automatic Updates
- **Schedule**: Runs every 5 minutes (`*/5 * * * *`)
- **Condition**: Only updates when `isAuto` is `true` for at least one rate
- **Source**: Fetches real-time rates from CoinGecko API
- **Behavior**: 
  - Updates existing rates in the database
  - Creates missing rates if they don't exist (upsert)
  - Skips updates if auto mode is disabled
  - Clears cache after updating

### Startup Behavior
- Cron job starts automatically when the server starts
- Waits 2 seconds after database connection to ensure DB is ready
- Runs an initial update immediately on startup
- Continues running every 5 minutes thereafter

## Files Created/Modified

### New Files
1. **`backend/services/conversion-rate-cron.service.js`**
   - Main cron job service
   - Handles scheduling and rate updates
   - Exports functions: `start()`, `stop()`, `getStatus()`, `updateNow()`

2. **`backend/scripts/test-conversion-rate-cron.js`**
   - Test script to verify cron job functionality
   - Tests rate updates and verifies changes

3. **`backend/scripts/verify-cron-running.js`**
   - Simple script to check if cron job is running

### Modified Files
1. **`backend/app.js`**
   - Added import for conversion rate cron service
   - Starts cron job on server startup

2. **`backend/package.json`**
   - Added `node-cron` dependency
   - Added `test:cron` script

## Testing

### Test the Cron Job

1. **Run the test script:**
   ```bash
   cd backend
   npm run test:cron
   ```

2. **Verify cron is running:**
   ```bash
   node scripts/verify-cron-running.js
   ```

3. **Manual test via server:**
   - Start the server: `npm start` or `npm run dev`
   - Check console logs for: `[Conversion Rate Cron] Scheduled job started`
   - Wait 5 minutes and check logs for update messages
   - Or manually trigger: The cron service runs an initial update on startup

### Expected Behavior

**When Auto Mode is Enabled:**
- Cron job runs every 5 minutes
- Rates are fetched from CoinGecko
- Database is updated with new rates
- Cache is cleared
- Console logs show: `[Conversion Rate Cron] Successfully updated X conversion rates`

**When Auto Mode is Disabled:**
- Cron job still runs every 5 minutes
- But skips updates (logs: `Auto mode is disabled, skipping update`)
- No database changes occur

**When No Rates Exist:**
- Cron job skips update (logs: `No rates found in database, skipping update`)
- Rates should be initialized through admin panel first

## Console Logs

You'll see these logs when the cron job runs:

```
[Conversion Rate Cron] Scheduled job started - will update rates every 5 minutes
[Conversion Rate Cron] Starting scheduled rate update...
[Conversion Rate Cron] Successfully updated 6 conversion rates: BTC: $45000, ETH: $3000, ...
```

Or if auto mode is disabled:
```
[Conversion Rate Cron] Auto mode is disabled, skipping update
```

## API Endpoints

The cron job doesn't expose any API endpoints. It runs automatically in the background.

However, you can manually trigger an update by calling the service function:
```javascript
import conversionRateCron from './services/conversion-rate-cron.service.js';
await conversionRateCron.updateNow();
```

## Configuration

- **Schedule**: Currently set to `*/5 * * * *` (every 5 minutes)
- **Timezone**: UTC
- **Can be modified**: Edit `backend/services/conversion-rate-cron.service.js` line 82

## Benefits

1. ✅ **Always Up-to-Date**: Rates update automatically every 5 minutes
2. ✅ **Background Operation**: Works even when admin panel is closed
3. ✅ **Efficient**: Only updates when auto mode is enabled
4. ✅ **Reliable**: Handles errors gracefully, continues running
5. ✅ **Cache Management**: Automatically clears cache after updates

## Troubleshooting

**Cron job not running:**
- Check server logs for startup messages
- Verify database connection is working
- Check if rates exist in database

**Rates not updating:**
- Verify auto mode is enabled in admin panel
- Check CoinGecko API is accessible
- Review console logs for errors

**Test script fails:**
- Ensure MongoDB is running and accessible
- Check `.env` file has correct `MONGODB_URI`
- Verify rates exist in database (initialize through admin panel)

## Future Enhancements

Possible improvements:
- Configurable schedule via environment variable
- Email notifications on update failures
- Rate change alerts (if rate changes significantly)
- Metrics/logging for monitoring

