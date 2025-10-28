// // routes/orderRoutes.js
// import express from 'express';
// import {
//     createOrder,
//     getOrder,
//     getOrdersByEmail,
//     updateOrderStatus,
//     getAllOrders,
//     deleteOrder,
//     getOrderStatistics,
//     bulkUpdateOrderStatus
// } from '../controllers/orderController.js';
// import { authMiddleware, adminMiddleware, adminOrOwnerMiddleware } from '../middlewares/authMiddleware.js';

// const router = express.Router();

// // Public/Customer routes
// // Create new order (can be used by guests or authenticated users)
// router.post('/create', createOrder);

// // Get order by order number (public access but with restrictions)
// router.get('/:orderNumber', getOrder);

// // Protected user routes
// // Get orders by email (user can only see their own orders unless admin)
// router.get('/email/:email', authMiddleware, getOrdersByEmail);

// // Get user's own orders (alternative endpoint)
// router.get('/user/my-orders', authMiddleware, async (req, res, next) => {
//     req.params.email = req.user.email;
//     return getOrdersByEmail(req, res, next);
// });

// // Admin-only routes
// // Get all orders with advanced filtering and statistics
// router.get('/', adminMiddleware, getAllOrders);

// // Get order statistics and analytics
// router.get('/admin/statistics', adminMiddleware, getOrderStatistics);

// // Update single order status
// router.put('/:orderNumber/status', adminMiddleware, updateOrderStatus);

// // Bulk update order status
// router.patch('/admin/bulk-update-status', adminMiddleware, bulkUpdateOrderStatus);

// // Delete order (admin only)
// router.delete('/:orderNumber', adminMiddleware, deleteOrder);

// // Additional admin routes for enhanced functionality

// // Update order tracking information
// router.patch('/:orderNumber/tracking', adminMiddleware, async (req, res) => {
//     try {
//         const { orderNumber } = req.params;
//         const { trackingNumber, carrier } = req.body;
        
//         const { Order } = await import('../models/Order.js');
        
//         const order = await Order.findOneAndUpdate(
//             { orderNumber },
//             { 
//                 trackingNumber,
//                 carrier,
//                 updatedAt: new Date()
//             },
//             { new: true }
//         );

//         if (!order) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Order not found'
//             });
//         }

//         res.json({
//             success: true,
//             message: 'Tracking information updated successfully',
//             order: {
//                 orderNumber: order.orderNumber,
//                 trackingNumber: order.trackingNumber,
//                 carrier: order.carrier
//             }
//         });
//     } catch (error) {
//         console.error('Error updating tracking info:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to update tracking information'
//         });
//     }
// });

// // Add admin notes to order
// router.patch('/:orderNumber/admin-notes', adminMiddleware, async (req, res) => {
//     try {
//         const { orderNumber } = req.params;
//         const { adminNotes } = req.body;
        
//         const { Order } = await import('../models/Order.js');
        
//         const order = await Order.findOneAndUpdate(
//             { orderNumber },
//             { 
//                 adminNotes,
//                 updatedAt: new Date()
//             },
//             { new: true }
//         );

//         if (!order) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Order not found'
//             });
//         }

//         res.json({
//             success: true,
//             message: 'Admin notes updated successfully',
//             order: {
//                 orderNumber: order.orderNumber,
//                 adminNotes: order.adminNotes
//             }
//         });
//     } catch (error) {
//         console.error('Error updating admin notes:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to update admin notes'
//         });
//     }
// });

// // Get orders by status (admin)
// router.get('/admin/status/:status', adminMiddleware, async (req, res) => {
//     try {
//         const { status } = req.params;
//         const { page = 1, limit = 10 } = req.query;
        
//         const { Order } = await import('../models/Order.js');
        
//         const skip = (parseInt(page) - 1) * parseInt(limit);
        
//         const orders = await Order.find({ status })
//             .sort({ createdAt: -1 })
//             .skip(skip)
//             .limit(parseInt(limit));

//         const totalOrders = await Order.countDocuments({ status });

//         res.json({
//             success: true,
//             orders,
//             pagination: {
//                 currentPage: parseInt(page),
//                 totalPages: Math.ceil(totalOrders / parseInt(limit)),
//                 totalOrders,
//                 hasNext: skip + orders.length < totalOrders,
//                 hasPrev: parseInt(page) > 1
//             }
//         });
//     } catch (error) {
//         console.error('Error fetching orders by status:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to fetch orders by status'
//         });
//     }
// });

// // Export orders to CSV (admin)
// router.get('/admin/export/csv', adminMiddleware, async (req, res) => {
//     try {
//         const { startDate, endDate, status } = req.query;
        
//         const { Order } = await import('../models/Order.js');
        
//         const query = {};
//         if (status && status !== 'all') query.status = status;
//         if (startDate && endDate) {
//             query.createdAt = {
//                 $gte: new Date(startDate),
//                 $lte: new Date(endDate)
//             };
//         }

//         const orders = await Order.find(query).sort({ createdAt: -1 });

//         // Convert to CSV format
//         const csvHeader = 'Order Number,Customer Name,Customer Email,Status,Total,Items Count,Created Date,Updated Date\n';
//         const csvData = orders.map(order => {
//             return `${order.orderNumber},"${order.customerInfo.name}","${order.customerInfo.email}",${order.status},${order.pricing.total},${order.totalItems},"${order.createdAt.toISOString()}","${order.updatedAt.toISOString()}"`;
//         }).join('\n');

//         const csv = csvHeader + csvData;

//         res.setHeader('Content-Type', 'text/csv');
//         res.setHeader('Content-Disposition', `attachment; filename=orders-export-${new Date().toISOString().split('T')[0]}.csv`);
//         res.send(csv);
//     } catch (error) {
//         console.error('Error exporting orders to CSV:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to export orders'
//         });
//     }
// });

// // Get order analytics (admin)
// router.get('/admin/analytics', adminMiddleware, async (req, res) => {
//     try {
//         const { timeframe = '30' } = req.query;
//         const daysAgo = parseInt(timeframe);
//         const startDate = new Date();
//         startDate.setDate(startDate.getDate() - daysAgo);

//         const { Order } = await import('../models/Order.js');

//         // Daily order statistics
//         const dailyStats = await Order.aggregate([
//             {
//                 $match: {
//                     createdAt: { $gte: startDate }
//                 }
//             },
//             {
//                 $group: {
//                     _id: {
//                         date: {
//                             $dateToString: {
//                                 format: '%Y-%m-%d',
//                                 date: '$createdAt'
//                             }
//                         }
//                     },
//                     orderCount: { $sum: 1 },
//                     totalRevenue: { $sum: '$pricing.total' },
//                     avgOrderValue: { $avg: '$pricing.total' }
//                 }
//             },
//             {
//                 $sort: { '_id.date': 1 }
//             }
//         ]);

//         // Status distribution
//         const statusDistribution = await Order.aggregate([
//             {
//                 $group: {
//                     _id: '$status',
//                     count: { $sum: 1 },
//                     totalAmount: { $sum: '$pricing.total' }
//                 }
//             }
//         ]);

//         // Top customers by order count
//         const topCustomers = await Order.aggregate([
//             {
//                 $group: {
//                     _id: '$customerInfo.email',
//                     customerName: { $first: '$customerInfo.name' },
//                     orderCount: { $sum: 1 },
//                     totalSpent: { $sum: '$pricing.total' },
//                     avgOrderValue: { $avg: '$pricing.total' }
//                 }
//             },
//             {
//                 $sort: { orderCount: -1 }
//             },
//             {
//                 $limit: 10
//             }
//         ]);

//         // Payment method distribution
//         const paymentMethods = await Order.aggregate([
//             {
//                 $group: {
//                     _id: '$paymentInfo.method',
//                     count: { $sum: 1 },
//                     totalAmount: { $sum: '$pricing.total' }
//                 }
//             }
//         ]);

//         // Monthly trends (last 12 months)
//         const monthlyTrends = await Order.aggregate([
//             {
//                 $match: {
//                     createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
//                 }
//             },
//             {
//                 $group: {
//                     _id: {
//                         year: { $year: '$createdAt' },
//                         month: { $month: '$createdAt' }
//                     },
//                     orderCount: { $sum: 1 },
//                     totalRevenue: { $sum: '$pricing.total' },
//                     avgOrderValue: { $avg: '$pricing.total' }
//                 }
//             },
//             {
//                 $sort: { '_id.year': 1, '_id.month': 1 }
//             }
//         ]);

//         res.json({
//             success: true,
//             analytics: {
//                 dailyStats,
//                 statusDistribution,
//                 topCustomers,
//                 paymentMethods,
//                 monthlyTrends,
//                 timeframe: `${timeframe} days`
//             }
//         });
//     } catch (error) {
//         console.error('Error fetching analytics:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to fetch analytics data'
//         });
//     }
// });

// // Search orders (admin)
// router.get('/admin/search', adminMiddleware, async (req, res) => {
//     try {
//         const { q, page = 1, limit = 10 } = req.query;
        
//         if (!q || q.trim().length < 2) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Search query must be at least 2 characters long'
//             });
//         }

//         const { Order } = await import('../models/Order.js');
        
//         const searchQuery = {
//             $or: [
//                 { orderNumber: { $regex: q, $options: 'i' } },
//                 { 'customerInfo.name': { $regex: q, $options: 'i' } },
//                 { 'customerInfo.email': { $regex: q, $options: 'i' } },
//                 { 'customerInfo.phone': { $regex: q, $options: 'i' } },
//                 { trackingNumber: { $regex: q, $options: 'i' } }
//             ]
//         };

//         const skip = (parseInt(page) - 1) * parseInt(limit);
        
//         const orders = await Order.find(searchQuery)
//             .sort({ createdAt: -1 })
//             .skip(skip)
//             .limit(parseInt(limit));

//         const totalOrders = await Order.countDocuments(searchQuery);

//         res.json({
//             success: true,
//             orders,
//             searchQuery: q,
//             pagination: {
//                 currentPage: parseInt(page),
//                 totalPages: Math.ceil(totalOrders / parseInt(limit)),
//                 totalOrders,
//                 hasNext: skip + orders.length < totalOrders,
//                 hasPrev: parseInt(page) > 1
//             }
//         });
//     } catch (error) {
//         console.error('Error searching orders:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to search orders'
//         });
//     }
// });

// // Customer feedback routes
// // Submit order review (customer)
// router.post('/:orderNumber/review', authMiddleware, async (req, res) => {
//     try {
//         const { orderNumber } = req.params;
//         const { rating, review } = req.body;
        
//         if (!rating || rating < 1 || rating > 5) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Rating must be between 1 and 5'
//             });
//         }

//         const { Order } = await import('../models/Order.js');
        
//         const order = await Order.findOne({ orderNumber });
        
//         if (!order) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Order not found'
//             });
//         }

//         // Check if user can review this order
//         if (order.customerInfo.email !== req.user.email && !req.user.isAdmin) {
//             return res.status(403).json({
//                 success: false,
//                 message: 'You can only review your own orders'
//             });
//         }

//         // Check if order is delivered
//         if (order.status !== 'delivered') {
//             return res.status(400).json({
//                 success: false,
//                 message: 'You can only review delivered orders'
//             });
//         }

//         order.rating = rating;
//         order.review = review;
//         await order.save();

//         res.json({
//             success: true,
//             message: 'Review submitted successfully',
//             order: {
//                 orderNumber: order.orderNumber,
//                 rating: order.rating,
//                 review: order.review
//             }
//         });
//     } catch (error) {
//         console.error('Error submitting review:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to submit review'
//         });
//     }
// });

// // Get order reviews (admin)
// router.get('/admin/reviews', adminMiddleware, async (req, res) => {
//     try {
//         const { page = 1, limit = 10, minRating, maxRating } = req.query;
        
//         const { Order } = await import('../models/Order.js');
        
//         const query = { rating: { $exists: true } };
        
//         if (minRating) query.rating.$gte = parseInt(minRating);
//         if (maxRating) query.rating.$lte = parseInt(maxRating);

//         const skip = (parseInt(page) - 1) * parseInt(limit);
        
//         const orders = await Order.find(query)
//             .select('orderNumber customerInfo.name customerInfo.email rating review createdAt')
//             .sort({ createdAt: -1 })
//             .skip(skip)
//             .limit(parseInt(limit));

//         const totalReviews = await Order.countDocuments(query);
        
//         // Calculate average rating
//         const avgRating = await Order.aggregate([
//             { $match: { rating: { $exists: true } } },
//             { $group: { _id: null, avgRating: { $avg: '$rating' } } }
//         ]);

//         res.json({
//             success: true,
//             reviews: orders,
//             averageRating: avgRating[0]?.avgRating || 0,
//             pagination: {
//                 currentPage: parseInt(page),
//                 totalPages: Math.ceil(totalReviews / parseInt(limit)),
//                 totalReviews,
//                 hasNext: skip + orders.length < totalReviews,
//                 hasPrev: parseInt(page) > 1
//             }
//         });
//     } catch (error) {
//         console.error('Error fetching reviews:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to fetch reviews'
//         });
//     }
// });

// export default router;


// 2nd


import express from 'express';
import {
    createOrder,
    getOrder,
    getOrdersByEmail,
    updateOrderStatus,
    getAllOrders,
    deleteOrder,
    getOrderStatistics,
    bulkUpdateOrderStatus,
    getOrderInvoice
} from '../controllers/orderController.js';
import { authMiddleware, adminMiddleware, adminOrOwnerMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public/Customer routes
// Create new order (can be used by guests or authenticated users)
router.post('/create', createOrder);

// Get order by order number (public access but with restrictions)
router.get('/:orderNumber', getOrder);

// Get invoice for one order (for download)
router.get('/:orderNumber/invoice', getOrderInvoice);

// Protected user routes
// Get orders by email (user can only see their own orders unless admin)
router.get('/email/:email', authMiddleware, getOrdersByEmail);

// Get user's own orders (alternative endpoint)
router.get('/user/my-orders', authMiddleware, async (req, res, next) => {
    req.params.email = req.user.email;
    return getOrdersByEmail(req, res, next);
});

// Admin-only routes
// Get all orders with advanced filtering and statistics
router.get('/', adminMiddleware, getAllOrders);

// Get order statistics and analytics
router.get('/admin/statistics', adminMiddleware, getOrderStatistics);

// Update single order status
router.put('/:orderNumber/status', adminMiddleware, updateOrderStatus);

// Bulk update order status
router.patch('/admin/bulk-update-status', adminMiddleware, bulkUpdateOrderStatus);

// Delete order (admin only)
router.delete('/:orderNumber', adminMiddleware, deleteOrder);

// Additional admin routes for enhanced functionality

// Update order tracking information
router.patch('/:orderNumber/tracking', adminMiddleware, async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const { trackingNumber, carrier } = req.body;
        
        const { Order } = await import('../models/Order.js');
        
        const order = await Order.findOneAndUpdate(
            { orderNumber },
            { 
                trackingNumber,
                carrier,
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
            message: 'Tracking information updated successfully',
            order: {
                orderNumber: order.orderNumber,
                trackingNumber: order.trackingNumber,
                carrier: order.carrier
            }
        });
    } catch (error) {
        console.error('Error updating tracking info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update tracking information'
        });
    }
});

// Add admin notes to order
router.patch('/:orderNumber/admin-notes', adminMiddleware, async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const { adminNotes } = req.body;
        
        const { Order } = await import('../models/Order.js');
        
        const order = await Order.findOneAndUpdate(
            { orderNumber },
            { 
                adminNotes,
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
            message: 'Admin notes updated successfully',
            order: {
                orderNumber: order.orderNumber,
                adminNotes: order.adminNotes
            }
        });
    } catch (error) {
        console.error('Error updating admin notes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update admin notes'
        });
    }
});

// Get orders by status (admin)
router.get('/admin/status/:status', adminMiddleware, async (req, res) => {
    try {
        const { status } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        const { Order } = await import('../models/Order.js');
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const orders = await Order.find({ status })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalOrders = await Order.countDocuments({ status });

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
        console.error('Error fetching orders by status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders by status'
        });
    }
});

// Export orders to CSV (admin)
router.get('/admin/export/csv', adminMiddleware, async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        
        const { Order } = await import('../models/Order.js');
        
        const query = {};
        if (status && status !== 'all') query.status = status;
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const orders = await Order.find(query).sort({ createdAt: -1 });

        // Convert to CSV format
        const csvHeader = 'Order Number,Customer Name,Customer Email,Status,Total,Items Count,Created Date,Updated Date\n';
        const csvData = orders.map(order => {
            return `${order.orderNumber},"${order.customerInfo.name}","${order.customerInfo.email}",${order.status},${order.pricing.total},${order.totalItems},"${order.createdAt.toISOString()}","${order.updatedAt.toISOString()}"`;
        }).join('\n');

        const csv = csvHeader + csvData;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=orders-export-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('Error exporting orders to CSV:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export orders'
        });
    }
});

// Get order analytics (admin)
router.get('/admin/analytics', adminMiddleware, async (req, res) => {
    try {
        const { timeframe = '30' } = req.query;
        const daysAgo = parseInt(timeframe);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);

        const { Order } = await import('../models/Order.js');

        // Daily order statistics
        const dailyStats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        date: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$createdAt'
                            }
                        }
                    },
                    orderCount: { $sum: 1 },
                    totalRevenue: { $sum: '$pricing.total' },
                    avgOrderValue: { $avg: '$pricing.total' }
                }
            },
            {
                $sort: { '_id.date': 1 }
            }
        ]);

        // Status distribution
        const statusDistribution = await Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$pricing.total' }
                }
            }
        ]);

        // Top customers by order count
        const topCustomers = await Order.aggregate([
            {
                $group: {
                    _id: '$customerInfo.email',
                    customerName: { $first: '$customerInfo.name' },
                    orderCount: { $sum: 1 },
                    totalSpent: { $sum: '$pricing.total' },
                    avgOrderValue: { $avg: '$pricing.total' }
                }
            },
            {
                $sort: { orderCount: -1 }
            },
            {
                $limit: 10
            }
        ]);

        // Payment method distribution
        const paymentMethods = await Order.aggregate([
            {
                $group: {
                    _id: '$paymentInfo.method',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$pricing.total' }
                }
            }
        ]);

        // Monthly trends (last 12 months)
        const monthlyTrends = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    orderCount: { $sum: 1 },
                    totalRevenue: { $sum: '$pricing.total' },
                    avgOrderValue: { $avg: '$pricing.total' }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        res.json({
            success: true,
            analytics: {
                dailyStats,
                statusDistribution,
                topCustomers,
                paymentMethods,
                monthlyTrends,
                timeframe: `${timeframe} days`
            }
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics data'
        });
    }
});

// Search orders (admin)
router.get('/admin/search', adminMiddleware, async (req, res) => {
    try {
        const { q, page = 1, limit = 10 } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters long'
            });
        }

        const { Order } = await import('../models/Order.js');
        
        const searchQuery = {
            $or: [
                { orderNumber: { $regex: q, $options: 'i' } },
                { 'customerInfo.name': { $regex: q, $options: 'i' } },
                { 'customerInfo.email': { $regex: q, $options: 'i' } },
                { 'customerInfo.phone': { $regex: q, $options: 'i' } },
                { trackingNumber: { $regex: q, $options: 'i' } }
            ]
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const orders = await Order.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalOrders = await Order.countDocuments(searchQuery);

        res.json({
            success: true,
            orders,
            searchQuery: q,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalOrders / parseInt(limit)),
                totalOrders,
                hasNext: skip + orders.length < totalOrders,
                hasPrev: parseInt(page) > 1
            }
        });
    } catch (error) {
        console.error('Error searching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search orders'
        });
    }
});

// Customer feedback routes
// Submit order review (customer)
router.post('/:orderNumber/review', authMiddleware, async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const { rating, review } = req.body;
        
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        const { Order } = await import('../models/Order.js');
        
        const order = await Order.findOne({ orderNumber });
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user can review this order
        if (order.customerInfo.email !== req.user.email && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'You can only review your own orders'
            });
        }

        // Check if order is delivered
        if (order.status !== 'delivered') {
            return res.status(400).json({
                success: false,
                message: 'You can only review delivered orders'
            });
        }

        order.rating = rating;
        order.review = review;
        await order.save();

        res.json({
            success: true,
            message: 'Review submitted successfully',
            order: {
                orderNumber: order.orderNumber,
                rating: order.rating,
                review: order.review
            }
        });
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit review'
        });
    }
});

// Get order reviews (admin)
router.get('/admin/reviews', adminMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 10, minRating, maxRating } = req.query;
        
        const { Order } = await import('../models/Order.js');
        
        const query = { rating: { $exists: true } };
        
        if (minRating) query.rating.$gte = parseInt(minRating);
        if (maxRating) query.rating.$lte = parseInt(maxRating);

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const orders = await Order.find(query)
            .select('orderNumber customerInfo.name customerInfo.email rating review createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalReviews = await Order.countDocuments(query);
        
        // Calculate average rating
        const avgRating = await Order.aggregate([
            { $match: { rating: { $exists: true } } },
            { $group: { _id: null, avgRating: { $avg: '$rating' } } }
        ]);

        res.json({
            success: true,
            reviews: orders,
            averageRating: avgRating[0]?.avgRating || 0,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalReviews / parseInt(limit)),
                totalReviews,
                hasNext: skip + orders.length < totalReviews,
                hasPrev: parseInt(page) > 1
            }
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews'
        });
    }
});

export default router;
