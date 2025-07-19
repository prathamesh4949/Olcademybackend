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

        // Get access token with enhanced error handling
        console.log('=== GETTING ACCESS TOKEN ===');
        let accessToken;
        try {
            const tokenResponse = await oAuth2Client.getAccessToken();
            accessToken = tokenResponse.token;
            console.log('Access token obtained:', accessToken ? '✅ Success' : '❌ Failed');
        } catch (tokenError) {
            console.error('Token error details:', tokenError);
            throw new Error(`Failed to get access token: ${tokenError.message}`);
        }

        if (!accessToken) {
            throw new Error('Access token is null or undefined');
        }

        // Create transporter with enhanced configuration
        console.log('=== CREATING TRANSPORTER ===');
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
            debug: true, // Enable debug mode
            logger: true // Enable logging
        });

        // Test transporter connection
        console.log('=== VERIFYING TRANSPORTER ===');
        try {
            await transporter.verify();
            console.log('✅ Transporter verification successful');
        } catch (verifyError) {
            console.error('❌ Transporter verification failed:', verifyError);
            throw new Error(`Transporter verification failed: ${verifyError.message}`);
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

        const result = await transporter.sendMail(mailOptions);
        
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
        
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Test function - you can call this from your debug endpoint
export const testEmailConfiguration = async () => {
    try {
        console.log('=== TESTING EMAIL CONFIGURATION ===');
        
        // Test OAuth2 client
        const tokenResponse = await oAuth2Client.getAccessToken();
        console.log('OAuth2 test:', tokenResponse.token ? '✅ Working' : '❌ Failed');
        
        // Test basic transporter creation
        const transporter = nodemailer.createTransporter({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: process.env.MY_EMAIL,
                clientId: clientId,
                clientSecret: clientSecret,
                refreshToken: refreshToken,
                accessToken: tokenResponse.token,
            }
        });
        
        await transporter.verify();
        console.log('Transporter test: ✅ Working');
        
        return {
            oauth2: true,
            transporter: true,
            message: 'Email configuration is working properly'
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

*/
const nodemailer = require('nodemailer');

const createTransporter = () => {
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.MY_EMAIL,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
    },
  });

  // Test the connection
  transporter.verify((error, success) => {
    if (error) {
      console.error('Email transporter verification failed:', error);
    } else {
      console.log('Email transporter is ready to send emails');
    }
  });

  return transporter;
};

const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.MY_EMAIL,
      to: email,
      subject: 'Your OTP Code',
      html: `
        <h2>Your OTP Code</h2>
        <p>Your verification code is: <strong>${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      `,
    };

    console.log('Sending email to:', email);
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};
