// scripts/manualInsert.js
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import dotenv from 'dotenv';

dotenv.config();

// Minimal test data to start with
const testProducts = [
  {
    name: "Chanel No. 5",
    description: "Classic luxury fragrance",
    price: 1299,
    category: "women",
    productCollection: "just-arrived",
    sku: "CHANEL-NO5-001",
    isActive: true,
    stock: 10,
    brand: "Chanel",
    images: ["/images/chanel-no5.jpg"],
    featured: true,
    rating: 4.8,
    tags: ["luxury", "classic"]
  },
  {
    name: "Dior Miss Dior",
    description: "Elegant floral fragrance",
    price: 1150,
    category: "women", 
    productCollection: "best-sellers",
    sku: "DIOR-MISS-DIOR-002",
    isActive: true,
    stock: 15,
    brand: "Dior",
    images: ["/images/dior-miss-dior.jpg"],
    rating: 4.6,
    tags: ["floral", "elegant"]
  },
  {
    name: "Tom Ford Black Orchid",
    description: "Luxurious and mysterious fragrance",
    price: 1899,
    category: "women",
    productCollection: "huntsman-savile-row", 
    sku: "TF-BLACK-ORCHID-003",
    isActive: true,
    stock: 8,
    brand: "Tom Ford",
    images: ["/images/tom-ford-black-orchid.jpg"],
    featured: true,
    rating: 4.9,
    tags: ["luxury", "mysterious"]
  }
];

async function manualInsert() {
  try {
    console.log('🚀 Starting manual data insertion...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    console.log('Database:', mongoose.connection.db.databaseName);
    
    // Clear existing products
    console.log('\n🧹 Clearing existing products...');
    const deleteResult = await Product.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing products`);
    
    // Insert products one by one with detailed logging
    console.log('\n📦 Inserting products...');
    let insertedCount = 0;
    
    for (let i = 0; i < testProducts.length; i++) {
      const productData = testProducts[i];
      console.log(`\n${i + 1}. Inserting: ${productData.name}`);
      console.log(`   SKU: ${productData.sku}`);
      console.log(`   Category: ${productData.category}`);
      console.log(`   Collection: ${productData.productCollection}`);
      
      try {
        // Validate the product data before insertion
        const product = new Product(productData);
        const validationError = product.validateSync();
        
        if (validationError) {
          console.error('   ❌ Validation error:', validationError.message);
          continue;
        }
        
        // Save the product
        const savedProduct = await product.save();
        console.log(`   ✅ Saved with ID: ${savedProduct._id}`);
        insertedCount++;
        
      } catch (insertError) {
        console.error(`   ❌ Insert error:`, insertError.message);
        if (insertError.code === 11000) {
          console.error('   Duplicate key error - SKU already exists');
        }
      }
    }
    
    console.log(`\n🎉 Insertion completed! Inserted ${insertedCount} products`);
    
    // Verify insertion
    console.log('\n🔍 Verifying insertion...');
    const totalCount = await Product.countDocuments();
    const activeCount = await Product.countDocuments({ isActive: true });
    const womenCount = await Product.countDocuments({ category: 'women' });
    
    console.log(`Total products: ${totalCount}`);
    console.log(`Active products: ${activeCount}`);
    console.log(`Women products: ${womenCount}`);
    
    // Show collection breakdown
    console.log('\nCollection breakdown:');
    const collections = ['just-arrived', 'best-sellers', 'huntsman-savile-row'];
    for (const collection of collections) {
      const count = await Product.countDocuments({ 
        category: 'women', 
        productCollection: collection 
      });
      console.log(`  ${collection}: ${count} products`);
    }
    
    // Show actual products
    console.log('\n📋 Inserted products:');
    const products = await Product.find().select('name category productCollection sku');
    products.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name}`);
      console.log(`     SKU: ${product.sku}`);
      console.log(`     Category: ${product.category}`);
      console.log(`     Collection: ${product.productCollection}`);
    });
    
    return { success: true, insertedCount, totalCount };
    
  } catch (error) {
    console.error('❌ Manual insertion failed:', error);
    console.error('Error details:', error.message);
    return { success: false, error: error.message };
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  manualInsert()
    .then((result) => {
      if (result.success) {
        console.log(`\n🎊 Success! Inserted ${result.insertedCount} products`);
        console.log('\nNow test your API:');
        console.log('curl http://localhost:8000/api/products/debug/count');
        console.log('curl http://localhost:8000/api/products');
      } else {
        console.log('\n💥 Failed:', result.error);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { manualInsert };