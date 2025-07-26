// index.js or app.js (your main server file)
import express from 'express';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import userRoutes from './routes/UserRoutes.js';
import orderRoutes from './routes/OrderRoutes.js'; // Make sure this import is correct
import cartRoutes from './routes/CartRoutes.js';
import cors from "cors";
import mongoose from 'mongoose';
import { connectDB } from './utils/db.js';

// Load environment variables
dotenv.config();

const app = express();

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            "http://localhost:4028",
            "http://localhost:3000",
            "https://olcademyfrontend.vercel.app",
            process.env.FRONTEND_URL
        ].filter(Boolean);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'x-requested-with'],
    exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));

// Additional CORS headers
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        "http://localhost:4028",
        "http://localhost:3000",
        "https://olcademyfrontend.vercel.app",
        process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, x-requested-with');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Connect to database
connectDB().catch(err => {
    console.error('Initial database connection failed:', err);
});

// API routes - MAKE SURE THESE MATCH YOUR FRONTEND CONSTANTS
app.use('/user', userRoutes);
app.use('/order', orderRoutes); // This should match your ORDER_API_END_POINT in constants
app.use('/cart', cartRoutes);

// Test endpoint
app.get("/test-orders", async (req, res) => {
    try {
        // Import Order model
        const { Order } = await import('./models/Order.js');
        
        // Get all orders from database
        const orders = await Order.find().limit(5);
        
        res.json({
            success: true,
            message: "Orders fetched successfully",
            ordersCount: orders.length,
            orders: orders,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test orders error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
            error: error.message
        });
    }
});

// Health check
app.get("/", (req, res) => {
    res.json({
        message: "OLCAcademy backend is running!",
        status: "healthy",
        timestamp: new Date().toISOString(),
        endpoints: {
            users: "/user",
            orders: "/order",
            cart: "/cart"
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    console.log('404 - Route not found:', req.method, req.originalUrl);
    res.status(404).json({
        message: 'Route not found',
        success: false,
        requestedUrl: req.originalUrl,
        method: req.method
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        message: 'Internal server error',
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

const PORT = process.env.PORT || 8000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, async () => {
        try {
            await connectDB();
            console.log(`Server running on PORT ${PORT}`);
            console.log(`Available endpoints:`);
            console.log(`- Users: http://localhost:${PORT}/user`);
            console.log(`- Orders: http://localhost:${PORT}/order`);
            console.log(`- Cart: http://localhost:${PORT}/cart`);
        } catch (error) {
            console.error('Failed to start server:', error);
        }
    });
}

export default app;