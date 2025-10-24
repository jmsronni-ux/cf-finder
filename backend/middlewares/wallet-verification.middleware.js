import { ApiError } from './error.middleware.js';

/**
 * Middleware to check if user has verified wallet
 * Can be applied to routes that require wallet verification
 */
export const requireWalletVerification = async (req, res, next) => {
    try {
        const user = req.user;
        
        if (!user) {
            throw new ApiError(401, 'Authentication required');
        }

        if (!user.walletVerified) {
            throw new ApiError(403, 'Wallet verification required. Please verify your wallet before proceeding.');
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to check if user has any wallet added
 * Can be used to gate features that require a wallet
 */
export const requireWallet = async (req, res, next) => {
    try {
        const user = req.user;
        
        if (!user) {
            throw new ApiError(401, 'Authentication required');
        }

        const wallets = user.wallets || {};
        const hasWallet = wallets.btc || wallets.eth || wallets.tron || wallets.usdtErc20;

        if (!hasWallet) {
            throw new ApiError(403, 'Wallet required. Please add a wallet before proceeding.');
        }

        next();
    } catch (error) {
        next(error);
    }
};
