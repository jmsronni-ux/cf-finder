/**
 * Wallet address validation utilities for backend
 */

/**
 * Validates a Bitcoin address (Legacy, P2SH, Bech32, and Bech32m formats)
 */
export const validateBitcoinAddress = (address) => {
  if (!address || typeof address !== 'string') return false;
  
  // Trim whitespace
  address = address.trim();
  
  // Legacy addresses (P2PKH): Start with 1
  const legacyRegex = /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  
  // P2SH addresses: Start with 3
  const p2shRegex = /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  
  // Bech32 (Native SegWit): Start with bc1q
  const bech32Regex = /^bc1[a-z0-9]{39,87}$/;
  
  // Bech32m (Taproot): Start with bc1p
  const bech32mRegex = /^bc1p[a-z0-9]{58}$/;
  
  return (
    legacyRegex.test(address) ||
    p2shRegex.test(address) ||
    bech32Regex.test(address) ||
    bech32mRegex.test(address)
  );
};

/**
 * Validates an Ethereum address (also valid for USDT ERC-20)
 */
export const validateEthereumAddress = (address) => {
  if (!address || typeof address !== 'string') return false;
  
  // Trim whitespace
  address = address.trim();
  
  // Must start with 0x and be 42 characters long (0x + 40 hex chars)
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  
  return ethRegex.test(address);
};

/**
 * Validates a Tron address (TRX)
 */
export const validateTronAddress = (address) => {
  if (!address || typeof address !== 'string') return false;
  
  // Trim whitespace
  address = address.trim();
  
  // Must start with T and be 34 characters long
  const tronRegex = /^T[a-km-zA-HJ-NP-Z1-9]{33}$/;
  
  return tronRegex.test(address);
};

/**
 * Validates a wallet address based on the network type
 */
export const validateWalletAddress = (address, network) => {
  if (!address || !address.trim()) {
    return { isValid: false, error: 'Wallet address is required' };
  }

  const trimmedAddress = address.trim();

  switch (network) {
    case 'btc':
      if (!validateBitcoinAddress(trimmedAddress)) {
        return { 
          isValid: false, 
          error: 'Invalid Bitcoin address. Please enter a valid BTC address (starting with 1, 3, or bc1)' 
        };
      }
      break;

    case 'eth':
      if (!validateEthereumAddress(trimmedAddress)) {
        return { 
          isValid: false, 
          error: 'Invalid Ethereum address. Please enter a valid ETH address (starting with 0x)' 
        };
      }
      break;

    case 'tron':
      if (!validateTronAddress(trimmedAddress)) {
        return { 
          isValid: false, 
          error: 'Invalid Tron address. Please enter a valid TRX address (starting with T)' 
        };
      }
      break;

    case 'usdtErc20':
      if (!validateEthereumAddress(trimmedAddress)) {
        return { 
          isValid: false, 
          error: 'Invalid USDT ERC-20 address. Please enter a valid Ethereum address (starting with 0x)' 
        };
      }
      break;

    default:
      return { isValid: false, error: 'Unsupported network type' };
  }

  return { isValid: true };
};

