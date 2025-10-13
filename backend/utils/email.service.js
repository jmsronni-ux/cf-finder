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
