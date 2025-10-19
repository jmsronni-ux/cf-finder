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
 * Distributes network rewards among fingerprint nodes
 * @param {Object} levelData - The level data from database (with nodes and edges)
 * @param {Object} userNetworkRewards - User's network rewards object (e.g., { BTC: 0.1, ETH: 1.0, ... })
 * @returns {Object} Modified level data with updated transaction amounts
 */
export function distributeNetworkRewards(levelData, userNetworkRewards = {}) {
  // Deep clone level data to avoid mutations
  const clonedData = JSON.parse(JSON.stringify(levelData));
  
  if (!clonedData.nodes || clonedData.nodes.length === 0) {
    return clonedData;
  }
  
  // Group fingerprint nodes by currency
  const nodesByCurrency = {};
  
  clonedData.nodes.forEach((node, index) => {
    // Only process fingerprint nodes with transaction data
    if (node.type === 'fingerprintNode' && node.data && node.data.transaction) {
      const currency = node.data.transaction.currency;
      const normalizedCurrency = normalizeCurrency(currency);
      
      if (!nodesByCurrency[normalizedCurrency]) {
        nodesByCurrency[normalizedCurrency] = [];
      }
      
      nodesByCurrency[normalizedCurrency].push({
        nodeIndex: index,
        originalAmount: node.data.transaction.amount
      });
    }
  });
  
  // Distribute rewards for each currency
  Object.keys(nodesByCurrency).forEach(currency => {
    const nodes = nodesByCurrency[currency];
    const totalReward = userNetworkRewards[currency] || 0;
    
    if (totalReward > 0 && nodes.length > 0) {
      // Generate random weights for distribution
      const weights = generateRandomWeights(nodes.length);
      
      // Distribute the total reward according to weights
      nodes.forEach((nodeInfo, i) => {
        const distributedAmount = totalReward * weights[i];
        
        // Round to appropriate decimal places based on currency
        let roundedAmount;
        if (currency === 'BTC' || currency === 'ETH' || currency === 'BNB' || currency === 'SOL') {
          // Cryptocurrencies: round to 4 decimal places
          roundedAmount = Math.round(distributedAmount * 10000) / 10000;
        } else {
          // USDT, TRON: round to 2 decimal places
          roundedAmount = Math.round(distributedAmount * 100) / 100;
        }
        
        // Ensure amount is at least 0.0001 for crypto or 0.01 for others if total > 0
        if (roundedAmount === 0 && totalReward > 0) {
          if (currency === 'BTC' || currency === 'ETH' || currency === 'BNB' || currency === 'SOL') {
            roundedAmount = 0.0001;
          } else {
            roundedAmount = 0.01;
          }
        }
        
        // Update the node's transaction amount
        clonedData.nodes[nodeInfo.nodeIndex].data.transaction.amount = roundedAmount;
      });
      
      // Verify total (for debugging)
      const distributedTotal = nodes.reduce((sum, nodeInfo) => {
        return sum + clonedData.nodes[nodeInfo.nodeIndex].data.transaction.amount;
      }, 0);
      
      console.log(`[Level Distribution] ${currency}: Total reward ${totalReward}, Distributed ${distributedTotal.toFixed(4)} across ${nodes.length} nodes`);
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

