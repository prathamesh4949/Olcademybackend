import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Global variable to cache the connection
let cachedConnection = null;

export const connectDB = async () => {
  // If we already have a cached connection, return it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('Using cached MongoDB connection');
    return cachedConnection;
  }

  try {
    // Configure mongoose for serverless environment
    mongoose.set('bufferCommands', false);
    mongoose.set('bufferMaxEntries', 0);

    // Connect with optimized settings for Vercel
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Reduce from default 30s
      socketTimeoutMS: 45000,
      maxPoolSize: 1, // Limit connection pool for serverless
      bufferCommands: false,
      bufferMaxEntries: 0,
    });

    console.log('New MongoDB connection established');
    cachedConnection = connection;
    return connection;

  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Optional: Add connection event handlers
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
  cachedConnection = null;
});
