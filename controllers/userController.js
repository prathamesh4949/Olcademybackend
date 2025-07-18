import { User } from "../models/User.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { sendMail } from "../middlewares/emailTransporter.js"

//sign up
export const register = async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({
                message: "All fields are required.",
                success: false
            })
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
        await sendMail(email ,otp);

        const newUser = new User({
            email,
            password: hashedPassword,
            emailOtp: otp,
            emailOtpExpiry:new Date(Date.now() + 10 * 60 * 1000),
            isVerified:false
        })
        await newUser.save()
        res.status(201).json({
            message: "User registered successfully.",
            user: {
                _id: newUser._id,
                email: newUser.email
            },
            success:true
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
}

//verify email
export const verifyEmail = async (req,res)=>{
    try {
        const {email , emailOtp} = req.body
        if(!email || !emailOtp){
            return res.status(400).json({
                message:'Email and OTP are required',
                success:false
            })
        }
        const user = await User.findOne({email})
        if(!user){
            return res.status(404).json({
                message:'User not found',
                success:false
            })
        }
        if (user.isVerified) {
          return res.status(400).json({
            success: false,
            message: "User is already verified",
          });
        }
        if(Date.now() > user.emailOtpExpiry){
            return res.status(400).json({
            success: false,
            message: "OTP has expired",
          });
        }
         // Check if OTP matches
    if (user.emailOtp !== emailOtp) {
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
        console.log(error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
}

export const resendOtp = async (req,res)=>{
    try {
        const {email} = req.body;
        const user = await User.findOne({email})
        if(!user){
             return res.status(404).json({
                message:'User not found',
                success:false
            })
        }
        //generate new otp again
       const otp = Math.floor(100000 + Math.random() * 900000);
       user.emailOtp = otp
       user.emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000)

       await user.save()
       await sendMail(email,otp)
       return res.status(200).json({
        message:'Otp sent successfully.',
        success:true
       })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
}

//login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required.',
                success:false
            });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
             message: 'Invalid email or password.',
             success:false
            });
        }
        if(!user.isVerified){
             return res.status(401).json({
                message: 'Email not verified.',
                success:false
            });
        }
        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                message: 'Invalid email or password.',
                success:false
            });
        }

        const tokenData = {
            userId: user._id,
            userEmail: user.email
        }
        //generate jwt token
        const token = jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: '7d' })
        //send token in cookies
        res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', })

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
        console.log(error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
}


