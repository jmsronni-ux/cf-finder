import { convertRewardsToUSDT } from '../utils/crypto-conversion.js';

// Test with the exact same data from the database
const testUserRewards = {
  BNB: 1,
  BTC: 0.1,
  ETH: 1,
  SOL: 1,
  TRON: 1,
  USDT: 11
};

console.log('=== Testing Backend Conversion Function ===');
console.log('Input rewards:', testUserRewards);

try {
  const result = convertRewardsToUSDT(testUserRewards);
  console.log('Conversion result:', result);
  console.log('Total USDT:', result.totalUSDT);
  console.log('Breakdown:', result.breakdown);
  
  if (result.totalUSDT === 7911.1) {
    console.log('✅ Conversion working correctly!');
  } else {
    console.log('❌ Conversion not working - expected 7911.1, got', result.totalUSDT);
  }
} catch (error) {
  console.error('❌ Error in conversion function:', error);
}
