import nodemailer from 'nodemailer'
import { google } from 'googleapis'
import dotenv from 'dotenv'

dotenv.config();

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const refreshToken = process.env.REFRESH_TOKEN;

// Gmail OAuth2 Setup
const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'https://developers.google.com/oauthplayground'
);

oAuth2Client.setCredentials({ refresh_token: refreshToken });

export const sendMail = async (email, otp) => {
    try {
        // Validate environment variables
        if (!clientId || !clientSecret || !refreshToken || !process.env.MY_EMAIL) {
            throw new Error('Missing email configuration environment variables');
        }

        console.log('Attempting to send email to:', email);

        // Get access token
        const accessToken = await oAuth2Client.getAccessToken();
        
        if (!accessToken.token) {
            throw new Error('Failed to obtain access token');
        }

        const transporter = nodemailer.createTransporter({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: process.env.MY_EMAIL,
                clientId: clientId,
                clientSecret: clientSecret,
                refreshToken: refreshToken,
                accessToken: accessToken.token,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verify transporter configuration
        await transporter.verify();

        const mailOptions = {
            from: `"OLCAcademy Verification" <${process.env.MY_EMAIL}>`,
            to: email,
            subject: 'Verify your email - OLCAcademy',
            text: `Your verification code is: ${otp}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #333; text-align: center; margin-bottom: 30px;">Email Verification</h2>
                        <p style="font-size: 16px; color: #555; line-height: 1.6;">
                            Thank you for signing up with OLCAcademy! Use the verification code below to complete your registration:
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <span style="display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; font-size: 24px; font-weight: bold; border-radius: 8px; letter-spacing: 2px;">
                                ${otp}
                            </span>
                        </div>
                        <p style="color: #888; font-size: 14px; text-align: center;">
                            This code will expire in 10 minutes. If you didn't request this, please ignore this email.
                        </p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #999; font-size: 12px; text-align: center;">
                            This is an automated email from OLCAcademy. Please do not reply.
                        </p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', result.messageId);
        return result;

    } catch (error) {
        console.error('Email sending error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};
