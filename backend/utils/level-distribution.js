/**
 * Utility for distributing user-specific network rewards across fingerprint nodes in level animations
 */

/**
 * Maps currency codes between different formats used in the system
 */
const CURRENCY_MAP = {
  'TRX': 'TRON',
  'TRON': 'TRON'
};

/**
 * Normalizes currency code to match user model format
 */
function normalizeCurrency(currency) {
  return CURRENCY_MAP[currency] || currency;
}

/**
 * Generates random distribution weights that sum to 1
 * @param {number} count - Number of weights to generate
 * @returns {number[]} Array of weights that sum to 1
 */
function generateRandomWeights(count) {
  if (count === 0) return [];
  if (count === 1) return [1];
  
  // Generate random numbers
  const randoms = [];
  for (let i = 0; i < count - 1; i++) {
    randoms.push(Math.random());
  }
  
  // Add boundaries
  randoms.push(0);
  randoms.push(1);
  
  // Sort
  randoms.sort((a, b) => a - b);
  
  // Calculate weights as differences
  const weights = [];
  for (let i = 0; i < count; i++) {
    weights.push(randoms[i + 1] - randoms[i]);
  }
  
  return weights;
}

/**
 * Distributes network rewards among fingerprint nodes with Success status
 * @param {Object} levelData - The level data from database (with nodes and edges)
 * @param {Object} userNetworkRewards - User's network rewards object (e.g., { BTC: 0.1, ETH: 1.0, ... })
 * @param {Object} conversionRates - Conversion rates for crypto to USD (e.g., { BTC: 45000, ETH: 3000, ... })
 * @returns {Object} Modified level data with updated transaction amounts in USD
 */
export function distributeNetworkRewards(levelData, userNetworkRewards = {}, conversionRates = {}) {
  // Deep clone level data to avoid mutations
  const clonedData = JSON.parse(JSON.stringify(levelData));
  
  if (!clonedData.nodes || clonedData.nodes.length === 0) {
    return clonedData;
  }
  
  // Group fingerprint nodes by currency (ONLY SUCCESS STATUS)
  const nodesByCurrency = {};
  
  clonedData.nodes.forEach((node, index) => {
    // Only process fingerprint nodes with transaction data AND Success status
    if (node.type === 'fingerprintNode' && 
        node.data && 
        node.data.transaction && 
        node.data.transaction.status === 'Success') {
      
      const currency = node.data.transaction.currency;
      const normalizedCurrency = normalizeCurrency(currency);
      
      if (!nodesByCurrency[normalizedCurrency]) {
        nodesByCurrency[normalizedCurrency] = [];
      }
      
      nodesByCurrency[normalizedCurrency].push({
        nodeIndex: index,
        originalAmount: node.data.transaction.amount,
        status: node.data.transaction.status
      });
    }
  });
  
  // Distribute rewards for each currency (converted to USD)
  Object.keys(nodesByCurrency).forEach(currency => {
    const nodes = nodesByCurrency[currency];
    const cryptoReward = userNetworkRewards[currency] || 0;
    
    if (cryptoReward > 0 && nodes.length > 0) {
      // Convert crypto amount to USD
      const conversionRate = conversionRates[currency] || 1;
      const totalUSDReward = cryptoReward * conversionRate;
      
      // Generate random weights for distribution
      const weights = generateRandomWeights(nodes.length);
      
      // Distribute the USD reward according to weights
      nodes.forEach((nodeInfo, i) => {
        const distributedUSD = totalUSDReward * weights[i];
        
        // Round to 2 decimal places for USD
        let roundedAmount = Math.round(distributedUSD * 100) / 100;
        
        // Ensure amount is at least 0.01 USD if total > 0
        if (roundedAmount === 0 && totalUSDReward > 0) {
          roundedAmount = 0.01;
        }
        
        // Update the node's transaction amount (in USD)
        clonedData.nodes[nodeInfo.nodeIndex].data.transaction.amount = roundedAmount;
      });
      
      // Verify total (for debugging)
      const distributedTotal = nodes.reduce((sum, nodeInfo) => {
        return sum + clonedData.nodes[nodeInfo.nodeIndex].data.transaction.amount;
      }, 0);
      
      console.log(`[Level Distribution] ${currency}: ${cryptoReward} ${currency} @ $${conversionRate} = $${totalUSDReward.toFixed(2)} USD → Distributed $${distributedTotal.toFixed(2)} across ${nodes.length} Success nodes`);
    } else if (nodes.length > 0) {
      // If no reward, set all amounts to 0
      nodes.forEach(nodeInfo => {
        clonedData.nodes[nodeInfo.nodeIndex].data.transaction.amount = 0;
      });
    }
  });
  
  return clonedData;
}

/**
 * Gets user network rewards for a specific level
 * @param {Object} user - User document from database
 * @param {number} levelNumber - Level number (1-5)
 * @returns {Object} Network rewards object for the level
 */
export function getUserNetworkRewardsForLevel(user, levelNumber) {
  if (!user || levelNumber < 1 || levelNumber > 5) {
    return {};
  }
  
  const rewardsField = `lvl${levelNumber}NetworkRewards`;
  return user[rewardsField] || {};
}

