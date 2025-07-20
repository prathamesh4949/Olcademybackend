import express from 'express';
import { 
    createOrder, 
    getOrder, 
    getOrdersByEmail, 
    updateOrderStatus,
    getAllOrders,
    deleteOrder
} from '../controllers/orderController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js'; // Import auth middleware

const router = express.Router();

// Create new order (protected)
router.post('/create', authMiddleware, createOrder);

// Get order by order number
router.get('/:orderNumber', getOrder);

// Get orders by email
router.get('/email/:email', getOrdersByEmail);

// Update order status
router.put('/:orderNumber/status', updateOrderStatus);

// Admin routes (you might want to add authentication middleware here)
// Get all orders (admin)
router.get('/', getAllOrders);

// Delete order (admin)
router.delete('/:orderNumber', deleteOrder);

export default router;