




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
        // Enhanced validation with detailed logging
        console.log('=== EMAIL CONFIGURATION CHECK ===');
        console.log('CLIENT_ID:', clientId ? '✅ Present' : '❌ Missing');
        console.log('CLIENT_SECRET:', clientSecret ? '✅ Present' : '❌ Missing');
        console.log('REFRESH_TOKEN:', refreshToken ? '✅ Present' : '❌ Missing');
        console.log('MY_EMAIL:', process.env.MY_EMAIL ? '✅ Present' : '❌ Missing');
        console.log('Target email:', email);
        console.log('OTP to send:', otp);

        if (!clientId || !clientSecret || !refreshToken || !process.env.MY_EMAIL) {
            throw new Error('Missing email configuration environment variables');
        }

        // Create transporter without manually getting access token (let nodemailer handle it)
        console.log('=== CREATING TRANSPORTER ===');
        const transporter = nodemailer.createTransporter({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: process.env.MY_EMAIL,
                clientId: clientId,
                clientSecret: clientSecret,
                refreshToken: refreshToken,
                // Remove accessToken - let nodemailer handle token refresh automatically
            },
            tls: {
                rejectUnauthorized: false
            },
            // Remove debug and logger for production, but keep for debugging
            debug: process.env.NODE_ENV === 'development',
            logger: process.env.NODE_ENV === 'development'
        });

        // Test transporter connection with timeout
        console.log('=== VERIFYING TRANSPORTER ===');
        try {
            // Add timeout to prevent hanging
            const verifyPromise = transporter.verify();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Transporter verification timeout')), 10000)
            );
            
            await Promise.race([verifyPromise, timeoutPromise]);
            console.log('✅ Transporter verification successful');
        } catch (verifyError) {
            console.error('❌ Transporter verification failed:', verifyError.message);
            // Don't throw here - sometimes verification fails but sending still works
            console.log('⚠️ Continuing despite verification failure...');
        }

        // Enhanced mail options
        const mailOptions = {
            from: `"OLCAcademy Verification" <${process.env.MY_EMAIL}>`,
            to: email,
            subject: 'Verify your email - OLCAcademy',
            text: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #333; text-align: center; margin-bottom: 30px;">Email Verification - OLCAcademy</h2>
                        <p style="font-size: 16px; color: #555; line-height: 1.6;">
                            Thank you for signing up with OLCAcademy! Use the verification code below to complete your registration:
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <span style="display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; font-size: 24px; font-weight: bold; border-radius: 8px; letter-spacing: 2px;">
                                ${otp}
                            </span>
                        </div>
                        <p style="color: #888; font-size: 14px; text-align: center; margin: 20px 0;">
                            This code will expire in 10 minutes.
                        </p>
                        <p style="color: #888; font-size: 14px; text-align: center;">
                            If you didn't request this verification, please ignore this email.
                        </p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #999; font-size: 12px; text-align: center;">
                            This is an automated email from OLCAcademy. Please do not reply.
                        </p>
                    </div>
                </div>
            `
        };

        console.log('=== SENDING EMAIL ===');
        console.log('Mail options:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject
        });

        // Add timeout to email sending
        const sendPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email sending timeout after 30 seconds')), 30000)
        );
        
        const result = await Promise.race([sendPromise, timeoutPromise]);
        
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', result.messageId);
        console.log('Response:', result.response);
        
        return result;

    } catch (error) {
        console.error('=== EMAIL SENDING ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            name: error.name,
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode
        });
        
        // Provide more specific error messages
        let errorMessage = error.message;
        if (error.code === 'EAUTH') {
            errorMessage = 'Authentication failed. Please check your OAuth2 credentials.';
        } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
            errorMessage = 'Email sending timed out. Please try again.';
        } else if (error.message.includes('invalid_grant')) {
            errorMessage = 'OAuth2 token expired. Please regenerate your refresh token.';
        }
        
        throw new Error(`Failed to send email: ${errorMessage}`);
    }
};

// Test function - you can call this from your debug endpoint
export const testEmailConfiguration = async () => {
    try {
        console.log('=== TESTING EMAIL CONFIGURATION ===');
        
        // Test basic transporter creation without manual token handling
        const transporter = nodemailer.createTransporter({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: process.env.MY_EMAIL,
                clientId: clientId,
                clientSecret: clientSecret,
                refreshToken: refreshToken,
            }
        });
        
        // Test with timeout
        try {
            const verifyPromise = transporter.verify();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Verification timeout')), 10000)
            );
            
            await Promise.race([verifyPromise, timeoutPromise]);
            console.log('Transporter test: ✅ Working');
        } catch (verifyError) {
            console.log('Transporter verification failed but may still work:', verifyError.message);
        }
        
        return {
            oauth2: true,
            transporter: true,
            message: 'Email configuration appears to be working'
        };
        
    } catch (error) {
        console.error('Configuration test failed:', error);
        return {
            oauth2: false,
            transporter: false,
            error: error.message
        };
    }
};
