import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
    // If already connected, return
    if (isConnected) {
        console.log('Already connected to database');
        return;
    }

    try {
        const dbURL = process.env.DATABASE_URL || process.env.MONGODB_URI;
        
        if (!dbURL) {
            throw new Error('DATABASE_URL not found in environment variables');
        }

        console.log('Connecting to database...');

        // Mongoose connection with proper settings for Vercel
        await mongoose.connect(dbURL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            bufferMaxEntries: 0, // Disable mongoose buffering
            bufferCommands: false, // Disable mongoose buffering
        });

        isConnected = true;
        console.log('Database connected successfully');
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('Database error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('Database disconnected');
            isConnected = false;
        });

    } catch (error) {
        console.error('Database connection failed:', error);
        isConnected = false;
        throw error;
    }
};
