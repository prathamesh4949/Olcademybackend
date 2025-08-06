// scripts/workingSeed.js
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import dotenv from 'dotenv';

dotenv.config();

// Complete product dataset
const productData = [
  // Just Arrived Collection
  {
    name: "Chanel No. 5 L'Eau",
    description: "A modern interpretation of the iconic No. 5 with sparkling aldehydes and elegant florals",
    price: 1299,
    category: "women",
    productCollection: "just-arrived",
    sku: "CHANEL-NO5-LEAU-001",
    isActive: true,
    stock: 25,
    brand: "Chanel",
    images: ["/images/chanel-no5-leau.jpg"],
    hoverImage: "/images/chanel-no5-leau-hover.jpg",
    featured: true,
    rating: 4.8,
    tags: ["floral", "aldehydic", "luxury", "iconic"]
  },
  {
    name: "Dior Miss Dior Blooming Bouquet",
    description: "A tender and romantic fragrance with peony, rose, and white musk",
    price: 1150,
    category: "women",
    productCollection: "just-arrived",
    sku: "DIOR-MISS-DIOR-BB-002",
    isActive: true,
    stock: 30,
    brand: "Dior",
    images: ["/images/dior-miss-dior-blooming.jpg"],
    hoverImage: "/images/dior-miss-dior-blooming-hover.jpg",
    rating: 4.6,
    tags: ["floral", "romantic", "fresh", "young"]
  },
  {
    name: "YSL Black Opium",
    description: "An addictive feminine fragrance with black coffee, vanilla, and white flowers",
    price: 1080,
    category: "women",
    productCollection: "just-arrived",
    sku: "YSL-BLACK-OPIUM-003",
    isActive: true,
    stock: 20,
    brand: "Yves Saint Laurent",
    images: ["/images/ysl-black-opium.jpg"],
    hoverImage: "/images/ysl-black-opium-hover.jpg",
    rating: 4.7,
    tags: ["oriental", "coffee", "vanilla", "seductive"]
  },
  
  // Best Sellers Collection
  {
    name: "Lancôme La Vie Est Belle",
    description: "A sweet and sophisticated fragrance with iris, patchouli, and gourmand notes",
    price: 1199,
    category: "women",
    productCollection: "best-sellers",
    sku: "LANCOME-LVEB-004",
    isActive: true,
    stock: 40,
    brand: "Lancôme",
    images: ["/images/lancome-la-vie-est-belle.jpg"],
    hoverImage: "/images/lancome-la-vie-est-belle-hover.jpg",
    featured: true,
    rating: 4.9,
    tags: ["gourmand", "sweet", "iris", "bestseller"]
  },
  {
    name: "Viktor & Rolf Flowerbomb",
    description: "An explosive floral bouquet with jasmine, rose, orchid, and patchouli",
    price: 1250,
    category: "women",
    productCollection: "best-sellers",
    sku: "VR-FLOWERBOMB-005",
    isActive: true,
    stock: 35,
    brand: "Viktor & Rolf",
    images: ["/images/viktor-rolf-flowerbomb.jpg"],
    hoverImage: "/images/viktor-rolf-flowerbomb-hover.jpg",
    rating: 4.8,
    tags: ["floral", "explosive", "oriental", "intense"]
  },
  {
    name: "Marc Jacobs Daisy",
    description: "Fresh and playful with wild berries, violet leaves, and jasmine",
    price: 950,
    category: "women",
    productCollection: "best-sellers",
    sku: "MJ-DAISY-006",
    isActive: true,
    stock: 45,
    brand: "Marc Jacobs",
    images: ["/images/marc-jacobs-daisy.jpg"],
    hoverImage: "/images/marc-jacobs-daisy-hover.jpg",
    rating: 4.5,
    tags: ["fresh", "playful", "berries", "youthful"]
  },
  
  // Huntsman Savile Row Collection (Premium)
  {
    name: "Tom Ford Black Orchid",
    description: "Luxurious and mysterious with black orchid, dark chocolate, and incense",
    price: 1899,
    category: "women",
    productCollection: "huntsman-savile-row",
    sku: "TF-BLACK-ORCHID-007",
    isActive: true,
    stock: 15,
    brand: "Tom Ford",
    images: ["/images/tom-ford-black-orchid.jpg"],
    hoverImage: "/images/tom-ford-black-orchid-hover.jpg",
    featured: true,
    rating: 4.9,
    tags: ["luxury", "mysterious", "orchid", "chocolate", "premium"]
  },
  {
    name: "Creed Love in White",
    description: "Pure and elegant with rice husk, magnolia, and white tea",
    price: 2299,
    category: "women",
    productCollection: "huntsman-savile-row",
    sku: "CREED-LIW-008",
    isActive: true,
    stock: 10,
    brand: "Creed",
    images: ["/images/creed-love-in-white.jpg"],
    hoverImage: "/images/creed-love-in-white-hover.jpg",
    rating: 4.8,
    tags: ["niche", "elegant", "white-floral", "luxury"]
  },
  {
    name: "Maison Francis Kurkdjian Baccarat Rouge 540",
    description: "Radiant and sophisticated with saffron, ambergris, and cedar",
    price: 2599,
    category: "women",
    productCollection: "huntsman-savile-row",
    sku: "MFK-BACCARAT-540-009",
    isActive: true,
    stock: 8,
    brand: "Maison Francis Kurkdjian",
    images: ["/images/mfk-baccarat-rouge.jpg"],
    hoverImage: "/images/mfk-baccarat-rouge-hover.jpg",
    featured: true,
    rating: 5.0,
    tags: ["niche", "sophisticated", "saffron", "exclusive"]
  }
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding process...');
  
  try {
    // Connect to database
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected successfully');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    
    // Clear existing products
    console.log('\n🧹 Clearing existing products...');
    const deleteResult = await Product.deleteMany({});
    console.log(`✅ Cleared ${deleteResult.deletedCount} existing products`);
    
    // Insert products with progress tracking
    console.log('\n📦 Inserting products...');
    console.log(`Total products to insert: ${productData.length}`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process each product
    for (let i = 0; i < productData.length; i++) {
      const product = productData[i];
      const progress = `[${i + 1}/${productData.length}]`;
      
      try {
        console.log(`${progress} Creating: ${product.name}`);
        console.log(`         SKU: ${product.sku}`);
        console.log(`         Collection: ${product.productCollection}`);
        
        const createdProduct = await Product.create(product);
        console.log(`         ✅ Success - ID: ${createdProduct._id}`);
        successCount++;
        
      } catch (error) {
        console.log(`         ❌ Failed: ${error.message}`);
        errorCount++;
        errors.push({
          product: product.name,
          sku: product.sku,
          error: error.message
        });
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Summary
    console.log('🎉 Seeding process completed!');
    console.log(`✅ Successfully inserted: ${successCount} products`);
    console.log(`❌ Failed: ${errorCount} products`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((err, index) => {
        console.log(`${index + 1}. ${err.product} (${err.sku}): ${err.error}`);
      });
    }
    
    // Verification
    console.log('\n🔍 Verifying database state...');
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const featuredProducts = await Product.countDocuments({ featured: true });
    
    console.log(`📊 Total products: ${totalProducts}`);
    console.log(`📊 Active products: ${activeProducts}`);
    console.log(`📊 Featured products: ${featuredProducts}`);
    
    // Collection breakdown
    console.log('\n📦 Collection breakdown:');
    const collections = ['just-arrived', 'best-sellers', 'huntsman-savile-row'];
    
    for (const collection of collections) {
      const count = await Product.countDocuments({ 
        category: 'women', 
        productCollection: collection 
      });
      console.log(`   ${collection}: ${count} products`);
    }
    
    // Test API endpoints
    console.log('\n🔗 Test your API endpoints:');
    console.log('curl http://localhost:8000/api/products/debug/count');
    console.log('curl http://localhost:8000/api/products');
    console.log('curl http://localhost:8000/api/products/women/collections');
    
    return {
      success: true,
      inserted: successCount,
      failed: errorCount,
      total: totalProducts
    };
    
  } catch (error) {
    console.error('❌ Seeding failed with error:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    // Always disconnect
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    }
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedDatabase()
    .then((result) => {
      console.log(`\n🎊 SEEDING COMPLETED SUCCESSFULLY!`);
      console.log(`📊 Final Stats: ${result.inserted} inserted, ${result.failed} failed, ${result.total} total`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 SEEDING FAILED:', error.message);
      process.exit(1);
    });
}

export default seedDatabase;