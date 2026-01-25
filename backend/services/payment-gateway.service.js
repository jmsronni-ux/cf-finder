/**
 * Payment Gateway Service
 * 
 * Handles communication between the main backend and the payment gateway microservice.
 * The payment gateway handles BlockCypher API interactions for crypto payments.
 */

import { PAYMENT_GATEWAY_URL } from '../config/env.js';

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
    async createPaymentSession(userId, cryptocurrency, amount, metadata = {}) {
        try {
            if (!this.baseUrl) {
                throw new Error('Payment gateway URL not configured');
            }

            const response = await fetch(`${this.baseUrl}/address`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cryptocurrency: cryptocurrency.toLowerCase(),
                    userId: userId.toString(),
                    amount,
                    metadata
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                console.error('Payment gateway error:', data);
                return {
                    success: false,
                    error: data.error || 'Failed to create payment session'
                };
            }

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
                    'Content-Type': 'application/json'
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
                    'Content-Type': 'application/json'
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
                timeout: 5000
            });

            return response.ok;
        } catch (error) {
            console.error('Payment gateway health check failed:', error);
            return false;
        }
    }

    /**
     * Get confirmation requirements for a cryptocurrency
     * 
     * @param {string} cryptocurrency - 'btc' or 'eth'
     * @returns {number} Required confirmations
     */
    getRequiredConfirmations(cryptocurrency) {
        const crypto = cryptocurrency.toLowerCase();
        // These should match the payment gateway configuration
        const confirmations = {
            btc: 3,  // ~30 minutes
            eth: 12  // ~3 minutes
        };
        return confirmations[crypto] || 3;
    }
}

// Export singleton instance
export const paymentGatewayService = new PaymentGatewayService();
export default paymentGatewayService;
