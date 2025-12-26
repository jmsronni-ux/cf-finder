import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FRONTEND_URL } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to send email via Mailtrap API
const sendViaMailtrap = async ({ to, subject, html, text, category }) => {
    try {
        const { MAILTRAP_API_TOKEN } = await import('../config/env.js');

        if (!MAILTRAP_API_TOKEN) {
            throw new Error('MAILTRAP_API_TOKEN is not configured');
        }

        const emailData = {
            from: {
                email: "hello@crypto-finders.com",
                name: "CryptoFinders Support"
            },
            to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML if no text provided
            category
        };

        const response = await fetch('https://send.api.mailtrap.io/api/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MAILTRAP_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Mailtrap API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return { success: true, result };
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        throw error;
    }
};

// Load and process email template
export const loadEmailTemplate = (templateName, variables) => {
    try {
        const templatePath = path.join(__dirname, '..', 'email', `${templateName}.html`);
        let template = fs.readFileSync(templatePath, 'utf-8');

        // Add logo URL if not provided
        if (!variables.logoUrl) {
            variables.logoUrl = FRONTEND_URL ? `${FRONTEND_URL}/logo.png` : '/logo.png';
        }

        // Add current year if not provided
        if (!variables.year) {
            variables.year = new Date().getFullYear();
        }

        // Replace all placeholders with actual values
        template = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return variables[key] !== undefined ? variables[key] : match;
        });

        return template;
    } catch (error) {
        console.error(`Error loading email template ${templateName}:`, error);
        throw new Error(`Failed to load email template: ${error.message}`);
    }
};

// Send login credentials to new user
export const sendLoginCredentials = async (email, name, password) => {
    try {
        // Load and process template
        const html = loadEmailTemplate('login-credentials', {
            name,
            email,
            password
        });

        return await sendViaMailtrap({
            to: email,
            subject: 'Welcome to CryptoFinders - Your Login Credentials',
            html,
            category: "Login Credentials"
        });
    } catch (error) {
        console.error('Error sending login credentials email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Test email configuration
export const testEmailConnection = async () => {
    try {
        const { MAILTRAP_API_TOKEN } = await import('../config/env.js');
        if (!MAILTRAP_API_TOKEN) {
            console.error('MAILTRAP_API_TOKEN is not configured');
            return false;
        }
        console.log('Email configuration (Mailtrap API) is present');
        return true;
    } catch (error) {
        console.error('Email configuration error:', error);
        return false;
    }
};

// Send registration approved email using Mailtrap API
export const sendRegistrationApprovedEmail = async (email, name, password, frontendUrl) => {
    try {
        const loginUrl = frontendUrl ? `${frontendUrl}/login` : 'http://localhost:5173/login';

        // Load and process template
        const html = loadEmailTemplate('registration-approved', {
            name,
            email,
            password,
            loginUrl
        });

        return await sendViaMailtrap({
            to: email,
            subject: "Registration Approved - Welcome to CryptoFinders",
            html,
            category: "Registration Approved"
        });
    } catch (error) {
        console.error('Error sending registration approved email via Mailtrap:', error);
        throw new Error(`Failed to send registration approved email: ${error.message}`);
    }
};

// Send password reset email using Mailtrap API
export const sendPasswordResetEmailMailtrap = async (email, name, resetToken, frontendUrl) => {
    try {
        const resetLink = `${frontendUrl || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

        // Load and process template
        const html = loadEmailTemplate('password-reset', {
            name,
            resetLink
        });

        return await sendViaMailtrap({
            to: email,
            subject: "Reset Your Password - CryptoFinders",
            html,
            category: "Password Reset"
        });
    } catch (error) {
        console.error('Error sending password reset email via Mailtrap:', error);
        throw new Error(`Failed to send password reset email: ${error.message}`);
    }
};

// Send withdrawal request created email
export const sendWithdrawalRequestCreatedEmail = async (email, name, amount, wallet, requestId) => {
    try {
        const html = loadEmailTemplate('withdrawal/withdrawal-request-created', {
            name,
            amount,
            wallet: wallet || 'N/A',
            requestId: requestId.toString()
        });

        return await sendViaMailtrap({
            to: email,
            subject: "Withdrawal Request Created - CryptoFinders",
            html,
            category: "Withdrawal Request"
        });
    } catch (error) {
        console.error('Error sending withdrawal request created email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Send withdrawal request approved email
export const sendWithdrawalRequestApprovedEmail = async (email, name, confirmedAmount, confirmedWallet, requestId) => {
    try {
        const html = loadEmailTemplate('withdrawal/withdrawal-request-approved', {
            name,
            confirmedAmount,
            confirmedWallet,
            requestId: requestId.toString()
        });

        return await sendViaMailtrap({
            to: email,
            subject: "Withdrawal Request Approved - CryptoFinders",
            html,
            category: "Withdrawal Request"
        });
    } catch (error) {
        console.error('Error sending withdrawal request approved email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Send withdrawal request rejected email
export const sendWithdrawalRequestRejectedEmail = async (email, name, amount, requestId, notes) => {
    try {
        const notesSection = notes 
            ? `<strong>Reason:</strong> ${notes}`
            : '';

        const html = loadEmailTemplate('withdrawal/withdrawal-request-rejected', {
            name,
            amount,
            requestId: requestId.toString(),
            notes: notesSection
        });

        return await sendViaMailtrap({
            to: email,
            subject: "Withdrawal Request Rejected - CryptoFinders",
            html,
            category: "Withdrawal Request"
        });
    } catch (error) {
        console.error('Error sending withdrawal request rejected email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Send additional verification submission received email to user
export const sendAdditionalVerificationSubmissionReceivedEmail = async (email, name, questionnaireTitle, submissionId) => {
    try {
        const html = loadEmailTemplate('additional-verification/additional-verification-submission-received', {
            name,
            questionnaireTitle,
            submissionId: submissionId.toString()
        });

        return await sendViaMailtrap({
            to: email,
            subject: "Verification Submission Received - CryptoFinders",
            html,
            category: "Additional Verification"
        });
    } catch (error) {
        console.error('Error sending additional verification submission received email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Send additional verification approved email to user
export const sendAdditionalVerificationApprovedEmail = async (email, name, questionnaireTitle, submissionId) => {
    try {
        const html = loadEmailTemplate('additional-verification/additional-verification-approved', {
            name,
            questionnaireTitle,
            submissionId: submissionId.toString()
        });

        return await sendViaMailtrap({
            to: email,
            subject: "Additional Verification Approved - CryptoFinders",
            html,
            category: "Additional Verification"
        });
    } catch (error) {
        console.error('Error sending additional verification approved email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Send additional verification rejected email to user
export const sendAdditionalVerificationRejectedEmail = async (email, name, questionnaireTitle, submissionId, reviewNote) => {
    try {
        const reviewNoteSection = reviewNote 
            ? `<strong>Review Note:</strong> ${reviewNote}`
            : 'No specific reason provided.';

        const html = loadEmailTemplate('additional-verification/additional-verification-rejected', {
            name,
            questionnaireTitle,
            submissionId: submissionId.toString(),
            reviewNote: reviewNoteSection
        });

        return await sendViaMailtrap({
            to: email,
            subject: "Additional Verification Rejected - CryptoFinders",
            html,
            category: "Additional Verification"
        });
    } catch (error) {
        console.error('Error sending additional verification rejected email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Send tier request submitted email to user
export const sendTierRequestSubmittedEmail = async (email, name, currentTier, currentTierName, requestedTier, tierName, requestId) => {
    try {
        const html = loadEmailTemplate('tier-request/tier-request-submitted', {
            name,
            currentTier,
            currentTierName,
            requestedTier,
            tierName,
            requestId: requestId.toString()
        });

        return await sendViaMailtrap({
            to: email,
            subject: `Tier Upgrade Request Submitted - ${tierName} - CryptoFinders`,
            html,
            category: "Tier Request"
        });
    } catch (error) {
        console.error('Error sending tier request submitted email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Send tier request approved email to user
export const sendTierRequestApprovedEmail = async (email, name, currentTier, currentTierName, requestedTier, tierName, requestId) => {
    try {
        const html = loadEmailTemplate('tier-request/tier-request-approved', {
            name,
            currentTier,
            currentTierName,
            requestedTier,
            tierName,
            requestId: requestId.toString()
        });

        return await sendViaMailtrap({
            to: email,
            subject: `Tier Upgrade Approved - ${tierName} - CryptoFinders`,
            html,
            category: "Tier Request"
        });
    } catch (error) {
        console.error('Error sending tier request approved email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Send tier request rejected email to user
export const sendTierRequestRejectedEmail = async (email, name, currentTier, currentTierName, requestedTier, tierName, requestId, adminNote) => {
    try {
        const adminNoteSection = adminNote && adminNote.trim() 
            ? adminNote.trim()
            : 'Request rejected by admin.';

        const html = loadEmailTemplate('tier-request/tier-request-rejected', {
            name,
            currentTier,
            currentTierName,
            requestedTier,
            tierName,
            requestId: requestId.toString(),
            adminNote: adminNoteSection
        });

        return await sendViaMailtrap({
            to: email,
            subject: `Tier Upgrade Request Rejected - CryptoFinders`,
            html,
            category: "Tier Request"
        });
    } catch (error) {
        console.error('Error sending tier request rejected email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};



