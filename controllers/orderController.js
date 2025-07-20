import { Order } from '../models/Order.js';
import mongoose from 'mongoose';

// Generate unique order number
const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${timestamp}${random}`;
};

// Create new order
export const createOrder = async (req, res) => {
    try {
        console.log('Creating order with data:', JSON.stringify(req.body, null, 2));

        const {
            customerInfo,
            items,
            paymentInfo,
            shippingOption,
            pricing,
            promoCode
        } = req.body;

        // Validate required fields
        if (!customerInfo) {
            return res.status(400).json({
                success: false,
                message: 'Customer information is required'
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order items are required'
            });
        }

        if (!paymentInfo) {
            return res.status(400).json({
                success: false,
                message: 'Payment information is required'
            });
        }

        if (!shippingOption) {
            return res.status(400).json({
                success: false,
                message: 'Shipping option is required'
            });
        }

        if (!pricing) {
            return res.status(400).json({
                success: false,
                message: 'Pricing information is required'
            });
        }

        // Generate unique order number
        const orderNumber = generateOrderNumber();

        // Process payment info securely (only store last 4 digits)
        const processedPaymentInfo = {
            method: paymentInfo.method,
            cardName: paymentInfo.cardName
        };

        // If credit card, extract last 4 digits
        if (paymentInfo.method === 'credit-card' && paymentInfo.cardNumber) {
            const cardNumber = paymentInfo.cardNumber.replace(/\s/g, '');
            processedPaymentInfo.cardLastFour = cardNumber.slice(-4);
        }

        // Create order object
        const orderData = {
            orderNumber,
            customerInfo: {
                name: customerInfo.name,
                email: customerInfo.email,
                phone: customerInfo.phone,
                address: customerInfo.address,
                city: customerInfo.city,
                state: customerInfo.state,
                zipCode: customerInfo.zipCode,
                country: customerInfo.country
            },
            items: items.map(item => ({
                name: item.name,
                price: parseFloat(item.price),
                image: item.image,
                quantity: item.quantity || 1
            })),
            paymentInfo: processedPaymentInfo,
            shippingOption,
            pricing: {
                subtotal: parseFloat(pricing.subtotal),
                shipping: parseFloat(pricing.shipping),
                tax: parseFloat(pricing.tax),
                discount: parseFloat(pricing.discount || 0),
                discountPercentage: parseFloat(pricing.discountPercentage || 0),
                total: parseFloat(pricing.total)
            },
            promoCode: promoCode || null,
            status: 'pending'
        };

        console.log('Processed order data:', JSON.stringify(orderData, null, 2));

        // Create and save order
        const order = new Order(orderData);
        const savedOrder = await order.save();

        console.log('Order saved successfully:', savedOrder.orderNumber);

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order: {
                orderNumber: savedOrder.orderNumber,
                status: savedOrder.status,
                total: savedOrder.pricing.total,
                createdAt: savedOrder.createdAt
            }
        });

    } catch (error) {
        console.error('Error creating order:', error);

        // Handle specific mongoose errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: validationErrors
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Order number already exists. Please try again.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Get order by order number
export const getOrder = async (req, res) => {
    try {
        const { orderNumber } = req.params;

        if (!orderNumber) {
            return res.status(400).json({
                success: false,
                message: 'Order number is required'
            });
        }

        const order = await Order.findOne({ orderNumber });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            order
        });

    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Get orders by email
export const getOrdersByEmail = async (req, res) => {
    try {
        const { email } = req.params;
        const { page = 1, limit = 10, status } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Build query
        const query = { 'customerInfo.email': email };
        if (status) {
            query.status = status;
        }

        // Calculate skip value for pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get orders with pagination
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const totalOrders = await Order.countDocuments(query);

        res.json({
            success: true,
            orders,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalOrders / parseInt(limit)),
                totalOrders,
                hasNext: skip + orders.length < totalOrders,
                hasPrev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching orders by email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const { status } = req.body;

        if (!orderNumber) {
            return res.status(400).json({
                success: false,
                message: 'Order number is required'
            });
        }

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        // Validate status
        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
            });
        }

        const order = await Order.findOneAndUpdate(
            { orderNumber },
            { 
                status,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            message: 'Order status updated successfully',
            order: {
                orderNumber: order.orderNumber,
                status: order.status,
                updatedAt: order.updatedAt
            }
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Get all orders (admin function)
export const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, email } = req.query;

        // Build query
        const query = {};
        if (status) query.status = status;
        if (email) query['customerInfo.email'] = { $regex: email, $options: 'i' };

        // Calculate skip value for pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get orders with pagination
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const totalOrders = await Order.countDocuments(query);

        res.json({
            success: true,
            orders,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalOrders / parseInt(limit)),
                totalOrders,
                hasNext: skip + orders.length < totalOrders,
                hasPrev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Delete order (admin function)
export const deleteOrder = async (req, res) => {
    try {
        const { orderNumber } = req.params;

        if (!orderNumber) {
            return res.status(400).json({
                success: false,
                message: 'Order number is required'
            });
        }

        const order = await Order.findOneAndDelete({ orderNumber });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            message: 'Order deleted successfully',
            deletedOrder: {
                orderNumber: order.orderNumber,
                customerEmail: order.customerInfo.email
            }
        });

    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete order',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};