import express from 'express'
import { login, register, resendOtp, verifyEmail } from '../controllers/userController.js';

const router = express.Router();

router.post('/signup', register)
router.post('/login', login)
router.post('/signup/verify-email', verifyEmail)
router.post('/signup/resend-otp', resendOtp)


export default router;