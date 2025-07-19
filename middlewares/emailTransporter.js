/* first can work 
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

*/

/*
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
            console.error('Missing email configuration environment variables');
            throw new Error('Email configuration incomplete');
        }

        console.log('Attempting to send email to:', email);

        // Get access token with retry mechanism
        let accessToken;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                const tokenResponse = await oAuth2Client.getAccessToken();
                accessToken = tokenResponse.token;
                
                if (accessToken) {
                    break;
                }
            } catch (tokenError) {
                console.error(`Token attempt ${retryCount + 1} failed:`, tokenError.message);
                retryCount++;
                
                if (retryCount === maxRetries) {
                    throw new Error('Failed to obtain access token after multiple attempts');
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }

        if (!accessToken) {
            throw new Error('Failed to obtain valid access token');
        }

        const transporter = nodemailer.createTransporter({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: process.env.MY_EMAIL,
                clientId: clientId,
                clientSecret: clientSecret,
                refreshToken: refreshToken,
                accessToken: accessToken,
            },
            tls: {
                rejectUnauthorized: false
            },
            timeout: 10000, // 10 seconds timeout
            connectionTimeout: 10000,
            greetingTimeout: 5000,
            socketTimeout: 10000
        });

        // Verify transporter with timeout
        try {
            await Promise.race([
                transporter.verify(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Transporter verification timeout')), 8000)
                )
            ]);
            console.log('Transporter verified successfully');
        } catch (verifyError) {
            console.warn('Transporter verification failed, but continuing:', verifyError.message);
            // Don't throw here, sometimes it still works
        }

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

        // Send email with timeout
        const result = await Promise.race([
            transporter.sendMail(mailOptions),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Email sending timeout')), 15000)
            )
        ]);

        console.log('Email sent successfully:', result.messageId);
        return result;

    } catch (error) {
        console.error('Email sending error:', error);
        
        // More specific error messages
        if (error.message.includes('access token')) {
            throw new Error('Email service authentication failed');
        } else if (error.message.includes('timeout')) {
            throw new Error('Email service timeout - please try again');
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
            throw new Error('Network connection failed');
        } else {
            throw new Error(`Email service error: ${error.message}`);
        }
    }
};
*/
import nodemailer from 'nodemailer'
import { google } from 'googleapis'
import dotenv from 'dotenv'
dotenv.config();


const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET
const refreshToken = process.env.REFRESH_TOKEN


//Gmail OAuth2 Setup
const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    refreshToken,
    'https://developers.google.com/oauthplayground'
)

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

export const sendMail = async (email, otp) => {
    const accessToken = await oAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.MY_EMAIL,
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            refreshToken: process.env.REFRESH_TOKEN,
            accessToken: accessToken.token,
        },
    })
    const mailOptions = {
        from: `"Perfume Verification" <${process.env.MY_EMAIL}>`,
        to: email,
        subject: 'Verify your email',
        text: `Your verification code is: ${otp}`,
        html: `
                 <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
                   <h2 style="color: #333;">Please verify your email</h2>
                    <p style="font-size: 16px; color: #555;">
                       Thank you for signing up. Use the verification code below to complete your registration:
                    </p>
                    <div style="margin: 20px 0;">
                        <span style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; font-size: 22px; font-weight: bold; border-radius: 5px;">
                          ${otp}
                        </span>
                    </div>
                    <p style="color: #888; font-size: 14px;">
                        This code will expire in 10 minutes. If you didn’t request this, please ignore the email.
                    </p>
                </div>`
    }
    const result = await transporter.sendMail(mailOptions);
    return result;
   
};
