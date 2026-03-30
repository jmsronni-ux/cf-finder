/**
 * Wallet address validation utilities
 */

export const validateBitcoinAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;
  address = address.trim();
  return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^bc1[a-z0-9]{39,87}$/.test(address);
};

export const validateEthereumAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
};

export const validateTronAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;
  return /^T[a-km-zA-HJ-NP-Z1-9]{33}$/.test(address.trim());
};

export const validateSolanaAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim());
};

export const validateBnbAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
};

export const validateWalletAddress = (address: string, network: string): { isValid: boolean; error?: string } => {
  if (!address || !address.trim()) {
    return { isValid: false, error: 'Wallet address is required' };
  }
  const a = address.trim();
  const validators: Record<string, [((a: string) => boolean), string]> = {
    btc: [validateBitcoinAddress, 'Invalid Bitcoin address (should start with 1, 3, or bc1)'],
    eth: [validateEthereumAddress, 'Invalid Ethereum address (should start with 0x)'],
    tron: [validateTronAddress, 'Invalid Tron address (should start with T)'],
    usdtErc20: [validateEthereumAddress, 'Invalid USDT ERC-20 address (should start with 0x)'],
    sol: [validateSolanaAddress, 'Invalid Solana address (Base58 encoded)'],
    bnb: [validateBnbAddress, 'Invalid BNB address (should start with 0x)'],
  };
  const entry = validators[network];
  if (!entry) return { isValid: false, error: 'Unsupported network type' };
  const [fn, msg] = entry;
  return fn(a) ? { isValid: true } : { isValid: false, error: msg };
};

export const getNetworkName = (network: string): string => {
  const names: Record<string, string> = {
    btc: 'Bitcoin', eth: 'Ethereum', tron: 'Tron',
    usdtErc20: 'USDT (ERC-20)', sol: 'Solana', bnb: 'BNB (BSC)',
  };
  return names[network] || network;
};
