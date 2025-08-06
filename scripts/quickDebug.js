// scripts/quickDebug.js
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import dotenv from 'dotenv';

dotenv.config();

async function quickDebug() {
  try {
    console.log('🔍 Quick Database Debug...');
    
    // Check environment
    console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
    console.log('MONGO_URI preview:', process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 20) + '...' : 'NOT SET');
    
    // Connect
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    console.log('Database name:', mongoose.connection.db.databaseName);
    console.log('Connection state:', mongoose.connection.readyState); // 1 = connected
    
    // Test basic operations
    console.log('\n🧪 Testing basic operations...');
    
    // Check if we can query
    const count = await Product.countDocuments();
    console.log('Current product count:', count);
    
    // Try to create a simple test product
    console.log('\n🧪 Testing product creation...');
    
    // First, clean up any test products
    await Product.deleteMany({ sku: 'TEST-DEBUG-001' });
    
    const testProduct = {
      name: 'Debug Test Product',
      description: 'This is a test product for debugging',
      price: 100,
      category: 'women',
      productCollection: 'just-arrived',
      sku: 'TEST-DEBUG-001',
      isActive: true,
      stock: 5,
      brand: 'Test Brand',
      images: ['/test-image.jpg']
    };
    
    console.log('Creating test product...');
    const created = await Product.create(testProduct);
    console.log('✅ Created test product:', created._id);
    
    // Verify it exists
    const found = await Product.findById(created._id);
    console.log('✅ Found created product:', found.name);
    
    // Clean up
    await Product.deleteOne({ _id: created._id });
    console.log('✅ Cleaned up test product');
    
    // Check collections in database
    console.log('\n📊 Database collections:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // If products collection exists, show some stats
    const productsCollection = collections.find(col => col.name === 'products');
    if (productsCollection) {
      console.log('\n📈 Products collection stats:');
      const stats = await mongoose.connection.db.collection('products').stats();
      console.log(`  Documents: ${stats.count}`);
      console.log(`  Size: ${stats.size} bytes`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected');
  }
}

quickDebug();