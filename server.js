import express from 'express';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import userRoutes from './routes/UserRoutes.js';
import orderRoutes from './routes/OrderRoutes.js';
import cartRoutes from './routes/CartRoutes.js';
import productRoutes from './routes/productRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
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

// 🔥 STATIC FILES - Serve images from public directory
app.use(express.static('public'));

// Connect to database
connectDB().catch(err => {
    console.error('Initial database connection failed:', err);
});

// Debug middleware to log all routes
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

// API routes - ORDER MATTERS!
app.use('/user', userRoutes);
app.use('/order', orderRoutes);
app.use('/cart', cartRoutes);
app.use('/api/products', productRoutes);
app.use('/api/banners', bannerRoutes);

// Test endpoint for orders
app.get("/test-orders", async (req, res) => {
    try {
        const { Order } = await import('./models/Order.js');
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

// Test endpoint for products
app.get("/test-products", async (req, res) => {
    try {
        const { default: Product } = await import('./models/Product.js');
        const products = await Product.find({ category: 'women' }).limit(5);
        
        res.json({
            success: true,
            message: "Products fetched successfully",
            productsCount: products.length,
            products: products,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test products error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch products",
            error: error.message
        });
    }
});

// Test endpoint for banners
app.get("/test-banners", async (req, res) => {
    try {
        const { default: Banner } = await import('./models/Banner.js');
        const banners = await Banner.find().limit(5);
        
        res.json({
            success: true,
            message: "Banners fetched successfully",
            bannersCount: banners.length,
            banners: banners,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test banners error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch banners",
            error: error.message
        });
    }
});

// Debug static files
app.get("/debug/static", async (req, res) => {
    try {
        const fs = await import('fs');
        const path = await import('path');
        
        const publicPath = path.join(process.cwd(), 'public');
        const imagesPath = path.join(publicPath, 'images');
        
        const publicExists = fs.existsSync(publicPath);
        const imagesExists = fs.existsSync(imagesPath);
        const imageFiles = imagesExists ? fs.readdirSync(imagesPath) : [];
        
        res.json({
            success: true,
            paths: {
                cwd: process.cwd(),
                publicPath,
                imagesPath
            },
            exists: {
                public: publicExists,
                images: imagesExists
            },
            imageFiles: imageFiles.slice(0, 10),
            sampleImageUrl: imageFiles.length > 0 ? `/images/${imageFiles[0]}` : 'No images found'
        });
    } catch (error) {
        res.json({
            success: false,
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
            cart: "/cart",
            products: "/api/products",
            banners: "/api/banners",
            testProducts: "/test-products",
            testBanners: "/test-banners",
            images: "/images/",
            debugStatic: "/debug/static"
        }
    });
});

// Route to test if product routes are loaded
app.get("/debug/routes", (req, res) => {
    const routes = [];
    
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods)
            });
        } else if (middleware.name === 'router') {
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    routes.push({
                        path: middleware.regexp.source.replace('\\', '').replace('/?(?=\\/|$)', '') + handler.route.path,
                        methods: Object.keys(handler.route.methods)
                    });
                }
            });
        }
    });
    
    res.json({
        success: true,
        routes: routes,
        totalRoutes: routes.length
    });
});

// Ignore favicon and Chrome dev tools requests
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/.well-known/*', (req, res) => res.status(204).end());

// 404 handler - MUST be AFTER all route definitions
app.use('*', (req, res) => {
    if (!req.originalUrl.includes('favicon') && !req.originalUrl.includes('.well-known')) {
        console.log('404 - Route not found:', req.method, req.originalUrl);
    }
    
    res.status(404).json({
        message: 'Route not found',
        success: false,
        requestedUrl: req.originalUrl,
        method: req.method,
        availableEndpoints: [
            '/user',
            '/order', 
            '/cart',
            '/api/products',
            '/api/banners',
            '/test-products',
            '/test-banners',
            '/debug/routes',
            '/debug/static',
            '/images/'
        ]
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
            console.log(`- Products: http://localhost:${PORT}/api/products`);
            console.log(`- Banners: http://localhost:${PORT}/api/banners`);
            console.log(`- Test Products: http://localhost:${PORT}/test-products`);
            console.log(`- Test Banners: http://localhost:${PORT}/test-banners`);
            console.log(`- Debug Routes: http://localhost:${PORT}/debug/routes`);
            console.log(`- Debug Static: http://localhost:${PORT}/debug/static`);
            console.log(`- Images: http://localhost:${PORT}/images/`);
        } catch (error) {
            console.error('Failed to start server:', error);
        }
    });
}

export default app;