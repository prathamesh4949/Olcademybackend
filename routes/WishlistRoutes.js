import express from 'express';
import {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    moveToCart,
    clearWishlist
} from '../controllers/wishlistController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All wishlist routes require authentication
router.use(authMiddleware);

// Get user's wishlist
router.get('/', getWishlist);

// Add item to wishlist
router.post('/add', addToWishlist);

// Remove item from wishlist
router.delete('/remove/:id', removeFromWishlist);

// Move item from wishlist to cart
router.post('/move-to-cart/:id', moveToCart);

// Clear entire wishlist
router.delete('/clear', clearWishlist);

export default router;