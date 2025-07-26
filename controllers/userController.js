import { User } from "../models/User.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { sendMail, testEmailConfiguration } from "../middlewares/emailTransporter.js"
import { connectDB } from "../utils/db.js"

//sign up
export const register = async (req, res) => {
    try {
        // Ensure database connection
        await connectDB();
        
        console.log('Register endpoint hit:', req.body);
        
        const { username, email, password } = req.body
        if (!username || !email || !password) {
            return res.status(400).json({
                message: "All fields are required.",
                success: false
            })
        }

        // Username validation
        if (username.length < 3) {
            return res.status(400).json({
                message: "Username must be at least 3 characters long.",
                success: false
            });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({
                message: "Username can only contain letters, numbers, and underscores.",
                success: false
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Please provide a valid email address.",
                success: false
            });
        }

        // Password validation
        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long.",
                success: false
            });
        }

        // Check if user already exists (email or username)
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(409).json({
                    message: "Email is already registered.",
                    success: false
                });
            }
            if (existingUser.username === username) {
                return res.status(409).json({
                    message: "Username is already taken.",
                    success: false
                });
            }
        }

        //hash password
        const hashedPassword = await bcrypt.hash(password, 10)
        const otp = Math.floor(100000 + Math.random() * 900000);
        
        // Create user first, then send email
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            emailOtp: otp,
            emailOtpExpiry: new Date(Date.now() + 10 * 60 * 1000),
            isVerified: false,
            isAdmin: false // Default to false, can be changed directly in database
        })
        
        await newUser.save()
        console.log('✅ User saved to database with OTP:', otp);
        
        // Send email after user is created with enhanced error handling
        let emailSent = false;
        try {
            console.log('📧 Attempting to send email to:', email);
            console.log('🔢 OTP being sent:', otp);
            
            const emailResult = await sendMail(email, otp);
            console.log('✅ Email sent successfully to:', email);
            console.log('📬 Email result:', emailResult);
            emailSent = true;
            
        } catch (emailError) {
            console.error('❌ Email sending failed:', emailError);
            console.error('Email error details:', {
                message: emailError.message,
                stack: emailError.stack,
                code: emailError.code,
                response: emailError.response
            });
            
            // Don't delete user, but inform about email issue
            emailSent = false;
        }
        
        // Always return success for user creation, but inform about email status
        res.status(201).json({
            message: emailSent 
                ? "User registered successfully. Please check your email for verification code." 
                : "User registered successfully, but we couldn't send the verification email. Please try resending the OTP.",
            user: {
                _id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                isAdmin: newUser.isAdmin
            },
            emailSent: emailSent,
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
            // Handle duplicate key error
            const field = Object.keys(error.keyPattern)[0];
            const message = field === 'email' 
                ? 'Email is already registered.' 
                : field === 'username' 
                ? 'Username is already taken.'
                : 'User already exists.';
            
            return res.status(409).json({ 
                message,
                success: false 
            });
        }
        
        res.status(500).json({ 
            message: 'Server error. Please try again later.',
            success: false 
        });
    }
}

// Check username availability
export const checkUsernameAvailability = async (req, res) => {
    try {
        await connectDB();
        
        const { username } = req.params;
        
        if (!username || username.length < 3) {
            return res.status(400).json({
                available: false,
                message: "Username must be at least 3 characters long.",
                success: false
            });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({
                available: false,
                message: "Username can only contain letters, numbers, and underscores.",
                success: false
            });
        }

        const existingUser = await User.findOne({ username });
        
        if (existingUser) {
            return res.status(200).json({
                available: false,
                message: "Username is already taken.",
                success: true
            });
        }

        return res.status(200).json({
            available: true,
            message: "Username is available.",
            success: true
        });

    } catch (error) {
        console.error('Username availability check error:', error);
        res.status(500).json({
            available: false,
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

        console.log('✅ User verified successfully:', email);
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
        user.emailOtpExpiry = new Date(Date.now() + 10 * 60 * 60 * 1000)

        await user.save()
        console.log('✅ New OTP generated and saved:', otp);
        
        try {
            console.log('📧 Attempting to resend OTP to:', email);
            console.log('🔢 New OTP being sent:', otp);
            
            const emailResult = await sendMail(email, otp);
            console.log('✅ OTP resent successfully to:', email);
            console.log('📬 Email result:', emailResult);
            
            return res.status(200).json({
                message: 'OTP sent successfully.',
                success: true
            })
            
        } catch (emailError) {
            console.error('❌ Email sending failed during resend:', emailError);
            console.error('Resend email error details:', {
                message: emailError.message,
                stack: emailError.stack,
                code: emailError.code,
                response: emailError.response
            });
            
            return res.status(500).json({
                message: "Failed to send OTP. Please try again or check your email configuration.",
                success: false,
                error: emailError.message
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
            userEmail: user.email,
            username: user.username,
            isAdmin: user.isAdmin // Include isAdmin in token payload
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
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin // Include isAdmin in response
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

// Enhanced test email function for debugging
export const testEmail = async (req, res) => {
    try {
        console.log('=== TESTING EMAIL FUNCTIONALITY ===');
        
        // Test email configuration first
        const configTest = await testEmailConfiguration();
        console.log('Configuration test result:', configTest);
        
        if (!configTest.oauth2 || !configTest.transporter) {
            return res.status(500).json({
                message: 'Email configuration test failed',
                error: configTest.error,
                success: false
            });
        }
        
        // Test actual email sending
        const { email } = req.body;
        const testEmail = email || 'test@example.com';
        const testOtp = 123456;
        
        console.log('Testing email send to:', testEmail);
        const result = await sendMail(testEmail, testOtp);
        
        res.json({ 
            message: 'Test email sent successfully',
            messageId: result.messageId,
            response: result.response,
            success: true 
        });
        
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack,
            success: false 
        });
    }
};

// Get user profile (protected route)
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password -emailOtp -emailOtpExpiry');
        
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                success: false
            });
        }

        res.status(200).json({
            message: 'User profile retrieved successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin,
                isVerified: user.isVerified,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            },
            success: true
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            message: 'Server error. Please try again later.',
            success: false
        });
    }
};