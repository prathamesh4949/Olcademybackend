// scripts/debugDatabase.js
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugDatabase() {
  try {
    console.log('🔍 Starting database debug...');
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not set');
    }

    console.log('🔌 Connecting to MongoDB...');
    console.log('Using URI:', process.env.MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);

    // Test basic operations
    console.log('\n🧪 Testing database operations...');
    
    // Check total products
    const totalProducts = await Product.countDocuments();
    console.log(`Total products in database: ${totalProducts}`);
    
    // Check active products
    const activeProducts = await Product.countDocuments({ isActive: true });
    console.log(`Active products: ${activeProducts}`);
    
    // Check women's products
    const womenProducts = await Product.countDocuments({ category: 'women' });
    console.log(`Women's products: ${womenProducts}`);
    
    // Check collections
    console.log('\nCollection breakdown:');
    const collections = ['just-arrived', 'best-sellers', 'huntsman-savile-row'];
    for (const collection of collections) {
      const count = await Product.countDocuments({ 
        category: 'women', 
        productCollection: collection 
      });
      console.log(`  ${collection}: ${count} products`);
    }
    
    // Show all products (limited to 10)
    console.log('\n📝 All products (first 10):');
    const allProducts = await Product.find().limit(10).select('name category productCollection sku isActive');
    if (allProducts.length === 0) {
      console.log('  No products found in database');
    } else {
      allProducts.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name}`);
        console.log(`     Category: ${product.category}`);
        console.log(`     Collection: ${product.productCollection}`);
        console.log(`     SKU: ${product.sku}`);
        console.log(`     Active: ${product.isActive}`);
        console.log('');
      });
    }
    
    // Test creating a single product
    console.log('\n🧪 Testing product creation...');
    const testProduct = {
      name: "Test Product",
      description: "This is a test product",
      price: 999,
      category: "women",
      productCollection: "just-arrived",
      sku: "TEST-PRODUCT-999",
      isActive: true,
      stock: 10,
      brand: "Test Brand"
    };
    
    try {
      // First, try to delete any existing test product
      await Product.deleteMany({ sku: "TEST-PRODUCT-999" });
      
      const createdProduct = await Product.create(testProduct);
      console.log(`✅ Successfully created test product: ${createdProduct.name} (ID: ${createdProduct._id})`);
      
      // Clean up test product
      await Product.deleteOne({ _id: createdProduct._id });
      console.log('✅ Test product cleaned up');
      
    } catch (createError) {
      console.error('❌ Failed to create test product:', createError.message);
      if (createError.errors) {
        Object.keys(createError.errors).forEach(field => {
          console.error(`  ${field}: ${createError.errors[field].message}`);
        });
      }
    }
    
    // Check database indexes
    console.log('\n📊 Database indexes:');
    const indexes = await Product.collection.getIndexes();
    Object.keys(indexes).forEach(indexName => {
      console.log(`  ${indexName}: ${JSON.stringify(indexes[indexName])}`);
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Error details:', error.message);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    } catch (disconnectError) {
      console.error('❌ Error disconnecting:', disconnectError);
    }
  }
}

// Run debug if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  debugDatabase()
    .then(() => {
      console.log('\n🎊 Debug completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Debug failed:', error.message);
      process.exit(1);
    });
}

export { debugDatabase };