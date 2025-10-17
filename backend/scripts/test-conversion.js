import { convertRewardsToUSDT } from '../utils/crypto-conversion.js';

// Test with the test user's actual rewards
const testUserRewards = {
  BTC: 0.1,
  ETH: 1,
  TRON: 1,
  USDT: 11,
  BNB: 1,
  SOL: 1
};

console.log('Testing conversion with user rewards:', testUserRewards);

const result = convertRewardsToUSDT(testUserRewards);

console.log('Conversion result:', result);
console.log('Total USDT:', result.totalUSDT);
console.log('Breakdown:', result.breakdown);

// Expected calculation:
// BTC: 0.1 * 45000 = 4500
// ETH: 1 * 3000 = 3000
// TRON: 1 * 0.1 = 0.1
// USDT: 11 * 1 = 11
// BNB: 1 * 300 = 300
// SOL: 1 * 100 = 100
// Total: 4500 + 3000 + 0.1 + 11 + 300 + 100 = 7911.1

console.log('\nExpected total: 7911.1 USDT');
console.log('Actual total:', result.totalUSDT);
console.log('Match:', result.totalUSDT === 7911.1);
