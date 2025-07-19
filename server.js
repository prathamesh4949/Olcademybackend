// api/index.js (Create this file in api folder)
import express from 'express'
import dotenv from "dotenv"
import cookieparser from 'cookie-parser'
import userRoutes from '../routes/UserRoutes.js'
import cors from "cors"
import { connectDB } from '../utils/db.js'

// Load environment variables
dotenv.config();

const app = express();

// Global error handler
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
});

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieparser());

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:4028',
        'http://localhost:3000', 
        'https://olcademyfrontend.vercel.app',
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Additional CORS headers
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        'http://localhost:4028',
        'http://localhost:3000',
        'https://olcademyfrontend.vercel.app',
        process.env.FRONTEND_URL
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Connect to database on serverless function initialization
let dbConnected = false;
const initDB = async () => {
    if (!dbConnected) {
        try {
            await connectDB();
            dbConnected = true;
        } catch (error) {
            console.error('Database connection failed:', error);
        }
    }
};

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
    await initDB();
    next();
});

// Health check endpoint
app.get("/", (req, res) => {
    res.json({
        message: "OLCAcademy Backend is running!",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API routes
app.use('/user', userRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        message: 'Route not found',
        success: false
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        message: 'Internal server error',
        success: false,
        ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
});

export default app;
