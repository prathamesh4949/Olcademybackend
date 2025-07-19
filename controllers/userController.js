/* import { User } from "../models/User.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { sendMail } from "../middlewares/emailTransporter.js"
import { connectDB } from "../utils/db.js"

//sign up
export const register = async (req, res) => {
    try {
        // Ensure database connection
        await connectDB();
        
        console.log('Register endpoint hit:', req.body);
        
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({
                message: "All fields are required.",
                success: false
            })
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Please provide a valid email address.",
                success: false
            });
        }

        const user = await User.findOne({ email })
        if (user) {
            return res.status(409).json({
                message: "User already exists.",
                success: false
            })
        }

        //hash password
        const hashedPassword = await bcrypt.hash(password, 10)
        const otp = Math.floor(100000 + Math.random() * 900000);
        
        // Create user first, then send email
        const newUser = new User({
            email,
            password: hashedPassword,
            emailOtp: otp,
            emailOtpExpiry: new Date(Date.now() + 10 * 60 * 1000),
            isVerified: false
        })
        
        await newUser.save()
        
        // Send email after user is created (non-blocking approach)
        try {
            await sendMail(email, otp);
            console.log('Email sent successfully to:', email);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // Don't return error here - user is already created
            // We'll handle email sending failure gracefully
        }
        
        res.status(201).json({
            message: "User registered successfully. Please check your email for verification code.",
            user: {
                _id: newUser._id,
                email: newUser.email
            },
            success: true
        })
    } catch (error) {
        console.error('Registration error:', error);
        
        // More specific error handling
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Invalid user data provided.',
                success: false 
            });
        }
        
        if (error.code === 11000) {
            return res.status(409).json({ 
                message: 'User already exists.',
                success: false 
            });
        }
        
        res.status(500).json({ 
            message: 'Server error. Please try again later.',
            success: false 
        });
    }
}

//verify email
export const verifyEmail = async (req, res) => {
    try {
        // Ensure database connection
        await connectDB();
        
        console.log('Verify email endpoint hit:', req.body);
        
        const { email, emailOtp } = req.body
        if (!email || !emailOtp) {
            return res.status(400).json({
                message: 'Email and OTP are required',
                success: false
            })
        }

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                success: false
            })
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "User is already verified",
            });
        }

        if (Date.now() > user.emailOtpExpiry) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired",
            });
        }

        // Convert both to numbers for comparison
        if (parseInt(user.emailOtp) !== parseInt(emailOtp)) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        // All checks passed – mark as verified
        user.isVerified = true;
        user.emailOtp = null;
        user.emailOtpExpiry = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Email verified successfully",
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ 
            message: 'Server error. Please try again later.',
            success: false 
        });
    }
}

export const resendOtp = async (req, res) => {
    try {
        // Ensure database connection
        await connectDB();
        
        console.log('Resend OTP endpoint hit:', req.body);
        
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                message: 'Email is required',
                success: false
            });
        }

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                success: false
            })
        }

        if (user.isVerified) {
            return res.status(400).json({
                message: 'User is already verified',
                success: false
            });
        }

        //generate new otp again
        const otp = Math.floor(100000 + Math.random() * 900000);
        user.emailOtp = otp
        user.emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000)

        await user.save()
        
        try {
            await sendMail(email, otp)
            console.log('OTP resent successfully to:', email);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            return res.status(500).json({
                message: "Failed to send OTP. Please try again.",
                success: false
            });
        }

        return res.status(200).json({
            message: 'OTP sent successfully.',
            success: true
        })
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ 
            message: 'Server error. Please try again later.',
            success: false 
        });
    }
}

//login
export const login = async (req, res) => {
    try {
        // Ensure database connection
        await connectDB();
        
        console.log('Login endpoint hit:', req.body);
        
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required.',
                success: false
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: 'Invalid email or password.',
                success: false
            });
        }

        if (!user.isVerified) {
            return res.status(401).json({
                message: 'Email not verified. Please verify your email first.',
                success: false
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                message: 'Invalid email or password.',
                success: false
            });
        }

        // Check if SECRET_KEY exists
        if (!process.env.SECRET_KEY) {
            console.error('SECRET_KEY environment variable is not set');
            return res.status(500).json({
                message: 'Server configuration error.',
                success: false
            });
        }

        const tokenData = {
            userId: user._id,
            userEmail: user.email
        }

        //generate jwt token
        const token = jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: '7d' })
        
        //send token in cookies
        res.cookie('token', token, { 
            httpOnly: true, 
            maxAge: 7 * 24 * 60 * 60 * 1000, 
            secure: process.env.NODE_ENV === 'production', 
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })

        res.status(200).json({
            message: 'Login Successfully',
            user: {
                id: user._id,
                email: user.email,
            },
            token,
            success: true
        })
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Server error. Please try again later.',
            success: false 
        });
    }
}
*/
import { User } from "../models/User.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { sendMail } from "../middlewares/emailTransporter.js"
import { connectDB } from "../utils/db.js"

//sign up
export const register = async (req, res) => {
    try {
        // Ensure database connection
        await connectDB();
        
        console.log('Register endpoint hit:', req.body);
        
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({
                message: "All fields are required.",
                success: false
            })
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Please provide a valid email address.",
                success: false
            });
        }

        const user = await User.findOne({ email })
        if (user) {
            return res.status(409).json({
                message: "User already exists.",
                success: false
            })
        }

        //hash password
        const hashedPassword = await bcrypt.hash(password, 10)
        const otp = Math.floor(100000 + Math.random() * 900000);
        
        // Create user first, then send email
        const newUser = new User({
            email,
            password: hashedPassword,
            emailOtp: otp,
            emailOtpExpiry: new Date(Date.now() + 10 * 60 * 1000),
            isVerified: false
        })
        
        await newUser.save()
        console.log('User saved to database with OTP:', otp);
        
        // Send email after user is created
        try {
            console.log('Attempting to send email to:', email);
            console.log('OTP being sent:', otp);
            await sendMail(email, otp);
            console.log('Email sent successfully to:', email);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            console.error('Email error details:', {
                message: emailError.message,
                stack: emailError.stack,
                code: emailError.code
            });
            
            // Optional: Delete user if email fails to send
            // await User.findByIdAndDelete(newUser._id);
            // return res.status(500).json({
            //     message: "Failed to send verification email. Please try again.",
            //     success: false
            // });
        }
        
        res.status(201).json({
            message: "User registered successfully. Please check your email for verification code.",
            user: {
                _id: newUser._id,
                email: newUser.email
            },
            success: true
        })
    } catch (error) {
        console.error('Registration error:', error);
        
        // More specific error handling
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Invalid user data provided.',
                success: false 
            });
        }
        
        if (error.code === 11000) {
            return res.status(409).json({ 
                message: 'User already exists.',
                success: false 
            });
        }
        
        res.status(500).json({ 
            message: 'Server error. Please try again later.',
            success: false 
        });
    }
}

//verify email
export const verifyEmail = async (req, res) => {
    try {
        // Ensure database connection
        await connectDB();
        
        console.log('Verify email endpoint hit:', req.body);
        
        const { email, emailOtp } = req.body
        if (!email || !emailOtp) {
            return res.status(400).json({
                message: 'Email and OTP are required',
                success: false
            })
        }

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                success: false
            })
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "User is already verified",
            });
        }

        if (Date.now() > user.emailOtpExpiry) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired",
            });
        }

        // Convert both to numbers for comparison
        console.log('Comparing OTPs - User OTP:', user.emailOtp, 'Provided OTP:', emailOtp);
        if (parseInt(user.emailOtp) !== parseInt(emailOtp)) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        // All checks passed – mark as verified
        user.isVerified = true;
        user.emailOtp = null;
        user.emailOtpExpiry = null;
        await user.save();

        console.log('User verified successfully:', email);
        return res.status(200).json({
            success: true,
            message: "Email verified successfully",
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ 
            message: 'Server error. Please try again later.',
            success: false 
        });
    }
}

export const resendOtp = async (req, res) => {
    try {
        // Ensure database connection
        await connectDB();
        
        console.log('Resend OTP endpoint hit:', req.body);
        
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                message: 'Email is required',
                success: false
            });
        }

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                success: false
            })
        }

        if (user.isVerified) {
            return res.status(400).json({
                message: 'User is already verified',
                success: false
            });
        }

        //generate new otp again
        const otp = Math.floor(100000 + Math.random() * 900000);
        user.emailOtp = otp
        user.emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000)

        await user.save()
        console.log('New OTP generated and saved:', otp);
        
        try {
            console.log('Attempting to resend OTP to:', email);
            console.log('New OTP being sent:', otp);
            await sendMail(email, otp)
            console.log('OTP resent successfully to:', email);
            
            return res.status(200).json({
                message: 'OTP sent successfully.',
                success: true
            })
        } catch (emailError) {
            console.error('Email sending failed during resend:', emailError);
            console.error('Resend email error details:', {
                message: emailError.message,
                stack: emailError.stack,
                code: emailError.code
            });
            return res.status(500).json({
                message: "Failed to send OTP. Please try again.",
                success: false
            });
        }

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ 
            message: 'Server error. Please try again later.',
            success: false 
        });
    }
}

//login
export const login = async (req, res) => {
    try {
        // Ensure database connection
        await connectDB();
        
        console.log('Login endpoint hit:', req.body);
        
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required.',
                success: false
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: 'Invalid email or password.',
                success: false
            });
        }

        if (!user.isVerified) {
            return res.status(401).json({
                message: 'Email not verified. Please verify your email first.',
                success: false
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                message: 'Invalid email or password.',
                success: false
            });
        }

        // Check if SECRET_KEY exists
        if (!process.env.SECRET_KEY) {
            console.error('SECRET_KEY environment variable is not set');
            return res.status(500).json({
                message: 'Server configuration error.',
                success: false
            });
        }

        const tokenData = {
            userId: user._id,
            userEmail: user.email
        }

        //generate jwt token
        const token = jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: '7d' })
        
        //send token in cookies
        res.cookie('token', token, { 
            httpOnly: true, 
            maxAge: 7 * 24 * 60 * 60 * 1000, 
            secure: process.env.NODE_ENV === 'production', 
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })

        res.status(200).json({
            message: 'Login Successfully',
            user: {
                id: user._id,
                email: user.email,
            },
            token,
            success: true
        })
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Server error. Please try again later.',
            success: false 
        });
    }
}

// Optional: Test email function for debugging
export const testEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const testOtp = 123456;
        
        console.log('Testing email send to:', email || 'test@example.com');
        await sendMail(email || 'test@example.com', testOtp);
        
        res.json({ 
            message: 'Test email sent successfully',
            success: true 
        });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ 
            error: error.message,
            success: false 
        });
    }
};
