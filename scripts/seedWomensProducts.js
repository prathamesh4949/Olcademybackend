// scripts/seedWomensProducts.js
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import dotenv from 'dotenv';

dotenv.config();

const womensProducts = [
  // Just Arrived Collection
  {
    name: "Chanel No. 5 L'Eau",
    description: "A modern interpretation of the iconic No. 5 with sparkling aldehydes and elegant florals",
    price: 1299,
    category: "women",
    collection: "just-arrived",
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
    category: "women",
    collection: "just-arrived",
    images: ["/images/dior-miss-dior-blooming.jpg"],
    hoverImage: "/images/dior-miss-dior-blooming-hover.jpg",
    brand: "Dior",
    stock: 30,
    rating: 4.6,
    tags: ["floral", "romantic", "fresh", "young"],
    sku: "DIOR-MISS-DIOR-BB-002"
  },
  {
    name: "Yves Saint Laurent Black Opium",
    description: "An addictive feminine fragrance with black coffee, vanilla, and white flowers",
    price: 1080,
    category: "women",
    collection: "just-arrived",
    images: ["/images/ysl-black-opium.jpg"],
    hoverImage: "/images/ysl-black-opium-hover.jpg",
    brand: "Yves Saint Laurent",
    stock: 20,
    rating: 4.7,
    tags: ["oriental", "coffee", "vanilla", "seductive"],
    sku: "YSL-BLACK-OPIUM-003"
  },
  
  // Best Sellers Collection
  {
    name: "Lancôme La Vie Est Belle",
    description: "A sweet and sophisticated fragrance with iris, patchouli, and gourmand notes",
    price: 1199,
    category: "women",
    collection: "best-sellers",
    images: ["/images/lancome-la-vie-est-belle.jpg"],
    hoverImage: "/images/lancome-la-vie-est-belle-hover.jpg",
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
    category: "women",
    collection: "best-sellers",
    images: ["/images/viktor-rolf-flowerbomb.jpg"],
    hoverImage: "/images/viktor-rolf-flowerbomb-hover.jpg",
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
    category: "women",
    collection: "best-sellers",
    images: ["/images/marc-jacobs-daisy.jpg"],
    hoverImage: "/images/marc-jacobs-daisy-hover.jpg",
    brand: "Marc Jacobs",
    stock: 45,
    rating: 4.5,
    tags: ["fresh", "playful", "berries", "youthful"],
    sku: "MJ-DAISY-006"
  },
  
  // Huntsman Savile Row Collection (Premium)
  {
    name: "Tom Ford Black Orchid",
    description: "Luxurious and mysterious with black orchid, dark chocolate, and incense",
    price: 1899,
    category: "women",
    collection: "huntsman-savile-row",
    images: ["/images/tom-ford-black-orchid.jpg"],
    hoverImage: "/images/tom-ford-black-orchid-hover.jpg",
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
    category: "women",
    collection: "huntsman-savile-row",
    images: ["/images/creed-love-in-white.jpg"],
    hoverImage: "/images/creed-love-in-white-hover.jpg",
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
    category: "women",
    collection: "huntsman-savile-row",
    images: ["/images/mfk-baccarat-rouge.jpg"],
    hoverImage: "/images/mfk-baccarat-rouge-hover.jpg",
    brand: "Maison Francis Kurkdjian",
    stock: 8,
    rating: 5.0,
    tags: ["niche", "sophisticated", "saffron", "exclusive"],
    featured: true,
    sku: "MFK-BACCARAT-540-009"
  }
];

// Function to seed the database
async function seedWomensProducts() {
  try {
    console.log('Starting women\'s products seeding...');
    
    // Check if MONGO_URI exists
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not set');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    
    // Clear existing women's products
    console.log('Clearing existing women\'s products...');
    const deleteResult = await Product.deleteMany({ category: 'women' });
    console.log(`✅ Cleared ${deleteResult.deletedCount} existing women's products`);
    
    // Insert new products
    console.log('Inserting new women\'s products...');
    const insertedProducts = await Product.insertMany(womensProducts);
    console.log(`✅ Successfully inserted ${insertedProducts.length} women's products!`);
    
    // Display summary by collection
    console.log('\n📦 Products by Collection:');
    const collections = ['just-arrived', 'best-sellers', 'huntsman-savile-row'];
    for (const collection of collections) {
      const count = await Product.countDocuments({ category: 'women', collection });
      console.log(`   ${collection}: ${count} products`);
    }
    
  } catch (error) {
    console.error('❌ Error seeding women\'s products:', error);
    
    if (error.code === 11000) {
      console.error('Duplicate key error - check for duplicate SKUs');
      console.error('Duplicate key details:', error.keyPattern);
    }
    
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    } catch (disconnectError) {
      console.error('Error disconnecting:', disconnectError);
    }
  }
}

// Export for use in other files
export { seedWomensProducts, womensProducts };

// Run seeding if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedWomensProducts();
}