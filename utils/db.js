import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
    // If already connected, don't connect again
    if (isConnected) {
        console.log('Database already connected');
        return;
    }

    try {
        // Check if MONGO_URI exists
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI environment variable is not defined');
        }

        console.log('Attempting to connect to MongoDB...');
        
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            maxPoolSize: 10, // Maintain up to 10 socket connections
            bufferCommands: false, // Disable mongoose buffering
            bufferMaxEntries: 0 // Disable mongoose buffering
        });

        isConnected = true;
        console.log(`MongoDB connected successfully: ${conn.connection.host}`);

        // Handle connection events
        mongoose.connection.on('connected', () => {
            console.log('Mongoose connected to MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            console.error('Mongoose connection error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('Mongoose disconnected');
            isConnected = false;
        });

        // Handle process termination
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed due to process termination');
            process.exit(0);
        });

    } catch (error) {
        console.error('Database connection failed:', error.message);
        isConnected = false;
        
        // Don't exit in production, let Vercel handle retries
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
        
        throw error;
    }
};
