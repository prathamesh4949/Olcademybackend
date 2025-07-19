import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
    if (isConnected && mongoose.connection.readyState === 1) {
        console.log('Already connected to database');
        return;
    }

    try {
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

        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }

        // Updated connection options
        await mongoose.connect(dbURL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
        });

        isConnected = true;
        console.log('✅ Database connected successfully');
        console.log('Connected to database:', mongoose.connection.name);
                
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

        return mongoose.connection;

    } catch (error) {
        console.error('❌ Database connection failed:', error);
        isConnected = false;
        
        if (error.message.includes('authentication failed')) {
            throw new Error('Database authentication failed. Check username and password.');
        } else if (error.message.includes('network')) {
            throw new Error('Network error connecting to database. Check connection string.');
        } else if (error.message.includes('ENOTFOUND')) {
            throw new Error('Database server not found. Check the database URL.');
        } else {
            throw error;
        }
    }
};
