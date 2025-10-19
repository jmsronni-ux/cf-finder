// Crypto conversion utility to convert all currencies to USDT/USD equivalent
import ConversionRate from '../models/conversion-rate.model.js';

// Default fallback conversion rates
const DEFAULT_CONVERSION_RATES = {
  BTC: 45000,
  ETH: 3000,
  TRON: 0.1,
  USDT: 1,
  BNB: 300,
  SOL: 100
};

// In-memory cache for conversion rates
let CACHED_RATES = null;
let CACHE_TIMESTAMP = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Fetch conversion rates from database with caching
 * @returns {Promise<Object>} - Conversion rates object
 */
async function fetchConversionRates() {
  // Check if cache is valid
  if (CACHED_RATES && CACHE_TIMESTAMP && (Date.now() - CACHE_TIMESTAMP < CACHE_TTL)) {
    return CACHED_RATES;
  }
  
  try {
    const rates = await ConversionRate.find({});
    
    if (rates.length === 0) {
      console.log('[Crypto Conversion] No rates in database, using defaults');
      CACHED_RATES = { ...DEFAULT_CONVERSION_RATES };
    } else {
      // Convert array to object
      CACHED_RATES = {};
      rates.forEach(rate => {
        CACHED_RATES[rate.network] = rate.rateToUSD;
      });
      console.log('[Crypto Conversion] Loaded rates from database:', CACHED_RATES);
    }
    
    CACHE_TIMESTAMP = Date.now();
    return CACHED_RATES;
  } catch (error) {
    console.error('[Crypto Conversion] Error fetching rates, using defaults:', error);
    return { ...DEFAULT_CONVERSION_RATES };
  }
}

/**
 * Convert a crypto amount to USD equivalent
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - The currency to convert from (BTC, ETH, etc.)
 * @param {Object} conversionRates - Optional pre-fetched conversion rates
 * @returns {number} - The USD equivalent amount
 */
export const convertToUSD = (amount, fromCurrency, conversionRates = null) => {
  if (!amount || amount <= 0) return 0;
  
  const rates = conversionRates || DEFAULT_CONVERSION_RATES;
  const rate = rates[fromCurrency];
  
  if (!rate) {
    console.warn(`Unknown currency: ${fromCurrency}`);
    return 0;
  }
  
  return amount * rate;
};

/**
 * Convert a crypto amount to USDT equivalent (alias for backward compatibility)
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - The currency to convert from (BTC, ETH, etc.)
 * @param {Object} conversionRates - Optional pre-fetched conversion rates
 * @returns {number} - The USDT equivalent amount
 */
export const convertToUSDT = (amount, fromCurrency, conversionRates = null) => {
  return convertToUSD(amount, fromCurrency, conversionRates);
};

/**
 * Convert multiple crypto amounts to USD equivalent and calculate total
 * @param {Object} rewards - Object with network rewards { BTC: 0.1, ETH: 1, USDT: 11, ... }
 * @param {Object} conversionRates - Optional pre-fetched conversion rates
 * @returns {Object} - { totalUSDT: number, breakdown: Object }
 */
export const convertRewardsToUSD = (rewards, conversionRates = null) => {
  const breakdown = {};
  let totalUSDT = 0;
  
  Object.entries(rewards).forEach(([network, amount]) => {
    const usdAmount = convertToUSD(amount, network, conversionRates);
    breakdown[network] = {
      original: amount,
      usd: usdAmount,
      usdt: usdAmount // Alias for backward compatibility
    };
    totalUSDT += usdAmount;
  });
  
  return {
    totalUSDT,
    totalUSD: totalUSDT,
    breakdown
  };
};

/**
 * Convert multiple crypto amounts to USDT equivalent and calculate total (alias for backward compatibility)
 * @param {Object} rewards - Object with network rewards { BTC: 0.1, ETH: 1, USDT: 11, ... }
 * @param {Object} conversionRates - Optional pre-fetched conversion rates
 * @returns {Object} - { totalUSDT: number, breakdown: Object }
 */
export const convertRewardsToUSDT = (rewards, conversionRates = null) => {
  return convertRewardsToUSD(rewards, conversionRates);
};

/**
 * Get current conversion rates (fetches from database with cache)
 * @returns {Promise<Object>} - Current conversion rates
 */
export const getConversionRates = async () => {
  return await fetchConversionRates();
};

/**
 * Clear the conversion rates cache (forces fresh DB fetch on next request)
 */
export const clearConversionRatesCache = () => {
  CACHED_RATES = null;
  CACHE_TIMESTAMP = null;
  console.log('[Crypto Conversion] Cache cleared');
};

export { fetchConversionRates };

export default {
  convertToUSD,
  convertToUSDT,
  convertRewardsToUSD,
  convertRewardsToUSDT,
  getConversionRates,
  clearConversionRatesCache,
  fetchConversionRates
};
