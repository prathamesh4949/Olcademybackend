// routes/userRoute.js
import express from 'express'
import { 
    login, 
    register, 
    resendOtp, 
    verifyEmail,
    checkUsernameAvailability 
} from '../controllers/userController.js';

const router = express.Router();

// Authentication routes
router.post('/signup', register)
router.post('/login', login)
router.post('/signup/verify-email', verifyEmail)
router.post('/signup/resend-otp', resendOtp)

// Username availability check route
router.get('/check-username/:username', checkUsernameAvailability)

export default router;