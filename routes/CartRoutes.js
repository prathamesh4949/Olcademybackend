import express from 'express';
import { 
    getCart, 
    addToCart, 
    removeFromCart, 
    clearCart, 
    updateCartItemQuantity 
} from '../controllers/cartController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All cart routes require authentication
router.use(authMiddleware);

// Get user's cart
router.get('/', getCart);

// Add item to cart
router.post('/add', addToCart);

// Remove item from cart
router.delete('/remove/:id', removeFromCart);

// Update item quantity
router.put('/update/:id', updateCartItemQuantity);

// Clear entire cart
router.delete('/clear', clearCart);

export default router;