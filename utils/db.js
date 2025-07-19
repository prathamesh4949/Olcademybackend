import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
    // If already connected in this serverless function instance, return
    if (isConnected && mongoose.connection.readyState === 1) {
        console.log('Database already connected');
        return mongoose.connection;
    }

    try {
        // Check if MONGO_URI exists
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI environment variable is not defined');
        }

        console.log('Connecting to MongoDB...');
        
        // Disconnect if there's an existing connection in bad state
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // Remove deprecated options for newer mongoose versions
            serverSelectionTimeoutMS: 10000, // 10 seconds
            socketTimeoutMS: 45000,
            maxPoolSize: 5, // Smaller pool for serverless
            minPoolSize: 1,
            maxIdleTimeMS: 30000,
            bufferCommands: false,
            bufferMaxEntries: 0
        });

        isConnected = true;
        console.log(`MongoDB connected: ${conn.connection.host}`);
        
        return conn.connection;

    } catch (error) {
        console.error('Database connection failed:', error.message);
        isConnected = false;
        throw error;
    }
};

// Handle connection events for debugging
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
    isConnected = true;
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
    isConnected = false;
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
    isConnected = false;
});
