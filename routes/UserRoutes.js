// routes/userRoute.js
import express from 'express'
import { 
    login, 
    register, 
    resendOtp, 
    verifyEmail,
    checkUsernameAvailability,
    getUserProfile,
    updateUserProfile,
    getShipment,
    updateShipment
} from '../controllers/userController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes - Authentication
router.post('/signup', register)
router.post('/login', login)
router.post('/signup/verify-email', verifyEmail)
router.post('/signup/resend-otp', resendOtp)

// Public routes - Username availability check
router.get('/check-username/:username', checkUsernameAvailability)

// Protected routes - Require authentication
router.get('/profile', authMiddleware, getUserProfile)
router.put('/profile', authMiddleware, updateUserProfile);

// Shipment routes - authenticated user
router.get('/shipment', authMiddleware, getShipment);
router.put('/shipment', authMiddleware, updateShipment);

// Admin routes - Require admin privileges
// Example: Get all users (admin only)
router.get('/admin/users', adminMiddleware, async (req, res) => {
    try {
        const { User } = await import('../models/User.js');
        const users = await User.find({}).select('-password -emailOtp -emailOtpExpiry');
        
        res.status(200).json({
            message: 'Users retrieved successfully',
            users,
            success: true
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            message: 'Server error. Please try again later.',
            success: false
        });
    }
});

// Example: Update user admin status (admin only)
router.patch('/admin/users/:userId/admin-status', adminMiddleware, async (req, res) => {
    try {
        const { User } = await import('../models/User.js');
        const { userId } = req.params;
        const { isAdmin } = req.body;

        if (typeof isAdmin !== 'boolean') {
            return res.status(400).json({
                message: 'isAdmin must be a boolean value',
                success: false
            });
        }

        const user = await User.findByIdAndUpdate(
            userId, 
            { isAdmin }, 
            { new: true }
        ).select('-password -emailOtp -emailOtpExpiry');

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                success: false
            });
        }

        res.status(200).json({
            message: `User admin status updated to ${isAdmin}`,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin,
                isVerified: user.isVerified
            },
            success: true
        });
    } catch (error) {
        console.error('Update admin status error:', error);
        res.status(500).json({
            message: 'Server error. Please try again later.',
            success: false
        });
    }
});

export default router;