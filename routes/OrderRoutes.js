import express from 'express';
import { 
    createOrder, 
    getOrder, 
    getOrdersByEmail, 
    updateOrderStatus,
    getAllOrders,
    deleteOrder
} from '../controllers/orderController.js';

const router = express.Router();

// Create new order
router.post('/create', createOrder);

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