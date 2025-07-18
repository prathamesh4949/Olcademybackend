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