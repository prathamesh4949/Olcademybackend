import express from 'express';
import Product from '../models/Product.js';
import Scent from '../models/Scent.js'; // Import Scent model
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/*
  GET /api/products/:id/related
  Fetch related products for "YOU MAY ALSO LIKE"
 */
router.get('/:id/related', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const relatedProducts = await Product.find({
      _id: { $ne: id },
      category: product.category,
      isActive: true
    })
      .limit(4)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        related_products: relatedProducts
      }
    });

  } catch (error) {
    console.error('Related products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch related products',
      error: error.message
    });
  }
});
//3nd of related products route

// ✅ Configure multer with proper path handling and ALL image extensions
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/images');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
    
    const uniqueSuffix = `${Date.now()}`;
    const filename = `${baseName}_${uniqueSuffix}${ext}`;
    
    console.log('📁 Uploading file:', {
      original: file.originalname,
      saved: filename,
      extension: ext,
      mimetype: file.mimetype,
      fullPath: path.join(__dirname, '../public/images', filename)
    });
    
    cb(null, filename);
  },
});

// ✅ Enhanced file filter to accept ALL common image formats
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    'image/x-icon'
  ];
  
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.ico'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    console.log('✅ File accepted:', file.originalname, 'Type:', file.mimetype);
    cb(null, true);
  } else {
    console.log('❌ File rejected:', file.originalname, 'Type:', file.mimetype);
    cb(new Error(`Only image files are allowed! Received: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Increased to 10MB for better quality images
  },
  fileFilter: fileFilter,
});

// Helper function to validate custom 24-character hex IDs
const isValidCustomId = (id) => {
  if (!id || typeof id !== 'string') return false;
  const cleanId = id.trim();
  return cleanId.length === 24 && /^[0-9a-fA-F]{24}$/.test(cleanId);
};

// Helper function to ensure product has proper size structure
const ensureProductSizes = (product) => {
  if (!product.sizes || product.sizes.length === 0) {
    product.sizes = [
      {
        size: product.volume || '50ml',
        price: product.price,
        available: product.stock > 0,
        stock: product.stock || 0,
      },
    ];
  } else {
    product.sizes = product.sizes.map((size) => ({
      ...size,
      stock: size.stock ?? 0,
      available: size.stock > 0,
    }));
  }
  return product;
};

// Helper function to generate unique SKU
const generateSKU = (name, category, counter) => {
  const namePrefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
  const categoryPrefix = category.substring(0, 2).toUpperCase();
  return `${namePrefix}-${categoryPrefix}O-H${counter.toString().padStart(3, '0')}`;
};

// ✅ ENHANCED: Check if image file exists with multiple naming patterns and ALL extensions
const findImageFile = (imagePath) => {
  if (!imagePath) return null;
  
  // Clean the path to get just the filename
  const cleanFilename = imagePath.replace(/^\/+/, '').replace(/^images\//, '');
  const imagesDir = path.join(__dirname, '../public/images');
  const fullPath = path.join(imagesDir, cleanFilename);
  
  // Check if exact file exists
  if (fs.existsSync(fullPath)) {
    console.log('✅ Found exact file:', cleanFilename);
    return fullPath;
  }
  
  // Try to find with timestamp pattern if it's an exact filename
  if (!cleanFilename.match(/_\d{13}/)) {
    const ext = path.extname(cleanFilename);
    const baseName = path.basename(cleanFilename, ext);
    
    try {
      const files = fs.readdirSync(imagesDir);
      
      // Look for files that match: basename_timestamp with ANY image extension
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.ico'];
      
      for (const imageExt of imageExtensions) {
        const pattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d{13}${imageExt.replace('.', '\\.')}$`, 'i');
        const matchingFile = files.find(file => pattern.test(file));
        
        if (matchingFile) {
          const matchingPath = path.join(imagesDir, matchingFile);
          console.log('✅ Found timestamped version:', matchingFile, 'for', cleanFilename);
          return matchingPath;
        }
      }
      
      // If original extension search didn't work, try with the same extension
      if (ext) {
        const pattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d{13}${ext.replace('.', '\\.')}$`, 'i');
        const matchingFile = files.find(file => pattern.test(file));
        
        if (matchingFile) {
          const matchingPath = path.join(imagesDir, matchingFile);
          console.log('✅ Found timestamped version:', matchingFile, 'for', cleanFilename);
          return matchingPath;
        }
      }
    } catch (error) {
      console.error('❌ Error searching for timestamped file:', error);
    }
  }
  
  console.warn('⚠️ Image file not found:', cleanFilename);
  return null;
};

// ✅ ENHANCED: Helper function to delete image files (handles all extensions)
const deleteImageFile = (imagePath) => {
  if (!imagePath) return false;
  
  const foundPath = findImageFile(imagePath);
  
  if (foundPath) {
    try {
      fs.unlinkSync(foundPath);
      console.log('✅ Deleted image:', path.basename(foundPath));
      return true;
    } catch (error) {
      console.error('❌ Error deleting image:', foundPath, error.message);
    }
  }
  
  return false;
};

// ✅ Helper to format image paths - store ONLY the filename
const formatImagePath = (filename) => {
  if (!filename) return null;
  
  // Strip any existing path prefixes - store ONLY the filename
  const cleanFilename = filename.replace(/^\/+/, '').replace(/^images\//, '');
  
  console.log('📝 Formatted image path:', {
    input: filename,
    output: cleanFilename
  });
  
  return cleanFilename;
};

// ✅ NEW: Middleware to serve images with fallback to timestamped versions
router.use('/images', (req, res, next) => {
  const requestedFile = req.path.substring(1); // Remove leading slash
  const imagePath = findImageFile(requestedFile);
  
  if (imagePath) {
    console.log('📸 Serving image:', path.basename(imagePath), 'for request:', requestedFile);
    return res.sendFile(imagePath);
  }
  
  console.warn('⚠️ Image not found:', requestedFile);
  // Let express handle 404
  next();
});

// SPECIFIC ROUTES FIRST

// GET /api/products/search
router.get('/search', async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (q) {
      filter.$text = { $search: q };
    }

    if (category) {
      filter.category = category.toLowerCase();
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    let products = await Product.find(filter).limit(parseInt(limit)).lean();
    let scents = await Scent.find(filter).limit(parseInt(limit)).lean(); // Fetch scents using the same filter and limit

    products = products.map(ensureProductSizes);

    res.json({
      success: true,
      data: {
        products,
        scents, // Include scents in the response
      },
      count: products.length,
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching products',
      error: error.message,
    });
  }
});

// GET /api/products/gifts/collections
router.get('/gifts/collections', async (req, res) => {
  try {
    const collections = [
      'for-her',
      'for-him',
      'by-price-under-50',
      'by-price-under-100',
      'by-price-under-200',
      'home-gift',
      'birthday-gift',
      'wedding-gift',
    ];
    const result = {};

    console.log('Fetching gift collections...');

    for (const collection of collections) {
      let products = await Product.find({
        category: 'gifts',
        productCollection: collection,
        isActive: true,
      })
        .sort('-createdAt')
        .limit(6)
        .lean();

      products = products.map(ensureProductSizes);

      console.log(`Found ${products.length} products for gift collection: ${collection}`);

      result[collection.replace(/-/g, '_')] = products;
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching gift collections:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching gift collections',
      error: error.message,
    });
  }
});

// GET /api/products/women/collections
router.get('/women/collections', async (req, res) => {
  try {
    const collections = ['just-arrived', 'best-sellers', 'huntsman-savile-row'];
    const result = {};

    console.log('Fetching women\'s collections...');

    for (const collection of collections) {
      let products = await Product.find({
        category: 'women',
        productCollection: collection,
        isActive: true,
      })
        .sort('-createdAt')
        .limit(6)
        .lean();

      products = products.map(ensureProductSizes);

      console.log(`Found ${products.length} products for collection: ${collection}`);

      result[collection.replace(/-/g, '_')] = products;
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching women\'s collections:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching women\'s collections',
      error: error.message,
    });
  }
});

// GET /api/products/men/collections
router.get('/men/collections', async (req, res) => {
  try {
    const collections = ['just-arrived', 'best-sellers', 'huntsman-savile-row'];
    const result = {};

    console.log('Fetching men\'s collections...');

    for (const collection of collections) {
      let products = await Product.find({
        category: 'men',
        productCollection: collection,
        isActive: true,
      })
        .sort('-createdAt')
        .limit(6)
        .lean();

      products = products.map(ensureProductSizes);

      console.log(`Found ${products.length} products for men's collection: ${collection}`);

      result[collection.replace(/-/g, '_')] = products;
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching men\'s collections:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching men\'s collections',
      error: error.message,
    });
  }
});

// GET /api/products/unisex/collections
router.get('/unisex/collections', async (req, res) => {
  try {
    const collections = ['just-arrived', 'best-sellers', 'huntsman-savile-row'];
    const result = {};

    console.log('Fetching unisex collections...');

    for (const collection of collections) {
      let products = await Product.find({
        category: 'unisex',
        productCollection: collection,
        isActive: true,
      })
        .sort('-createdAt')
        .limit(6)
        .lean();

      products = products.map(ensureProductSizes);

      console.log(`Found ${products.length} products for unisex collection: ${collection}`);

      result[collection.replace(/-/g, '_')] = products;
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching unisex collections:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unisex collections',
      error: error.message,
    });
  }
});

// GET /api/products/home/collections
router.get('/home/collections', async (req, res) => {
  try {
    const collections = ['just-arrived', 'best-sellers', 'huntsman-savile-row', 'fragrant-favourites', 'summer-scents', 'signature-collection'];
    const result = {};

    console.log('Fetching home collections...');

    for (const collection of collections) {
      let products = await Product.find({
        category: 'home',
        productCollection: collection,
        isActive: true,
      })
        .sort('-createdAt')
        .limit(6)
        .lean();

      products = products.map(ensureProductSizes);

      console.log(`Found ${products.length} products for home collection: ${collection}`);

      if (products.length > 0) {
        result[collection.replace(/-/g, '_')] = products;
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching home collections:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching home collections',
      error: error.message,
    });
  }
});

// GET /api/products/debug/count
router.get('/debug/count', async (req, res) => {
  try {
    console.log('Getting debug counts...');

    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const homeProducts = await Product.countDocuments({ category: 'home' });
    const womenProducts = await Product.countDocuments({ category: 'women' });
    const menProducts = await Product.countDocuments({ category: 'men' });
    const unisexProducts = await Product.countDocuments({ category: 'unisex' });
    const giftProducts = await Product.countDocuments({ category: 'gifts' });

    const collectionCounts = {};
    const collections = ['just-arrived', 'best-sellers', 'huntsman-savile-row', 'fragrant-favourites', 'summer-scents', 'signature-collection'];
    const giftCollections = [
      'for-her',
      'for-him',
      'by-price-under-50',
      'by-price-under-100',
      'by-price-under-200',
      'home-gift',
      'birthday-gift',
      'wedding-gift',
    ];

    for (const collection of collections) {
      collectionCounts[`home_${collection.replace(/-/g, '_')}`] = await Product.countDocuments({
        category: 'home',
        productCollection: collection,
      });
      collectionCounts[`women_${collection.replace(/-/g, '_')}`] = await Product.countDocuments({
        category: 'women',
        productCollection: collection,
      });
      collectionCounts[`men_${collection.replace(/-/g, '_')}`] = await Product.countDocuments({
        category: 'men',
        productCollection: collection,
      });
      collectionCounts[`unisex_${collection.replace(/-/g, '_')}`] = await Product.countDocuments({
        category: 'unisex',
        productCollection: collection,
      });
    }

    for (const collection of giftCollections) {
      collectionCounts[`gifts_${collection.replace(/-/g, '_')}`] = await Product.countDocuments({
        category: 'gifts',
        productCollection: collection,
      });
    }

    let sampleProducts = await Product.find({}, { _id: 1, name: 1, category: 1, productCollection: 1, isActive: 1, stock: 1, sizes: 1 })
      .limit(20)
      .lean();

    sampleProducts = sampleProducts.map(ensureProductSizes);

    const productsByCategory = {
      home: await Product.find({ category: 'home' }, { _id: 1, name: 1, productCollection: 1, stock: 1, sizes: 1 })
        .limit(10)
        .lean(),
      men: await Product.find({ category: 'men' }, { _id: 1, name: 1, productCollection: 1, stock: 1, sizes: 1 })
        .limit(10)
        .lean(),
      women: await Product.find({ category: 'women' }, { _id: 1, name: 1, productCollection: 1, stock: 1, sizes: 1 })
        .limit(10)
        .lean(),
      unisex: await Product.find({ category: 'unisex' }, { _id: 1, name: 1, productCollection: 1, stock: 1, sizes: 1 })
        .limit(10)
        .lean(),
      gifts: await Product.find({ category: 'gifts' }, { _id: 1, name: 1, productCollection: 1, stock: 1, sizes: 1 })
        .limit(10)
        .lean(),
    };

    Object.keys(productsByCategory).forEach((category) => {
      productsByCategory[category] = productsByCategory[category].map(ensureProductSizes);
    });

    console.log('Debug counts completed');

    res.json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        homeProducts,
        womenProducts,
        menProducts,
        unisexProducts,
        giftProducts,
        collectionCounts,
        sampleProducts: sampleProducts.map((p) => ({
          _id: p._id.toString(),
          name: p.name,
          category: p.category,
          productCollection: p.productCollection,
          isActive: p.isActive,
          stock: p.stock,
          sizes: p.sizes,
          availableSizes: p.sizes.filter((size) => size.available).length,
        })),
        productsByCategory: {
          home: productsByCategory.home.map((p) => ({
            _id: p._id.toString(),
            name: p.name,
            productCollection: p.productCollection,
            stock: p.stock,
            sizes: p.sizes,
            availableSizes: p.sizes.filter((size) => size.available).length,
          })),
          men: productsByCategory.men.map((p) => ({
            _id: p._id.toString(),
            name: p.name,
            productCollection: p.productCollection,
            stock: p.stock,
            sizes: p.sizes,
            availableSizes: p.sizes.filter((size) => size.available).length,
          })),
          women: productsByCategory.women.map((p) => ({
            _id: p._id.toString(),
            name: p.name,
            productCollection: p.productCollection,
            stock: p.stock,
            sizes: p.sizes,
            availableSizes: p.sizes.filter((size) => size.available).length,
          })),
          unisex: productsByCategory.unisex.map((p) => ({
            _id: p._id.toString(),
            name: p.name,
            productCollection: p.productCollection,
            stock: p.stock,
            sizes: p.sizes,
            availableSizes: p.sizes.filter((size) => size.available).length,
          })),
          gifts: productsByCategory.gifts.map((p) => ({
            _id: p._id.toString(),
            name: p.name,
            productCollection: p.productCollection,
            stock: p.stock,
            sizes: p.sizes,
            availableSizes: p.sizes.filter((size) => size.available).length,
          })),
        },
        idFormat: 'MongoDB ObjectId (24-character hex strings)',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in debug count:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting debug count',
      error: error.message,
    });
  }
});

// GET /api/products/debug/exists/:id
router.get('/debug/exists/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Checking if product exists:', id);

    if (!isValidCustomId(id)) {
      return res.json({
        success: true,
        exists: false,
        validId: false,
        error: 'Invalid product ID format',
        id: id,
      });
    }

    const product = await Product.findById(id, { _id: 1, name: 1 }).lean();

    res.json({
      success: true,
      exists: !!product,
      validId: true,
      id: id,
      productName: product?.name || null,
    });
  } catch (error) {
    console.error('Error checking product existence:', error);
    res.json({
      success: false,
      exists: false,
      validId: true,
      error: error.message,
      id: req.params.id,
    });
  }
});

// GENERAL ROUTES

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category, collection, featured, limit = 50, page = 1, sort = '-createdAt', isActive } = req.query;

    const filter = {};

    if (category) filter.category = category.toLowerCase();
    if (collection) filter.productCollection = collection.toLowerCase();
    if (featured) filter.featured = featured === 'true';
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let products = await Product.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    products = products.map(ensureProductSizes);

    const total = await Product.countDocuments(filter);

    console.log(`Found ${products.length} products with filter:`, filter);

    res.json({
      success: true,
      data: products,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: products.length,
        totalProducts: total,
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message,
    });
  }
});

// POST /api/products
router.post('/', upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'hoverImage', maxCount: 1 },
]), async (req, res) => {
  try {
    console.log('📦 Creating new product with data:', req.body);
    console.log('📁 Uploaded files:', req.files);

    const {
      name,
      description,
      price,
      category,
      productCollection,
      featured,
      isActive,
      brand,
      stock,
      rating,
      tags,
      sizes,
      fragrance_notes,
      personalization,
      ingredients,
      volume,
      concentration,
      longevity,
      sillage,
      season,
      occasion,
    } = req.body;

    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, price, and category are required',
      });
    }

    // Store ONLY the filename (no path prefix)
    const images = req.files['images'] 
      ? req.files['images'].map((file) => formatImagePath(file.filename)) 
      : [];
    const hoverImage = req.files['hoverImage'] 
      ? formatImagePath(req.files['hoverImage'][0].filename) 
      : null;

    console.log('✅ Stored image filenames:', { images, hoverImage });

    // Generate unique SKU
    const counter = (await Product.countDocuments()) + 100;
    const sku = generateSKU(name, category, counter);

    let parsedSizes = [];
    if (sizes) {
      try {
        parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
        parsedSizes = parsedSizes.map(size => ({
          size: size.size || volume || '50ml',
          price: Number(size.price) || Number(price),
          available: size.available !== undefined ? size.available : (Number(size.stock) || 0) > 0,
          stock: Number(size.stock) || 0,
        }));
      } catch (error) {
        console.error('Error parsing sizes:', error);
        parsedSizes = [
          {
            size: volume || '50ml',
            price: Number(price),
            available: true,
            stock: Number(stock) || 0,
          },
        ];
      }
    } else {
      parsedSizes = [
        {
          size: volume || '50ml',
          price: Number(price),
          available: true,
          stock: Number(stock) || 0,
        },
      ];
    }

    let parsedFragranceNotes = { top: [], middle: [], base: [] };
    if (fragrance_notes) {
      try {
        parsedFragranceNotes = typeof fragrance_notes === 'string' ? JSON.parse(fragrance_notes) : fragrance_notes;
        parsedFragranceNotes = {
          top: Array.isArray(parsedFragranceNotes.top) ? parsedFragranceNotes.top : [],
          middle: Array.isArray(parsedFragranceNotes.middle) ? parsedFragranceNotes.middle : [],
          base: Array.isArray(parsedFragranceNotes.base) ? parsedFragranceNotes.base : [],
        };
      } catch (error) {
        console.error('Error parsing fragrance notes:', error);
      }
    }

    let parsedPersonalization = { available: false, max_characters: 15, price: 0 };
    if (personalization) {
      try {
        parsedPersonalization = typeof personalization === 'string' ? JSON.parse(personalization) : personalization;
        parsedPersonalization = {
          available: parsedPersonalization.available || false,
          max_characters: Number(parsedPersonalization.max_characters) || 15,
          price: Number(parsedPersonalization.price) || 0,
        };
      } catch (error) {
        console.error('Error parsing personalization:', error);
      }
    }

    const productData = {
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      category: category.toLowerCase(),
      productCollection: productCollection ? productCollection.toLowerCase() : undefined,
      featured: featured === 'true' || featured === true,
      isActive: isActive === 'false' ? false : true,
      images,
      hoverImage,
      brand: brand ? brand.trim() : '',
      stock: Number(stock) || 0,
      sku,
      rating: rating ? Number(rating) : undefined,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((tag) => tag.trim().toLowerCase())) : [],
      sizes: parsedSizes,
      fragrance_notes: parsedFragranceNotes,
      personalization: parsedPersonalization,
      ingredients: ingredients ? ingredients.trim() : undefined,
      volume: volume ? volume.trim() : undefined,
      concentration: concentration ? concentration.trim() : undefined,
      longevity: longevity ? longevity.trim() : undefined,
      sillage: sillage ? sillage.trim() : undefined,
      season: season ? (Array.isArray(season) ? season : season.split(',').map((s) => s.trim().toLowerCase())) : [],
      occasion: occasion ? (Array.isArray(occasion) ? occasion : occasion.split(',').map((o) => o.trim().toLowerCase())) : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const product = new Product(productData);
    const savedProduct = await product.save();

    console.log('✅ Product created successfully:', savedProduct._id);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: savedProduct,
    });
  } catch (error) {
    console.error('❌ Error creating product:', error);

    // Clean up uploaded files on error
    if (req.files) {
      const filesToDelete = [...(req.files['images'] || []), ...(req.files['hoverImage'] || [])];
      filesToDelete.forEach((file) => {
        deleteImageFile(file.filename);
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message,
    });
  }
});

// PARAMETERIZED ROUTES

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Fetching product with ID:', id);

    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
      });
    }

    let product = await Product.findById(id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    product = ensureProductSizes(product);

    console.log('Product found:', product._id);

    res.json({
      success: true,
      data: {
        product: product,
      },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message,
    });
  }
});

// PUT /api/products/:id
router.put('/:id', upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'hoverImage', maxCount: 1 },
]), async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📝 Updating product:', id);

    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
      });
    }

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const updateData = { ...req.body };

    // Handle new images - store ONLY filename
    if (req.files && req.files['images'] && req.files['images'].length > 0) {
      const newImages = req.files['images'].map((file) => formatImagePath(file.filename));

      if (req.body.keepExistingImages === 'true') {
        updateData.images = [...(existingProduct.images || []), ...newImages];
        console.log('✅ Keeping existing images + adding new ones');
      } else {
        // Delete old images before replacing
        if (existingProduct.images) {
          existingProduct.images.forEach((imagePath) => {
            deleteImageFile(imagePath);
          });
        }
        updateData.images = newImages;
        console.log('✅ Replaced all images with new ones');
      }
    }

    // Handle hover image
    if (req.files && req.files['hoverImage'] && req.files['hoverImage'].length > 0) {
      const newHoverImage = formatImagePath(req.files['hoverImage'][0].filename);
      
      // Delete old hover image
      if (existingProduct.hoverImage) {
        deleteImageFile(existingProduct.hoverImage);
      }
      
      updateData.hoverImage = newHoverImage;
      console.log('✅ Updated hover image');
    } else if (req.body.keepExistingImages === 'false' && !req.files['images']) {
      if (existingProduct.hoverImage) {
        deleteImageFile(existingProduct.hoverImage);
      }
      updateData.hoverImage = null;
    }

    // Parse complex fields
    if (updateData.sizes && typeof updateData.sizes === 'string') {
      try {
        updateData.sizes = JSON.parse(updateData.sizes);
        updateData.sizes = updateData.sizes.map(size => ({
          size: size.size || existingProduct.volume || '50ml',
          price: Number(size.price) || Number(updateData.price) || existingProduct.price,
          available: size.available !== undefined ? size.available : (Number(size.stock) || 0) > 0,
          stock: Number(size.stock) || 0,
        }));
      } catch (error) {
        console.error('Error parsing sizes:', error);
      }
    }

    if (updateData.fragrance_notes && typeof updateData.fragrance_notes === 'string') {
      try {
        updateData.fragrance_notes = JSON.parse(updateData.fragrance_notes);
        updateData.fragrance_notes = {
          top: Array.isArray(updateData.fragrance_notes.top) ? updateData.fragrance_notes.top : [],
          middle: Array.isArray(updateData.fragrance_notes.middle) ? updateData.fragrance_notes.middle : [],
          base: Array.isArray(updateData.fragrance_notes.base) ? updateData.fragrance_notes.base : [],
        };
      } catch (error) {
        console.error('Error parsing fragrance notes:', error);
      }
    }

    if (updateData.personalization && typeof updateData.personalization === 'string') {
      try {
        updateData.personalization = JSON.parse(updateData.personalization);
        updateData.personalization = {
          available: updateData.personalization.available || false,
          max_characters: Number(updateData.personalization.max_characters) || 15,
          price: Number(updateData.personalization.price) || 0,
        };
      } catch (error) {
        console.error('Error parsing personalization:', error);
      }
    }

    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map((tag) => tag.trim().toLowerCase());
    }

    if (updateData.season && typeof updateData.season === 'string') {
      updateData.season = updateData.season.split(',').map((s) => s.trim().toLowerCase());
    }

    if (updateData.occasion && typeof updateData.occasion === 'string') {
      updateData.occasion = updateData.occasion.split(',').map((o) => o.trim().toLowerCase());
    }

    // Convert numeric fields
    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.stock) updateData.stock = Number(updateData.stock);
    if (updateData.rating) updateData.rating = Number(updateData.rating);

    // Convert boolean fields
    if (updateData.featured !== undefined) updateData.featured = updateData.featured === 'true' || updateData.featured === true;
    if (updateData.isActive !== undefined) updateData.isActive = updateData.isActive === 'true' || updateData.isActive === true;

    // Ensure lowercase for category and collection
    if (updateData.category) updateData.category = updateData.category.toLowerCase();
    if (updateData.productCollection) updateData.productCollection = updateData.productCollection.toLowerCase();

    updateData.updatedAt = new Date();

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    console.log('✅ Product updated successfully:', updatedProduct._id);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    console.error('❌ Error updating product:', error);

    // Clean up uploaded files on error
    if (req.files) {
      const filesToDelete = [...(req.files['images'] || []), ...(req.files['hoverImage'] || [])];
      filesToDelete.forEach((file) => {
        deleteImageFile(file.filename);
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message,
    });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Delete associated image files
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((imagePath) => {
        deleteImageFile(imagePath);
      });
    }

    // Delete hover image
    if (product.hoverImage) {
      deleteImageFile(product.hoverImage);
    }

    await Product.findByIdAndDelete(id);

    console.log('✅ Product deleted successfully:', id);

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message,
    });
  }
});

// POST /api/products/:id/toggle-status
router.post('/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    product.isActive = !product.isActive;
    product.updatedAt = new Date();
    await product.save();

    res.json({
      success: true,
      message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`,
      data: product,
    });
  } catch (error) {
    console.error('Error toggling product status:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling product status',
      error: error.message,
    });
  }
});

// DELETE /api/products/:id/image/:index
router.delete('/:id/image/:index', async (req, res) => {
  try {
    const { id, index } = req.params;

    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const imageIndex = parseInt(index);
    if (imageIndex < 0 || imageIndex >= (product.images?.length || 0)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image index',
      });
    }

    const imagePath = product.images[imageIndex];
    deleteImageFile(imagePath);

    product.images.splice(imageIndex, 1);
    product.updatedAt = new Date();
    await product.save();

    res.json({
      success: true,
      message: 'Image deleted successfully',
      data: product,
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      error: error.message,
    });
  }
});

// DELETE /api/products/:id/hover-image
router.delete('/:id/hover-image', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (!product.hoverImage) {
      return res.status(400).json({
        success: false,
        message: 'No hover image to delete',
      });
    }

    deleteImageFile(product.hoverImage);

    product.hoverImage = null;
    product.updatedAt = new Date();
    await product.save();

    res.json({
      success: true,
      message: 'Hover image deleted successfully',
      data: product,
    });
  } catch (error) {
    console.error('Error deleting hover image:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting hover image',
      error: error.message,
    });
  }
});

export default router;