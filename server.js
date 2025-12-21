import express from 'express';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import userRoutes from './routes/UserRoutes.js';
import orderRoutes from './routes/OrderRoutes.js';
import cartRoutes from './routes/CartRoutes.js';
import wishlistRoutes from './routes/WishlistRoutes.js';
import productRoutes from './routes/productRoutes.js';
import scentRoutes from './routes/scentRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import cors from "cors";
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './utils/db.js';
import subscriberRoutes from "./routes/subscriberRoutes.js";

// Load environment variables
dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:4028",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// 🔥 THIS LINE IS MANDATORY
app.options("*", cors());

// ✅ ES6 module dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ✅ Subscriber route
app.use("/api", subscriberRoutes);

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
        "http://localhost:5173",
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

// ✅ OPTIMIZED: Ensure public/images directory exists with absolute path
const publicPath = path.join(__dirname, 'public');
const imagesPath = path.join(publicPath, 'images');

if (!fs.existsSync(publicPath)) {
    fs.mkdirSync(publicPath, { recursive: true });
    console.log('📁 Created public directory at:', publicPath);
}

if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
    console.log('📁 Created public/images directory at:', imagesPath);
}

// ✅ CRITICAL: Serve static files BEFORE API routes with proper configuration
// Serve images with explicit path and proper caching headers
app.use('/images', express.static(path.join(__dirname, 'public/images'), {
    maxAge: '1d', // Cache for 1 day
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // Set proper MIME types
        if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        } else if (filePath.endsWith('.gif')) {
            res.setHeader('Content-Type', 'image/gif');
        } else if (filePath.endsWith('.webp')) {
            res.setHeader('Content-Type', 'image/webp');
        }
        // Enable CORS for images
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
}));

// Also serve entire public directory as fallback
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

// ✅ ENHANCED: Image debugging middleware
app.use((req, res, next) => {
    if (req.path.startsWith('/images/')) {
        console.log(`🖼️  Image request: ${req.path}`);
        console.log(`   Full path: ${path.join(__dirname, 'public', req.path)}`);
        console.log(`   Exists: ${fs.existsSync(path.join(__dirname, 'public', req.path))}`);
    }
    next();
});

// Connect to database
connectDB().catch(err => {
    console.error('Initial database connection failed:', err);
});

// Debug middleware to log all routes
app.use((req, res, next) => {
    if (!req.path.includes('favicon') && !req.path.includes('.well-known')) {
        console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    }
    next();
});

// API routes - ORDER MATTERS!
app.use('/user', userRoutes);
app.use('/order', orderRoutes);
app.use('/cart', cartRoutes);
app.use('/wishlist', wishlistRoutes);
app.use('/api/products', productRoutes);
app.use('/api/scents', scentRoutes);
app.use('/api/banners', bannerRoutes);

// Test endpoint for scents
app.get("/test-scents", async (req, res) => {
    try {
        const { default: Scent } = await import('./models/Scent.js');
        const scents = await Scent.find().limit(5);
        
        res.json({
            success: true,
            message: "Scents fetched successfully",
            scentsCount: scents.length,
            scents: scents,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test scents error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch scents",
            error: error.message
        });
    }
});

// Test scent creation endpoint
app.get("/test-scent-creation", async (req, res) => {
    try {
        const { default: Scent } = await import('./models/Scent.js');
        
        const testScent = new Scent({
            name: 'Test Scent ' + Date.now(),
            description: 'This is a test scent created automatically',
            price: 99.99,
            category: 'women',
            collection: 'trending',
            sku: 'TEST' + Date.now(),
            scentFamily: 'floral',
            stock: 50,
            isActive: true,
            fragrance_notes: {
                top: ['Rose', 'Bergamot'],
                middle: ['Jasmine', 'Lily'],
                base: ['Sandalwood', 'Musk']
            },
            sizes: [
                { size: '50ml', price: 99.99, stock: 20, available: true },
                { size: '100ml', price: 149.99, stock: 30, available: true }
            ]
        });
        
        const savedScent = await testScent.save();
        
        res.json({
            success: true,
            message: "Test scent created successfully",
            scent: savedScent,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test scent creation error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to create test scent",
            error: error.message
        });
    }
});

// Test endpoint for trending scents
app.get("/test-trending", async (req, res) => {
    try {
        const { default: Scent } = await import('./models/Scent.js');
        const trendingScents = await Scent.find({ collection: 'trending' }).limit(5);
        
        res.json({
            success: true,
            message: "Trending scents fetched successfully",
            count: trendingScents.length,
            scents: trendingScents,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test trending scents error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch trending scents",
            error: error.message
        });
    }
});

// Test endpoint for best seller scents
app.get("/test-bestsellers", async (req, res) => {
    try {
        const { default: Scent } = await import('./models/Scent.js');
        const bestSellerScents = await Scent.find({ collection: 'best-seller' }).limit(5);
        
        res.json({
            success: true,
            message: "Best seller scents fetched successfully",
            count: bestSellerScents.length,
            scents: bestSellerScents,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test best seller scents error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch best seller scents",
            error: error.message
        });
    }
});

// Test endpoint for womens signature scents
app.get("/test-womens-signature", async (req, res) => {
    try {
        const { default: Scent } = await import('./models/Scent.js');
        const womensSignatureScents = await Scent.find({ collection: 'signature' }).limit(5);
        
        res.json({
            success: true,
            message: "Women's signature scents fetched successfully",
            count: womensSignatureScents.length,
            scents: womensSignatureScents,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test womens signature scents error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch women's signature scents",
            error: error.message
        });
    }
});

// Test endpoint for rose garden essence scents
app.get("/test-rose-garden-essence", async (req, res) => {
    try {
        const { default: Scent } = await import('./models/Scent.js');
        const roseGardenEssenceScents = await Scent.find({ collection: 'rose-garden-essence' }).limit(5);
        
        res.json({
            success: true,
            message: "Rose garden essence scents fetched successfully",
            count: roseGardenEssenceScents.length,
            scents: roseGardenEssenceScents,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test rose garden essence scents error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch rose garden essence scents",
            error: error.message
        });
    }
});

// Test endpoint for mens signature scents
app.get("/test-mens-signature", async (req, res) => {
    try {
        const { default: Scent } = await import('./models/Scent.js');
        const mensSignatureScents = await Scent.find({ collection: 'mens-signature' }).limit(5);
        
        res.json({
            success: true,
            message: "Men's signature scents fetched successfully",
            count: mensSignatureScents.length,
            scents: mensSignatureScents,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test mens signature scents error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch men's signature scents",
            error: error.message
        });
    }
});

// Test endpoint for orange marmalade scents
app.get("/test-orange-marmalade", async (req, res) => {
    try {
        const { default: Scent } = await import('./models/Scent.js');
        const orangeMarmaladeScents = await Scent.find({ collection: 'orange-marmalade' }).limit(5);
        
        res.json({
            success: true,
            message: "Orange marmalade scents fetched successfully",
            count: orangeMarmaladeScents.length,
            scents: orangeMarmaladeScents,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test orange marmalade scents error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch orange marmalade scents",
            error: error.message
        });
    }
});

// Test endpoint for gender-free scents
app.get("/test-gender-free", async (req, res) => {
    try {
        const { default: Scent } = await import('./models/Scent.js');
        const genderFreeScents = await Scent.find({ collection: 'gender-free' }).limit(5);
        
        res.json({
            success: true,
            message: "Gender-free scents fetched successfully",
            count: genderFreeScents.length,
            scents: genderFreeScents,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test gender-free scents error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch gender-free scents",
            error: error.message
        });
    }
});

// Test endpoint for limitless scents
app.get("/test-limitless", async (req, res) => {
    try {
        const { default: Scent } = await import('./models/Scent.js');
        const limitlessScents = await Scent.find({ collection: 'limitless' }).limit(5);
        
        res.json({
            success: true,
            message: "Limitless scents fetched successfully",
            count: limitlessScents.length,
            scents: limitlessScents,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test limitless scents error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch limitless scents",
            error: error.message
        });
    }
});

// NEW: Test endpoints for gift collections
app.get("/test-perfect-discover-gifts", async (req, res) => {
    try {
        const { default: Scent } = await import('./models/Scent.js');
        const perfectDiscoverGifts = await Scent.find({ collection: 'perfect-discover-gifts' }).limit(5);
        
        res.json({
            success: true,
            message: "Perfect discover gifts scents fetched successfully",
            count: perfectDiscoverGifts.length,
            scents: perfectDiscoverGifts,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test perfect discover gifts scents error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch perfect discover gifts scents",
            error: error.message
        });
    }
});

app.get("/test-perfect-gifts-premium", async (req, res) => {
    try {
        const { default: Scent } = await import('./models/Scent.js');
        const perfectGiftsPremium = await Scent.find({ collection: 'perfect-gifts-premium' }).limit(5);
        
        res.json({
            success: true,
            message: "Perfect gifts premium scents fetched successfully",
            count: perfectGiftsPremium.length,
            scents: perfectGiftsPremium,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test perfect gifts premium scents error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch perfect gifts premium scents",
            error: error.message
        });
    }
});

app.get("/test-perfect-gifts-luxury", async (req, res) => {
    try {
        const { default: Scent } = await import('./models/Scent.js');
        const perfectGiftsLuxury = await Scent.find({ collection: 'perfect-gifts-luxury' }).limit(5);
        
        res.json({
            success: true,
            message: "Perfect gifts luxury scents fetched successfully",
            count: perfectGiftsLuxury.length,
            scents: perfectGiftsLuxury,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test perfect gifts luxury scents error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch perfect gifts luxury scents",
            error: error.message
        });
    }
});

app.get("/test-home-decor-gifts", async (req, res) => {
    try {
        const { default: Scent } = await import('./models/Scent.js');
        const homeDecorGifts = await Scent.find({ collection: 'home-decor-gifts' }).limit(5);
        
        res.json({
            success: true,
            message: "Home decor gifts scents fetched successfully",
            count: homeDecorGifts.length,
            scents: homeDecorGifts,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test home decor gifts scents error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch home decor gifts scents",
            error: error.message
        });
    }
});

// Test endpoint for wishlists
app.get("/test-wishlist", async (req, res) => {
    try {
        const { Wishlist } = await import('./models/Wishlist.js');
        const wishlists = await Wishlist.find().limit(5);
        
        res.json({
            success: true,
            message: "Wishlists fetched successfully",
            wishlistsCount: wishlists.length,
            wishlists: wishlists,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test wishlists error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch wishlists",
            error: error.message
        });
    }
});

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

// ✅ ENHANCED: Debug static files with detailed information
app.get("/debug/static", async (req, res) => {
    try {
        const publicExists = fs.existsSync(publicPath);
        const imagesExists = fs.existsSync(imagesPath);
        
        const imageFiles = imagesExists ? fs.readdirSync(imagesPath) : [];
        
        // Get file details
        const fileDetails = imageFiles.slice(0, 20).map(filename => {
            const filePath = path.join(imagesPath, filename);
            const stats = fs.statSync(filePath);
            return {
                filename,
                size: `${(stats.size / 1024).toFixed(2)} KB`,
                created: stats.birthtime,
                modified: stats.mtime,
                url: `/images/${filename}`
            };
        });
        
        res.json({
            success: true,
            serverInfo: {
                __dirname,
                cwd: process.cwd(),
                nodeVersion: process.version
            },
            paths: {
                publicPath,
                imagesPath,
                relative: path.relative(process.cwd(), imagesPath)
            },
            exists: {
                public: publicExists,
                images: imagesExists
            },
            files: {
                totalCount: imageFiles.length,
                imageFiles: fileDetails
            },
            sampleUrls: fileDetails.map(f => f.url),
            testInstructions: {
                message: "Copy any URL from 'sampleUrls' and test in browser",
                example: fileDetails[0] ? `http://localhost:${process.env.PORT || 8000}${fileDetails[0].url}` : 'No images available'
            }
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// Health check
app.get("/", (req, res) => {
    res.json({
        message: "OLCAcademy backend is running!",
        status: "healthy",
        timestamp: new Date().toISOString(),
        staticFiles: {
            publicPath,
            imagesPath,
            configured: true
        },
        endpoints: {
            users: "/user",
            orders: "/order",
            cart: "/cart",
            wishlist: "/wishlist",
            products: "/api/products",
            scents: "/api/scents",
            banners: "/api/banners",
            testProducts: "/test-products",
            testScents: "/test-scents",
            testScentCreation: "/test-scent-creation",
            testTrending: "/test-trending",
            testBestSellers: "/test-bestsellers",
            testWomensSignature: "/test-womens-signature",
            testRoseGardenEssence: "/test-rose-garden-essence",
            testMensSignature: "/test-mens-signature",
            testOrangeMarmalade: "/test-orange-marmalade",
            testGenderFree: "/test-gender-free",
            testLimitless: "/test-limitless",
            testPerfectDiscoverGifts: "/test-perfect-discover-gifts",
            testPerfectGiftsPremium: "/test-perfect-gifts-premium",
            testPerfectGiftsLuxury: "/test-perfect-gifts-luxury",
            testHomeDecorGifts: "/test-home-decor-gifts",
            testBanners: "/test-banners",
            testWishlist: "/test-wishlist",
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
            '/wishlist',
            '/api/products',
            '/api/scents',
            '/api/banners',
            '/test-products',
            '/test-scents',
            '/test-scent-creation',
            '/test-trending',
            '/test-bestsellers',
            '/test-womens-signature',
            '/test-rose-garden-essence',
            '/test-mens-signature',
            '/test-orange-marmalade',
            '/test-gender-free',
            '/test-limitless',
            '/test-perfect-discover-gifts',
            '/test-perfect-gifts-premium',
            '/test-perfect-gifts-luxury',
            '/test-home-decor-gifts',
            '/test-banners',
            '/test-wishlist',
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

// Development server console logs
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, async () => {
        try {
            await connectDB();
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🚀 Server running on PORT ${PORT}`);
            console.log(`📁 Static files serving from: ${publicPath}`);
            console.log(`🖼️  Images directory: ${imagesPath}`);
            console.log(`${'='.repeat(60)}\n`);
            
            console.log(`🔗 Available endpoints:`);
            console.log(`   - Health: http://localhost:${PORT}/`);
            console.log(`   - Users: http://localhost:${PORT}/user`);
            console.log(`   - Orders: http://localhost:${PORT}/order`);
            console.log(`   - Cart: http://localhost:${PORT}/cart`);
            console.log(`   - Wishlist: http://localhost:${PORT}/wishlist`);
            console.log(`   - Products: http://localhost:${PORT}/api/products`);
            console.log(`   - Scents: http://localhost:${PORT}/api/scents`);
            console.log(`   - Banners: http://localhost:${PORT}/api/banners`);
            console.log(`\n🧪 Debug endpoints:`);
            console.log(`   - Debug Static Files: http://localhost:${PORT}/debug/static`);
            console.log(`   - Debug Routes: http://localhost:${PORT}/debug/routes`);
            console.log(`\n📸 Image serving:`);
            console.log(`   - Images URL: http://localhost:${PORT}/images/`);
            console.log(`   - Test: Visit /debug/static for sample image URLs`);
            console.log(`${'='.repeat(60)}\n`);
        } catch (error) {
            console.error('Failed to start server:', error);
        }
    });
}

export default app;