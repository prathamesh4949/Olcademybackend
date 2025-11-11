import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
    // Check if we already have an active connection
    if (isConnected && mongoose.connection.readyState === 1) {
        console.log('Already connected to database');
        return mongoose.connection;
    }

    try {
        // Get database URL from environment variables
        const dbURL = process.env.MONGO_URI || 
                     process.env.DATABASE_URL || 
                     process.env.MONGODB_URI;
                
        if (!dbURL) {
            console.error('Available env vars:', Object.keys(process.env).filter(key => 
                key.toLowerCase().includes('mongo') || 
                key.toLowerCase().includes('database') || 
                key.toLowerCase().includes('db')
            ));
            throw new Error('No MongoDB connection string found. Expected MONGO_URI, DATABASE_URL, or MONGODB_URI');
        }

        console.log('Connecting to database...');
        console.log('Using connection string from:', dbURL.includes('mongodb+srv') ? 'MongoDB Atlas' : 'Local MongoDB');

        // IMPORTANT: Don't disconnect if connection exists in serverless
        // Mongoose handles stale connections automatically
        // if (mongoose.connection.readyState !== 0) {
        //     await mongoose.disconnect();
        // }

        // Optimized connection options for Vercel serverless
        await mongoose.connect(dbURL, {
            maxPoolSize: 10, // Maintain up to 10 socket connections
            minPoolSize: 2, // Maintain at least 2 connections
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 10s for faster failures
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
            family: 4, // Use IPv4, skip trying IPv6 (faster connection)
            retryWrites: true, // Retry failed writes
            w: 'majority', // Write concern
        });

        isConnected = true;
        console.log('✅ Database connected successfully');
        console.log('Connected to database:', mongoose.connection.name);
        
        // Event listeners for connection monitoring        
        mongoose.connection.on('error', (err) => {
            console.error('❌ Database error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ Database disconnected');
            isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            console.log('🔄 Database reconnected');
            isConnected = true;
        });

        // Additional event for connection issues
        mongoose.connection.on('close', () => {
            console.log('🔒 Database connection closed');
            isConnected = false;
        });

        return mongoose.connection;

    } catch (error) {
        console.error('❌ Database connection failed:', error);
        isConnected = false;
        
        // Enhanced error messages
        if (error.message.includes('authentication failed') || error.message.includes('auth')) {
            throw new Error('Database authentication failed. Check username and password in connection string.');
        } else if (error.message.includes('network') || error.message.includes('ETIMEDOUT')) {
            throw new Error('Network error connecting to database. Check if MongoDB Atlas allows access from 0.0.0.0/0');
        } else if (error.message.includes('ENOTFOUND')) {
            throw new Error('Database server not found. Check the database URL in environment variables.');
        } else if (error.message.includes('bad auth')) {
            throw new Error('Invalid database credentials. Verify MONGODB_URI is correct.');
        } else {
            throw error;
        }
    }
};

// Optional: Helper function to gracefully close connection (for local dev)
export const disconnectDB = async () => {
    if (isConnected) {
        await mongoose.disconnect();
        isConnected = false;
        console.log('Database disconnected manually');
    }
};