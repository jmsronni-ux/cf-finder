/**
 * Crypto Conversion Utilities
 * Converts between USDT and cryptocurrency amounts using conversion rates
 */

export interface ConversionRates {
  [network: string]: number;
}

/**
 * Convert USDT amount to cryptocurrency amount
 * @param usdtAmount - Amount in USDT
 * @param network - Network/cryptocurrency (BTC, ETH, etc.)
 * @param rates - Conversion rates object
 * @returns Cryptocurrency amount
 */
export const convertUSDTToCrypto = (
  usdtAmount: number,
  network: string,
  rates: ConversionRates
): number => {
  if (!usdtAmount || usdtAmount <= 0) return 0;
  
  const rate = rates[network];
  if (!rate || rate <= 0) {
    console.warn(`Invalid or missing conversion rate for ${network}`);
    return 0;
  }
  
  // USDT / rate = crypto amount
  // Example: 100 USDT / 45000 (BTC rate) = 0.00222 BTC
  return usdtAmount / rate;
};

/**
 * Convert cryptocurrency amount to USDT
 * @param cryptoAmount - Amount in cryptocurrency
 * @param network - Network/cryptocurrency (BTC, ETH, etc.)
 * @param rates - Conversion rates object
 * @returns USDT amount
 */
export const convertCryptoToUSDT = (
  cryptoAmount: number,
  network: string,
  rates: ConversionRates
): number => {
  if (!cryptoAmount || cryptoAmount <= 0) return 0;
  
  const rate = rates[network];
  if (!rate || rate <= 0) {
    console.warn(`Invalid or missing conversion rate for ${network}`);
    return 0;
  }
  
  // crypto amount * rate = USDT
  // Example: 0.001 BTC * 45000 = 45 USDT
  return cryptoAmount * rate;
};

/**
 * Get formatted crypto amount with appropriate decimal places
 * @param amount - Crypto amount
 * @param network - Network/cryptocurrency
 * @returns Formatted string with appropriate decimals
 */
export const formatCryptoAmount = (amount: number, network: string): string => {
  if (amount === 0) return '0';
  
  // Different cryptocurrencies need different decimal precision
  const decimals: { [key: string]: number } = {
    BTC: 8,
    ETH: 6,
    TRON: 4,
    USDT: 2,
    BNB: 6,
    SOL: 6
  };
  
  const precision = decimals[network] || 8;
  return amount.toFixed(precision);
};

/**
 * Get formatted USDT amount
 * @param amount - USDT amount
 * @returns Formatted string with 2 decimal places
 */
export const formatUSDTAmount = (amount: number): string => {
  if (amount === 0) return '0';
  return amount.toFixed(2);
};

/**
 * Convert all network rewards from USDT to crypto amounts
 * @param usdtRewards - Object with USDT amounts per network
 * @param rates - Conversion rates object
 * @returns Object with crypto amounts per network
 */
export const convertAllUSDTToCrypto = (
  usdtRewards: { [network: string]: number },
  rates: ConversionRates
): { [network: string]: number } => {
  const cryptoRewards: { [network: string]: number } = {};
  
  Object.entries(usdtRewards).forEach(([network, usdtAmount]) => {
    cryptoRewards[network] = convertUSDTToCrypto(usdtAmount, network, rates);
  });
  
  return cryptoRewards;
};

/**
 * Convert all network rewards from crypto to USDT amounts
 * @param cryptoRewards - Object with crypto amounts per network
 * @param rates - Conversion rates object
 * @returns Object with USDT amounts per network
 */
export const convertAllCryptoToUSDT = (
  cryptoRewards: { [network: string]: number },
  rates: ConversionRates
): { [network: string]: number } => {
  const usdtRewards: { [network: string]: number } = {};
  
  Object.entries(cryptoRewards).forEach(([network, cryptoAmount]) => {
    usdtRewards[network] = convertCryptoToUSDT(cryptoAmount, network, rates);
  });
  
  return usdtRewards;
};

