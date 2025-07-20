import express from 'express';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import userRoutes from './routes/UserRoutes.js';
import orderRoutes from './routes/OrderRoutes.js';
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

// CORS configuration for Vercel
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            "http://localhost:4028",
            "https://olcademyfrontend.vercel.app",
            process.env.FRONTEND_URL
        ].filter(Boolean); // Remove undefined values
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'x-requested-with'],
    exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));

// Additional CORS headers for preflight requests
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        "http://localhost:4028",
        "https://olcademyfrontend.vercel.app",
        process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, x-requested-with');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Test database connection on startup
connectDB().catch(err => {
    console.error('Initial database connection failed:', err);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        message: 'Internal server error',
        success: false
    });
});

// API routes
app.use('/user', userRoutes);
app.use('/order', orderRoutes);

// Debug endpoint - REMOVE THIS AFTER TESTING
app.get("/debug", async (req, res) => {
    try {
        await connectDB();
        res.json({
            message: "Database connected successfully!",
            connection: {
                readyState: mongoose.connection.readyState,
                name: mongoose.connection.name,
                host: mongoose.connection.host
            },
            env: {
                hasMongoURI: !!process.env.MONGO_URI,
                hasDatabaseURL: !!process.env.DATABASE_URL,
                hasMongoDBURI: !!process.env.MONGODB_URI,
                nodeEnv: process.env.NODE_ENV
            },
            success: true
        });
    } catch (error) {
        res.status(500).json({
            message: "Database connection failed",
            error: error.message,
            success: false
        });
    }
});

// Health check endpoint
app.get("/", (req, res) => {
    res.json({
        message: "Hello from OLCAcademy backend!",
        status: "healthy",
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        message: 'Route not found',
        success: false
    });
});

const PORT = process.env.PORT || 3000;

// For Vercel, we don't need to call listen
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, async () => {
        try {
            await connectDB();
            console.log(`Server running on PORT ${PORT}`);
        } catch (error) {
            console.error('Failed to start server:', error);
        }
    });
}

export default app;