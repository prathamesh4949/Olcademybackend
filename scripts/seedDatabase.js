// scripts/seedDatabase.js
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import dotenv from 'dotenv';

dotenv.config();

// Real-world perfume data with proper structure including SKUs
const perfumeDatabase = {
  women: {
    'just-arrived': [
      {
        name: "Chanel No. 5 L'Eau",
        description: "A modern interpretation of the iconic No. 5 with sparkling aldehydes and elegant florals",
        price: 1299,
        images: ["/images/chanel-no5-leau.jpg"],
        hoverImage: "/images/chanel-no5-leau-hover.jpg",
        brand: "Chanel",
        stock: 25,
        rating: 4.8,
        tags: ["floral", "aldehydic", "luxury", "iconic"],
        featured: true,
        sku: "CHANEL-NO5-LEAU-001"
      },
      {
        name: "Dior Miss Dior Blooming Bouquet",
        description: "A tender and romantic fragrance with peony, rose, and white musk",
        price: 1150,
        images: ["/images/dior-miss-dior-blooming.jpg"],
        brand: "Dior",
        stock: 30,
        rating: 4.6,
        tags: ["floral", "romantic", "fresh", "young"],
        sku: "DIOR-MISS-DIOR-BB-002"
      },
      {
        name: "YSL Black Opium",
        description: "An addictive feminine fragrance with black coffee, vanilla, and white flowers",
        price: 1080,
        images: ["/images/ysl-black-opium.jpg"],
        brand: "Yves Saint Laurent",
        stock: 20,
        rating: 4.7,
        tags: ["oriental", "coffee", "vanilla", "seductive"],
        sku: "YSL-BLACK-OPIUM-003"
      }
    ],
    'best-sellers': [
      {
        name: "Lancôme La Vie Est Belle",
        description: "A sweet and sophisticated fragrance with iris, patchouli, and gourmand notes",
        price: 1199,
        images: ["/images/lancome-la-vie-est-belle.jpg"],
        brand: "Lancôme",
        stock: 40,
        rating: 4.9,
        tags: ["gourmand", "sweet", "iris", "bestseller"],
        featured: true,
        sku: "LANCOME-LVEB-004"
      },
      {
        name: "Viktor & Rolf Flowerbomb",
        description: "An explosive floral bouquet with jasmine, rose, orchid, and patchouli",
        price: 1250,
        images: ["/images/viktor-rolf-flowerbomb.jpg"],
        brand: "Viktor & Rolf",
        stock: 35,
        rating: 4.8,
        tags: ["floral", "explosive", "oriental", "intense"],
        sku: "VR-FLOWERBOMB-005"
      },
      {
        name: "Marc Jacobs Daisy",
        description: "Fresh and playful with wild berries, violet leaves, and jasmine",
        price: 950,
        images: ["/images/marc-jacobs-daisy.jpg"],
        brand: "Marc Jacobs",
        stock: 45,
        rating: 4.5,
        tags: ["fresh", "playful", "berries", "youthful"],
        sku: "MJ-DAISY-006"
      }
    ],
    'huntsman-savile-row': [
      {
        name: "Tom Ford Black Orchid",
        description: "Luxurious and mysterious with black orchid, dark chocolate, and incense",
        price: 1899,
        images: ["/images/tom-ford-black-orchid.jpg"],
        brand: "Tom Ford",
        stock: 15,
        rating: 4.9,
        tags: ["luxury", "mysterious", "orchid", "chocolate", "premium"],
        featured: true,
        sku: "TF-BLACK-ORCHID-007"
      },
      {
        name: "Creed Love in White",
        description: "Pure and elegant with rice husk, magnolia, and white tea",
        price: 2299,
        images: ["/images/creed-love-in-white.jpg"],
        brand: "Creed",
        stock: 10,
        rating: 4.8,
        tags: ["niche", "elegant", "white-floral", "luxury"],
        sku: "CREED-LIW-008"
      },
      {
        name: "Maison Francis Kurkdjian Baccarat Rouge 540",
        description: "Radiant and sophisticated with saffron, ambergris, and cedar",
        price: 2599,
        images: ["/images/mfk-baccarat-rouge.jpg"],
        brand: "Maison Francis Kurkdjian",
        stock: 8,
        rating: 5.0,
        tags: ["niche", "sophisticated", "saffron", "exclusive"],
        featured: true,
        sku: "MFK-BACCARAT-540-009"
      }
    ]
  }
};

async function seedDatabase() {
  let connection = null;
  
  try {
    console.log('🌱 Starting database seeding...');
    
    // Check if MONGO_URI exists
    if (!process.env.MONGO_URI) {
      throw new Error('❌ MONGO_URI environment variable is not set');
    }

    console.log('🔌 Connecting to MongoDB...');
    console.log('Using URI:', process.env.MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    // Connect to MongoDB with proper error handling
    connection = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000, // 45 second socket timeout
    });
    
    console.log('✅ Connected to MongoDB successfully');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);

    // Test database connection
    await mongoose.connection.db.admin().ping();
    console.log('✅ Database ping successful');

    // Clear existing products
    console.log('🧹 Clearing existing products...');
    const deleteResult = await Product.deleteMany({});
    console.log(`✅ Cleared ${deleteResult.deletedCount} existing products`);

    let totalInserted = 0;
    const insertedProducts = [];

    // Seed women's products
    for (const [collection, products] of Object.entries(perfumeDatabase.women)) {
      console.log(`\n📦 Processing ${collection} collection (${products.length} products)...`);
      
      for (const product of products) {
        const productData = {
          ...product,
          category: 'women',
          productCollection: collection, // Make sure this matches your schema
          isActive: true
        };

        try {
          console.log(`   Creating product: ${product.name}`);
          const createdProduct = await Product.create(productData);
          insertedProducts.push(createdProduct);
          totalInserted++;
          console.log(`   ✅ Created: ${createdProduct.name} (ID: ${createdProduct._id})`);
        } catch (productError) {
          console.error(`   ❌ Failed to create ${product.name}:`, productError.message);
          if (productError.code === 11000) {
            console.error(`   Duplicate key error for SKU: ${product.sku}`);
          }
          throw productError; // Stop on any product creation error
        }
      }
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log(`📊 Total products inserted: ${totalInserted}`);
    
    // Verify the data was inserted
    console.log('\n🔍 Verifying inserted data...');
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const featuredProducts = await Product.countDocuments({ featured: true });
    
    console.log('\n📈 Database Summary:');
    console.log(`   Total products: ${totalProducts}`);
    console.log(`   Active products: ${activeProducts}`);
    console.log(`   Featured products: ${featuredProducts}`);
    
    // Show collections breakdown
    console.log('\n📦 Collections Breakdown:');
    for (const collection of ['just-arrived', 'best-sellers', 'huntsman-savile-row']) {
      const count = await Product.countDocuments({ 
        productCollection: collection, 
        category: 'women' 
      });
      console.log(`   ${collection}: ${count} products`);
    }

    // Show sample products
    console.log('\n📝 Sample Products:');
    const sampleProducts = await Product.find().limit(3).select('name category productCollection sku');
    sampleProducts.forEach(product => {
      console.log(`   - ${product.name} (${product.category}/${product.productCollection}) [${product.sku}]`);
    });

    console.log('\n🔗 Test your API endpoints:');
    console.log('   curl http://localhost:8000/api/products/debug/count');
    console.log('   curl http://localhost:8000/api/products');
    console.log('   curl http://localhost:8000/api/products/women/collections');

    return { success: true, totalInserted, products: insertedProducts };

  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.code === 11000) {
      console.error('Duplicate key error - check for duplicate SKUs or other unique fields');
      console.error('Duplicate key details:', error.keyPattern);
      console.error('Duplicate value:', error.keyValue);
    }
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('Database connection failed. Check your MONGO_URI and network connection.');
    }
    
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
    }
    
    throw error; // Re-throw to ensure the process exits with error code
    
  } finally {
    if (connection) {
      try {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
      } catch (disconnectError) {
        console.error('❌ Error disconnecting:', disconnectError);
      }
    }
  }
}

// Export for use in other files
export { seedDatabase, perfumeDatabase };

// Run seeding if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedDatabase()
    .then((result) => {
      console.log(`\n🎊 Seeding completed successfully! Inserted ${result.totalInserted} products.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Seeding failed:', error.message);
      process.exit(1);
    });
}