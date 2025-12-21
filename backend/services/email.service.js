import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM, FRONTEND_URL } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
    return nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_PORT === 465, // true for 465, false for other ports
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    });
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
        const transporter = createTransporter();
        
        // Load and process template
        const html = loadEmailTemplate('login-credentials', {
            name,
            email,
            password
        });

        const mailOptions = {
            from: EMAIL_FROM || EMAIL_USER,
            to: email,
            subject: 'Welcome to CryptoFinders - Your Login Credentials',
            html,
            text: `
                Welcome to CryptoFinders!
                
                Dear ${name},
                
                Your account has been successfully created. Here are your login credentials:
                
                Email: ${email}
                Password: ${password}
                
                You can now access your account and start using CryptoFinders.
                
                If you have any questions, please contact our support team.
                
                Best regards,
                The CryptoFinders Team
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Generic send email function
export const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: EMAIL_FROM || EMAIL_USER,
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML if no text provided
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Test email configuration
export const testEmailConnection = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('Email server is ready to send messages');
        return true;
    } catch (error) {
        console.error('Email server configuration error:', error);
        return false;
    }
};

// Send registration approved email
export const sendRegistrationApprovedEmail = async (email, name, password, frontendUrl) => {
    try {
        const transporter = createTransporter();
        
        const loginUrl = frontendUrl ? `${frontendUrl}/login` : '/login';
        
        // Load and process template
        const html = loadEmailTemplate('registration-approved', {
            name,
            email,
            password,
            loginUrl
        });

        const mailOptions = {
            from: EMAIL_FROM || EMAIL_USER,
            to: email,
            subject: 'Registration Approved - Welcome to CryptoFinders',
            html,
            text: `
                Congratulations! Your Registration Has Been Approved
                
                Dear ${name},
                
                We're excited to inform you that your registration request has been reviewed and approved by our team. Your CryptoFinders account has been successfully created and is now ready to use!
                
                Your Login Credentials:
                Email: ${email}
                Password: ${password}
                
                You can now log in and start using our advanced blockchain forensics platform.
                
                For your security, please change your password after your first login.
                
                If you have any questions, please contact our support team.
                
                Best regards,
                The CryptoFinders Team
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Registration approved email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending registration approved email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Send password reset email using Mailtrap API
export const sendPasswordResetEmailMailtrap = async (email, name, resetToken, frontendUrl) => {
    try {
        const { MAILTRAP_API_TOKEN } = await import('../config/env.js');

        if (!MAILTRAP_API_TOKEN) {
            throw new Error('MAILTRAP_API_TOKEN is not configured');
        }

        const resetLink = `${frontendUrl || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
        
        // Load and process template
        const html = loadEmailTemplate('password-reset', {
            name,
            resetLink
        });

        const emailData = {
            from: {
                email: "hello@crypto-finders.com",
                name: "CryptoFinders Support"
            },
            to: [
                {
                    email: email
                }
            ],
            subject: "Reset Your Password - CryptoFinders",
            html,
            text: `
                Password Reset Request
                
                Dear ${name},
                
                We received a request to reset your password for your CryptoFinders account.
                
                Click the link below to reset your password:
                ${resetLink}
                
                This link will expire in 1 hour for security reasons.
                
                If you didn't request a password reset, please ignore this email.
                
                Best regards,
                The CryptoFinders Team
            `,
            category: "Password Reset"
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
        console.log('Password reset email sent successfully via Mailtrap:', result);
        return { success: true, result };
    } catch (error) {
        console.error('Error sending password reset email via Mailtrap:', error);
        throw new Error(`Failed to send password reset email: ${error.message}`);
    }
};

