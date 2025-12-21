import nodemailer from 'nodemailer';
import { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM } from '../config/env.js';

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

// Send login credentials to new user
export const sendLoginCredentials = async (email, name, password) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: EMAIL_FROM || EMAIL_USER,
            to: email,
            subject: 'Welcome to CFinder - Your Login Credentials',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Welcome to CFinder!</h2>
                    <p>Dear ${name},</p>
                    <p>Your account has been successfully created. Here are your login credentials:</p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #495057; margin-top: 0;">Login Information:</h3>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Password:</strong> ${password}</p>
                    </div>
                    
                    <p style="color: #6c757d; font-size: 14px;">
                        <strong>Important:</strong> For security reasons, please change your password after your first login.
                    </p>
                    
                    <p>You can now access your account and start using CFinder.</p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                        <p style="color: #6c757d; font-size: 12px;">
                            If you have any questions, please contact our support team.
                        </p>
                        <p style="color: #6c757d; font-size: 12px;">
                            Best regards,<br>
                            The CFinder Team
                        </p>
                    </div>
                </div>
            `,
            text: `
                Welcome to CFinder!
                
                Dear ${name},
                
                Your account has been successfully created. Here are your login credentials:
                
                Email: ${email}
                Password: ${password}
                
                You can now access your account and start using CFinder.
                
                If you have any questions, please contact our support team.
                
                Best regards,
                The CFinder Team
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

// Send password reset email using Mailtrap API
export const sendPasswordResetEmailMailtrap = async (email, name, resetToken, frontendUrl) => {
    try {
        const { MAILTRAP_API_TOKEN } = await import('../config/env.js');

        if (!MAILTRAP_API_TOKEN) {
            throw new Error('MAILTRAP_API_TOKEN is not configured');
        }

        const resetLink = `${frontendUrl || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

        const emailData = {
            from: {
                email: "hello@crypto-finders.com",
                name: "CFinder Support"
            },
            to: [
                {
                    email: email
                }
            ],
            subject: "Password Reset Request - CFinder",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p>Dear ${name},</p>
                    <p>We received a request to reset your password for your CFinder account.</p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p>Click the button below to reset your password:</p>
                        <a href="${resetLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0;">Reset Password</a>
                        <p style="font-size: 12px; color: #6c757d; margin-top: 15px;">Or copy and paste this link into your browser:</p>
                        <p style="font-size: 12px; color: #007bff; word-break: break-all;">${resetLink}</p>
                    </div>
                    
                    <p style="color: #dc3545; font-size: 14px;">
                        <strong>Important:</strong> This link will expire in 1 hour for security reasons.
                    </p>
                    
                    <p style="color: #6c757d; font-size: 14px;">
                        If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                    </p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                        <p style="color: #6c757d; font-size: 12px;">
                            Best regards,<br>
                            The CFinder Team
                        </p>
                    </div>
                </div>
            `,
            text: `
                Password Reset Request
                
                Dear ${name},
                
                We received a request to reset your password for your CFinder account.
                
                Click the link below to reset your password:
                ${resetLink}
                
                This link will expire in 1 hour for security reasons.
                
                If you didn't request a password reset, please ignore this email.
                
                Best regards,
                The CFinder Team
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

