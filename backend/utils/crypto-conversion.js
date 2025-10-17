// Crypto conversion utility to convert all currencies to USDT equivalent

// Current conversion rates (these should be updated regularly or fetched from an API)
const CONVERSION_RATES = {
  BTC: 45000,    // 1 BTC = 45000 USDT
  ETH: 3000,     // 1 ETH = 3000 USDT
  TRON: 0.1,     // 1 TRON = 0.1 USDT
  USDT: 1,       // 1 USDT = 1 USDT
  BNB: 300,      // 1 BNB = 300 USDT
  SOL: 100       // 1 SOL = 100 USDT
};

/**
 * Convert a crypto amount to USDT equivalent
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - The currency to convert from (BTC, ETH, etc.)
 * @returns {number} - The USDT equivalent amount
 */
export const convertToUSDT = (amount, fromCurrency) => {
  if (!amount || amount <= 0) return 0;
  
  const rate = CONVERSION_RATES[fromCurrency];
  if (!rate) {
    console.warn(`Unknown currency: ${fromCurrency}`);
    return 0;
  }
  
  return amount * rate;
};

/**
 * Convert multiple crypto amounts to USDT equivalent and calculate total
 * @param {Object} rewards - Object with network rewards { BTC: 0.1, ETH: 1, USDT: 11, ... }
 * @returns {Object} - { totalUSDT: number, breakdown: Object }
 */
export const convertRewardsToUSDT = (rewards) => {
  const breakdown = {};
  let totalUSDT = 0;
  
  Object.entries(rewards).forEach(([network, amount]) => {
    const usdtAmount = convertToUSDT(amount, network);
    breakdown[network] = {
      original: amount,
      usdt: usdtAmount
    };
    totalUSDT += usdtAmount;
  });
  
  return {
    totalUSDT,
    breakdown
  };
};

/**
 * Get current conversion rates
 * @returns {Object} - Current conversion rates
 */
export const getConversionRates = () => {
  return { ...CONVERSION_RATES };
};

/**
 * Update conversion rates (for admin use)
 * @param {Object} newRates - New conversion rates
 */
export const updateConversionRates = (newRates) => {
  Object.assign(CONVERSION_RATES, newRates);
  console.log('Conversion rates updated:', CONVERSION_RATES);
};

export default {
  convertToUSDT,
  convertRewardsToUSDT,
  getConversionRates,
  updateConversionRates
};
