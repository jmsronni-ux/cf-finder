/**
 * Payment Gateway Service
 * 
 * Handles communication between the main backend and the payment gateway microservice.
 * The payment gateway handles BlockCypher API interactions for crypto payments.
 */

import { PAYMENT_GATEWAY_URL, WALLET_SYNC_SECRET } from '../config/env.js';

class PaymentGatewayService {
    constructor() {
        this.baseUrl = PAYMENT_GATEWAY_URL || 'http://localhost:3001';
    }

    /**
     * Create a new payment session with the payment gateway
     * This generates a temporary crypto address for the user to send funds to
     * 
     * @param {string} userId - The user ID creating the payment
     * @param {string} cryptocurrency - 'btc' or 'eth'
     * @param {number} amount - Expected amount in USD
     * @param {Object} metadata - Optional metadata to attach to the session
     * @returns {Promise<Object>} Payment session details including address
     */
    /**
     * Map user-facing cryptocurrency names to payment gateway format
     * @param {string} crypto - User-facing crypto name (BTC, ETH, BCY, BETH)
     * @returns {string} Payment gateway format (btc, eth, bcy, beth)
     */
    mapCryptocurrency(crypto) {
        const mapping = {
            'bcy': 'bcy',       // BlockCypher Bitcoin testnet
            'beth': 'beth',     // BlockCypher Ethereum testnet
            'btc': 'btc',       // Bitcoin mainnet
            'eth': 'eth'        // Ethereum mainnet (when supported)
        };
        return mapping[crypto.toLowerCase()] || crypto.toLowerCase();
    }

    async createPaymentSession(userId, cryptocurrency, amount, metadata = {}) {
        try {
            if (!this.baseUrl) {
                throw new Error('Payment gateway URL not configured');
            }

            const crypto = this.mapCryptocurrency(cryptocurrency);
            console.log(`[PaymentGateway] Creating payment session - Chain: ${cryptocurrency.toUpperCase()} (mapped to ${crypto}), Amount: ${amount}, UserId: ${userId}`);

            const response = await fetch(`${this.baseUrl}/address`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    cryptocurrency: crypto,
                    userId: userId.toString(),
                    amount,
                    metadata
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                console.error(`[PaymentGateway] Error creating payment session - Chain: ${crypto.toUpperCase()}, Amount: ${amount}:`, data);
                return {
                    success: false,
                    error: data.error || 'Failed to create payment session'
                };
            }

            console.log(`[PaymentGateway] Payment session created successfully - Chain: ${crypto.toUpperCase()}, Amount: ${amount}, SessionId: ${data.data.sessionId}, Address: ${data.data.paymentAddress}`);

            return {
                success: true,
                sessionId: data.data.sessionId,
                paymentAddress: data.data.paymentAddress,
                cryptocurrency: data.data.cryptocurrency,
                expectedAmount: data.data.expectedAmount,
                expiresAt: data.data.expiresAt,
                status: data.data.status
            };
        } catch (error) {
            console.error('Error creating payment session:', error);
            return {
                success: false,
                error: error.message || 'Failed to connect to payment gateway'
            };
        }
    }

    /**
     * Get the current status of a payment session
     * 
     * @param {string} sessionId - The payment session ID
     * @returns {Promise<Object>} Session status details
     */
    async getSessionStatus(sessionId) {
        try {
            if (!this.baseUrl) {
                throw new Error('Payment gateway URL not configured');
            }

            const response = await fetch(`${this.baseUrl}/session/${sessionId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                return {
                    success: false,
                    error: data.error || 'Failed to get session status'
                };
            }

            return {
                success: true,
                session: data.data
            };
        } catch (error) {
            console.error('Error getting session status:', error);
            return {
                success: false,
                error: error.message || 'Failed to connect to payment gateway'
            };
        }
    }

    /**
     * Cancel a payment session
     * 
     * @param {string} sessionId - The payment session ID to cancel
     * @returns {Promise<Object>} Cancellation result
     */
    async cancelSession(sessionId) {
        try {
            if (!this.baseUrl) {
                throw new Error('Payment gateway URL not configured');
            }

            const response = await fetch(`${this.baseUrl}/session/${sessionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                return {
                    success: false,
                    error: data.error || 'Failed to cancel session'
                };
            }

            return {
                success: true,
                message: data.message
            };
        } catch (error) {
            console.error('Error cancelling session:', error);
            return {
                success: false,
                error: error.message || 'Failed to connect to payment gateway'
            };
        }
    }

    /**
     * Check if payment gateway is available
     * 
     * @returns {Promise<boolean>} True if gateway is reachable
     */
    async isAvailable() {
        try {
            if (!this.baseUrl) {
                return false;
            }

            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                },
                timeout: 5000
            });

            return response.ok;
        } catch (error) {
            console.error('Payment gateway health check failed:', error);
            return false;
        }
    }

    /**
     * Sync wallet addresses to payment service
     * Called when admin updates global settings
     *
     * @param {Object} addresses - { btcAddress, ethAddress, usdtAddress, bcyAddress, bethAddress }
     * @returns {Promise<Object>} Sync result
     */
    async syncWalletAddresses(addresses) {
        try {
            if (!this.baseUrl) {
                throw new Error('Payment gateway URL not configured');
            }

            if (!WALLET_SYNC_SECRET) {
                console.warn('[PaymentGateway] WALLET_SYNC_SECRET not configured, skipping wallet sync');
                return { success: false, error: 'Wallet sync not configured' };
            }

            console.log('[PaymentGateway] Syncing wallet addresses to payment service');

            const response = await fetch(`${this.baseUrl}/config/wallet-addresses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    secret: WALLET_SYNC_SECRET,
                    btcAddress: addresses.btcAddress || null,
                    ethAddress: addresses.ethAddress || null,
                    usdtAddress: addresses.usdtAddress || null,
                    bcyAddress: addresses.bcyAddress || null,
                    bethAddress: addresses.bethAddress || null
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                console.error('[PaymentGateway] Failed to sync wallet addresses:', data);
                return { success: false, error: data.error || 'Failed to sync wallet addresses' };
            }

            console.log('[PaymentGateway] Wallet addresses synced successfully');
            return { success: true };
        } catch (error) {
            console.error('[PaymentGateway] Error syncing wallet addresses:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get confirmation requirements for a cryptocurrency
     *
     * @param {string} cryptocurrency - 'btc', 'eth', 'bcy', or 'beth'
     * @returns {number} Required confirmations
     */
    getRequiredConfirmations(cryptocurrency) {
        const crypto = cryptocurrency.toLowerCase();
        // These should match the payment gateway configuration
        const confirmations = {
            btc: 1,   // ~10 minutes
            eth: 3,   // ~45 seconds
            bcy: 1,   // BlockCypher Bitcoin test chain - 1 confirmation for testing
            beth: 1   // BlockCypher Ethereum test chain - 1 confirmation for testing
        };
        return confirmations[crypto] || 3;
    }
}

// Export singleton instance
export const paymentGatewayService = new PaymentGatewayService();
export default paymentGatewayService;
