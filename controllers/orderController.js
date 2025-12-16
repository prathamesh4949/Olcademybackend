import { Order } from '../models/Order.js';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';

// Import Product model - adjust path as needed
import Product from '../models/Product.js';

// Generate unique order number
const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${timestamp}${random}`;
};

// Create new order with stock management
export const createOrder = async (req, res) => {
    // Start a MongoDB session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

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
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Customer information is required'
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Order items are required'
            });
        }

        if (!paymentInfo) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Payment information is required'
            });
        }

        if (!shippingOption) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Shipping option is required'
            });
        }

        if (!pricing) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Pricing information is required'
            });
        }

        // ============ STOCK VALIDATION AND REDUCTION ============
        const stockValidationErrors = [];
        const productsToUpdate = [];

        for (const item of items) {
            // FIXED: Handle multiple possible product ID fields
            const productId = item.productId || item._id || item.id;
            
            if (!productId) {
                stockValidationErrors.push(`Product ID missing for item "${item.name}"`);
                continue;
            }

            // Find product by ID
            const product = await Product.findById(productId).session(session);
            
            if (!product) {
                stockValidationErrors.push(`Product "${item.name}" not found`);
                continue;
            }

            // Check if product is active
            if (!product.isActive) {
                stockValidationErrors.push(`Product "${item.name}" is no longer available`);
                continue;
            }

            const requestedQuantity = item.quantity || 1;

            // Handle size-specific stock if size is selected
            if (item.selectedSize) {
                const sizeOption = product.sizes.find(s => s.size === item.selectedSize);
                
                if (!sizeOption) {
                    stockValidationErrors.push(
                        `Size "${item.selectedSize}" not found for product "${item.name}"`
                    );
                    continue;
                }

                if (!sizeOption.available) {
                    stockValidationErrors.push(
                        `Size "${item.selectedSize}" is not available for product "${item.name}"`
                    );
                    continue;
                }

                // Check size-specific stock
                if (sizeOption.stock < requestedQuantity) {
                    stockValidationErrors.push(
                        `Insufficient stock for "${item.name}" (Size: ${item.selectedSize}). Available: ${sizeOption.stock}, Requested: ${requestedQuantity}`
                    );
                    continue;
                }

                // Store product, size, and quantity for later update
                productsToUpdate.push({
                    product,
                    productId,
                    quantity: requestedQuantity,
                    selectedSize: item.selectedSize
                });
            } else {
                // Handle general product stock (no size selected)
                if (product.stock < requestedQuantity) {
                    stockValidationErrors.push(
                        `Insufficient stock for "${item.name}". Available: ${product.stock}, Requested: ${requestedQuantity}`
                    );
                    continue;
                }

                // Store product and quantity for later update
                productsToUpdate.push({
                    product,
                    productId,
                    quantity: requestedQuantity,
                    selectedSize: null
                });
            }
        }

        // If there are any stock validation errors, abort the transaction
        if (stockValidationErrors.length > 0) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Stock validation failed',
                errors: stockValidationErrors
            });
        }

        // Generate unique order number
        let orderNumber;
        let orderNumberExists = true;
        let attempts = 0;
        const maxAttempts = 10;

        while (orderNumberExists && attempts < maxAttempts) {
            orderNumber = generateOrderNumber();
            const existingOrder = await Order.findOne({ orderNumber }).session(session);
            orderNumberExists = !!existingOrder;
            attempts++;
        }

        if (orderNumberExists) {
            await session.abortTransaction();
            return res.status(500).json({
                success: false,
                message: 'Failed to generate unique order number. Please try again.'
            });
        }

        // Process payment info securely (only store last 4 digits)
        const processedPaymentInfo = {
            method: paymentInfo.method,
            cardName: paymentInfo.cardName
        };

        if (paymentInfo.method === 'credit-card' && paymentInfo.cardNumber) {
            const cardNumber = paymentInfo.cardNumber.replace(/\s/g, '');
            processedPaymentInfo.cardLastFour = cardNumber.slice(-4);
        }

        // Create order object with correct productId mapping
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
            items: items.map(item => {
                // FIXED: Correctly map productId from various possible fields
                const productId = item.productId || item._id || item.id;
                return {
                    name: item.name,
                    price: parseFloat(item.price),
                    image: item.image,
                    quantity: item.quantity || 1,
                    productId: productId,
                    selectedSize: item.selectedSize || null
                };
            }),
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
            status: 'pending',
            userId: req.user?.id || null
        };

        console.log('Processed order data:', JSON.stringify(orderData, null, 2));

        // Create and save order
        const order = new Order(orderData);
        const savedOrder = await order.save({ session });

        // ============ REDUCE STOCK FOR ALL PRODUCTS ============
        for (const { product, productId, quantity, selectedSize } of productsToUpdate) {
            if (selectedSize) {
                // Reduce size-specific stock
                const sizeIndex = product.sizes.findIndex(s => s.size === selectedSize);
                if (sizeIndex !== -1) {
                    product.sizes[sizeIndex].stock -= quantity;
                    
                    // Mark size as unavailable if stock reaches 0
                    if (product.sizes[sizeIndex].stock <= 0) {
                        product.sizes[sizeIndex].stock = 0;
                        product.sizes[sizeIndex].available = false;
                    }
                    
                    console.log(`Stock reduced for ${product.name} (Size: ${selectedSize}): ${quantity} units. Remaining: ${product.sizes[sizeIndex].stock}`);
                }
            } else {
                // Reduce general product stock
                product.stock -= quantity;
                
                // Mark product as inactive if stock reaches 0
                if (product.stock <= 0) {
                    product.stock = 0;
                    // Optional: You can also set isActive to false
                    // product.isActive = false;
                }
                
                console.log(`Stock reduced for ${product.name}: ${quantity} units. Remaining: ${product.stock}`);
            }

            await product.save({ session });
        }

        // Commit the transaction
        await session.commitTransaction();
        console.log('Order saved successfully with stock reduction:', savedOrder.orderNumber);

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
        // Abort transaction on error
        await session.abortTransaction();
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
    } finally {
        session.endSession();
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

        // If user is not admin, only allow viewing their own orders
        if (req.user && !req.user.isAdmin && order.customerInfo.email !== req.user.email) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only view your own orders.'
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

        // If user is not admin, only allow viewing their own orders
        if (req.user && !req.user.isAdmin && req.user.email !== email) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only view your own orders.'
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

// Update order status (Admin only)
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

// Get all orders (Admin function)
export const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, email, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        // Build query
        const query = {};
        if (status && status !== 'all') query.status = status;
        if (email) query['customerInfo.email'] = { $regex: email, $options: 'i' };

        // Calculate skip value for pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build sort object
        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Get orders with pagination
        const orders = await Order.find(query)
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const totalOrders = await Order.countDocuments(query);

        // Get additional statistics
        const stats = await Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$pricing.total' }
                }
            }
        ]);

        const orderStats = {
            total: totalOrders,
            byStatus: stats.reduce((acc, stat) => {
                acc[stat._id] = {
                    count: stat.count,
                    totalAmount: stat.totalAmount
                };
                return acc;
            }, {}),
            totalRevenue: stats.reduce((sum, stat) => sum + stat.totalAmount, 0)
        };

        res.json({
            success: true,
            orders,
            stats: orderStats,
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

// Delete order (Admin function)
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
                customerEmail: order.customerInfo.email,
                total: order.pricing.total
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

// Get order statistics (Admin function)
export const getOrderStatistics = async (req, res) => {
    try {
        const { timeframe = '30' } = req.query;
        const daysAgo = parseInt(timeframe);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);

        const stats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        status: '$status',
                        date: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$createdAt'
                            }
                        }
                    },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$pricing.total' }
                }
            },
            {
                $sort: { '_id.date': 1 }
            }
        ]);

        // Get overall statistics
        const overallStats = await Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$pricing.total' }
                }
            }
        ]);

        // Get recent orders
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('orderNumber customerInfo.name customerInfo.email status pricing.total createdAt');

        res.json({
            success: true,
            timeframeStats: stats,
            overallStats: overallStats.reduce((acc, stat) => {
                acc[stat._id] = {
                    count: stat.count,
                    totalAmount: stat.totalAmount
                };
                return acc;
            }, {}),
            recentOrders,
            totalRevenue: overallStats.reduce((sum, stat) => sum + stat.totalAmount, 0),
            totalOrders: overallStats.reduce((sum, stat) => sum + stat.count, 0)
        });

    } catch (error) {
        console.error('Error fetching order statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Bulk update order status (Admin function)
export const bulkUpdateOrderStatus = async (req, res) => {
    try {
        const { orderNumbers, status } = req.body;

        if (!orderNumbers || !Array.isArray(orderNumbers) || orderNumbers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order numbers array is required'
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

        const result = await Order.updateMany(
            { orderNumber: { $in: orderNumbers } },
            { 
                status,
                updatedAt: new Date()
            }
        );

        res.json({
            success: true,
            message: `Successfully updated ${result.modifiedCount} orders`,
            modifiedCount: result.modifiedCount,
            matchedCount: result.matchedCount
        });

    } catch (error) {
        console.error('Error bulk updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to bulk update order status',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

export const getOrderInvoice = async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const order = await Order.findOne({ orderNumber });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderNumber}.pdf`);
        doc.pipe(res);

        // Helper for aligned rows, compact columns
        const drawRow = (doc, label, value, leftX, rightX, y, labelOpts = {}, valueOpts = {}) => {
            doc.fontSize(11).fillColor('#333');
            doc.text(label, leftX, y, labelOpts);
            doc.text(value, rightX, y, Object.assign({ align: 'right', width: 100 }, valueOpts));
        };

        // ==== HEADER ====
        doc.fontSize(22).fillColor('#000').text('Order Details', { align: 'center', underline: true });
        doc.moveDown(1);

        doc.fontSize(12)
            .fillColor('#333')
            .text(`Order Number:  ${order.orderNumber}`, { align: 'center' })
            .text(`Order Date:  ${order.createdAt.toDateString()}`, { align: 'center' });
        doc.moveDown(1.5);

        // ==== CUSTOMER INFORMATION ====
        const customer = order.customerInfo;
        doc.fontSize(14).fillColor('#000').text('Customer Information', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#333')
            .text(`Name:  ${customer.name}`)
            .text(`Email:  ${customer.email}`)
            .text(`Phone:  ${customer.phone}`)
            .text(`Address:  ${customer.address},  ${customer.city},  ${customer.state}, ${customer.zipCode}`)
            .text(`Country:  ${customer.country}`);
        doc.moveDown(1.5);

        // ==== ORDER ITEMS SECTION ====
        doc.fontSize(14).fillColor('#000').text('Order Items', { underline: true });
        doc.moveDown(0.5);

        // Table Header
        let y = doc.y;
        doc.fontSize(12).fillColor('#000')
            .text('Item', 50, y)
            .text('Quantity', 250, y, { width: 60, align: 'center' })
            .text('Price', 340, y, { width: 80, align: 'right' })
            .text('Total', 460, y, { width: 80, align: 'right' });
        doc.moveTo(50, y + 15).lineTo(550, y + 15).strokeColor('#aaa').stroke();
        y += 25;

        // Table Body
        doc.fontSize(11).fillColor('#333');
        order.items.forEach((item) => {
            const itemName = item.selectedSize ? `${item.name} (${item.selectedSize})` : item.name;
            const totalItemPrice = (item.price * item.quantity).toFixed(2);
            doc.text(itemName, 50, y)
                .text(item.quantity, 260, y, { width: 40, align: 'center' })
                .text(`$${item.price.toFixed(2)}`, 340, y, { width: 80, align: 'right' })
                .text(`$${totalItemPrice}`, 460, y, { width: 80, align: 'right' });
            y += 20;
        });

        // ==== PRICING SUMMARY ====
        doc.moveDown(2);
        y = doc.y + 10;
        const labelX = 60;
        const valueX = 450;
        const lineGap = 18;

        doc.fontSize(12).fillColor('#000').text('Pricing Summary', labelX, y, { underline: true });
        y += 25;

        drawRow(doc, 'Subtotal:', `$${order.pricing.subtotal.toFixed(2)}`, labelX, valueX, y);
        y += lineGap;
        drawRow(doc, 'Shipping:', `$${order.pricing.shipping.toFixed(2)}`, labelX, valueX, y);
        y += lineGap;
        drawRow(doc, 'Tax:', `$${order.pricing.tax.toFixed(2)}`, labelX, valueX, y);
        y += lineGap;
        if (order.pricing.discount > 0) {
            drawRow(doc, 'Discount:', `-$${order.pricing.discount.toFixed(2)}`, labelX, valueX, y);
            y += lineGap * 2.0;
        }
        doc.font('Helvetica-Bold');
        drawRow(doc, 'Total:', `$${order.pricing.total.toFixed(2)}`, labelX, valueX, y);
        doc.font('Helvetica');

        doc.end();
    } catch (error) {
        console.error('Error generating PDF invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate invoice PDF'
        });
    }
};