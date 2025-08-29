// 1) Updated backend router (products.js)
// No changes needed here as the backend already supports multiple uploads and keepExistingImages for updates.
// If you have issues with file overwriting, consider adding unique filenames.

import express from 'express';
import Product from '../models/Product.js';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Changed from 'products' subfolder to just 'images' folder
    const uploadPath = path.join(__dirname, '../../public/images');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Use original filename directly
    cb(null, file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
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
        size: '50ml',
        price: product.price,
        available: product.stock > 0,
        stock: product.stock
      }
    ];
  } else {
    product.sizes = product.sizes.map(size => ({
      ...size,
      stock: size.stock ?? 0,
      available: size.stock > 0
    }));
  }
  return product;
};

// Helper function to generate unique SKU
const generateSKU = (name, category) => {
  const timestamp = Date.now().toString().slice(-6);
  const namePrefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
  const categoryPrefix = category.substring(0, 2).toUpperCase();
  return `${categoryPrefix}${namePrefix}${timestamp}`;
};

// SPECIFIC ROUTES FIRST (before parameterized routes)

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
      if (minPrice) filter.price.$gte = parseInt(minPrice);
      if (maxPrice) filter.price.$lte = parseInt(maxPrice);
    }

    let products = await Product.find(filter)
      .limit(parseInt(limit))
      .lean();

    products = products.map(ensureProductSizes);

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching products',
      error: error.message
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
      'wedding-gift'
    ];
    const result = {};

    console.log('Fetching gift collections...');

    for (const collection of collections) {
      let products = await Product.find({
        category: 'gifts',
        productCollection: collection,
        isActive: true
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
      data: result
    });
  } catch (error) {
    console.error('Error fetching gift collections:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching gift collections',
      error: error.message
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
        isActive: true
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
      data: result
    });
  } catch (error) {
    console.error('Error fetching women\'s collections:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching women\'s collections',
      error: error.message
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
        isActive: true
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
      data: result
    });
  } catch (error) {
    console.error('Error fetching men\'s collections:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching men\'s collections',
      error: error.message
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
        isActive: true
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
      data: result
    });
  } catch (error) {
    console.error('Error fetching unisex collections:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unisex collections',
      error: error.message
    });
  }
});

// GET /api/products/debug/count
router.get('/debug/count', async (req, res) => {
  try {
    console.log('Getting debug counts...');
    
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const womenProducts = await Product.countDocuments({ category: 'women' });
    const menProducts = await Product.countDocuments({ category: 'men' });
    const unisexProducts = await Product.countDocuments({ category: 'unisex' });
    const giftProducts = await Product.countDocuments({ category: 'gifts' });
    
    const collectionCounts = {};
    const collections = ['just-arrived', 'best-sellers', 'huntsman-savile-row'];
    const giftCollections = [
      'for-her',
      'for-him',
      'by-price-under-50',
      'by-price-under-100',
      'by-price-under-200',
      'home-gift',
      'birthday-gift',
      'wedding-gift'
    ];

    for (const collection of collections) {
      collectionCounts[`women_${collection.replace(/-/g, '_')}`] = await Product.countDocuments({ 
        category: 'women', 
        productCollection: collection 
      });
      collectionCounts[`men_${collection.replace(/-/g, '_')}`] = await Product.countDocuments({ 
        category: 'men', 
        productCollection: collection 
      });
      collectionCounts[`unisex_${collection.replace(/-/g, '_')}`] = await Product.countDocuments({ 
        category: 'unisex', 
        productCollection: collection 
      });
    }

    for (const collection of giftCollections) {
      collectionCounts[`gifts_${collection.replace(/-/g, '_')}`] = await Product.countDocuments({ 
        category: 'gifts', 
        productCollection: collection 
      });
    }

    let sampleProducts = await Product.find({}, { _id: 1, name: 1, category: 1, productCollection: 1, isActive: 1, stock: 1, sizes: 1 }).limit(20).lean();
    
    sampleProducts = sampleProducts.map(ensureProductSizes);

    const productsByCategory = {
      men: await Product.find({ category: 'men' }, { _id: 1, name: 1, productCollection: 1, stock: 1, sizes: 1 }).limit(10).lean(),
      women: await Product.find({ category: 'women' }, { _id: 1, name: 1, productCollection: 1, stock: 1, sizes: 1 }).limit(10).lean(),
      unisex: await Product.find({ category: 'unisex' }, { _id: 1, name: 1, productCollection: 1, stock: 1, sizes: 1 }).limit(10).lean(),
      gifts: await Product.find({ category: 'gifts' }, { _id: 1, name: 1, productCollection: 1, stock: 1, sizes: 1 }).limit(10).lean()
    };

    Object.keys(productsByCategory).forEach(category => {
      productsByCategory[category] = productsByCategory[category].map(ensureProductSizes);
    });

    console.log('Debug counts completed');

    res.json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        womenProducts,
        menProducts,
        unisexProducts,
        giftProducts,
        collectionCounts,
        sampleProducts: sampleProducts.map(p => ({
          _id: p._id.toString(),
          name: p.name,
          category: p.category,
          productCollection: p.productCollection,
          isActive: p.isActive,
          stock: p.stock,
          sizes: p.sizes,
          availableSizes: p.sizes.filter(size => size.available).length
        })),
        productsByCategory: {
          men: productsByCategory.men.map(p => ({
            _id: p._id.toString(),
            name: p.name,
            productCollection: p.productCollection,
            stock: p.stock,
            sizes: p.sizes,
            availableSizes: p.sizes.filter(size => size.available).length
          })),
          women: productsByCategory.women.map(p => ({
            _id: p._id.toString(),
            name: p.name,
            productCollection: p.productCollection,
            stock: p.stock,
            sizes: p.sizes,
            availableSizes: p.sizes.filter(size => size.available).length
          })),
          unisex: productsByCategory.unisex.map(p => ({
            _id: p._id.toString(),
            name: p.name,
            productCollection: p.productCollection,
            stock: p.stock,
            sizes: p.sizes,
            availableSizes: p.sizes.filter(size => size.available).length
          })),
          gifts: productsByCategory.gifts.map(p => ({
            _id: p._id.toString(),
            name: p.name,
            productCollection: p.productCollection,
            stock: p.stock,
            sizes: p.sizes,
            availableSizes: p.sizes.filter(size => size.available).length
          }))
        },
        idFormat: 'Custom 24-character hex strings'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in debug count:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting debug count',
      error: error.message
    });
  }
});

// GET /api/products/debug/exists/:id - Check if product exists (for debugging)
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
        id: id
      });
    }

    const product = await Product.findById(id, { _id: 1, name: 1 }).lean();
    
    res.json({
      success: true,
      exists: !!product,
      validId: true,
      id: id,
      productName: product?.name || null
    });

  } catch (error) {
    console.error('Error checking product existence:', error);
    res.json({
      success: false,
      exists: false,
      validId: true,
      error: error.message,
      id: id
    });
  }
});

// GENERAL ROUTES

// GET /api/products - Get products with filters
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      collection, 
      featured, 
      limit = 50, 
      page = 1,
      sort = '-createdAt',
      isActive
    } = req.query;

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
        totalProducts: total
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
});

// POST /api/products - Create new product
router.post('/', upload.array('images', 5), async (req, res) => {
  try {
    console.log('Creating new product with data:', req.body);
    console.log('Uploaded files:', req.files);

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
      occasion
    } = req.body;

    // Validation
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, price, and category are required'
      });
    }

    // Process uploaded images - FIXED: Changed path to /images/filename instead of /images/products/filename
    const images = req.files ? req.files.map(file => `/images/${file.filename}`) : [];
    
    // Generate unique SKU
    const sku = generateSKU(name, category);

    // Parse complex fields
    let parsedSizes = [];
    if (sizes) {
      try {
        parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
      } catch (error) {
        console.error('Error parsing sizes:', error);
        parsedSizes = [{
          size: '50ml',
          price: Number(price),
          available: true,
          stock: Number(stock) || 0
        }];
      }
    } else {
      parsedSizes = [{
        size: '50ml',
        price: Number(price),
        available: true,
        stock: Number(stock) || 0
      }];
    }

    let parsedFragranceNotes = {};
    if (fragrance_notes) {
      try {
        parsedFragranceNotes = typeof fragrance_notes === 'string' ? JSON.parse(fragrance_notes) : fragrance_notes;
      } catch (error) {
        console.error('Error parsing fragrance notes:', error);
        parsedFragranceNotes = { top: [], middle: [], base: [] };
      }
    }

    let parsedPersonalization = { available: false, max_characters: 15, price: 0 };
    if (personalization) {
      try {
        parsedPersonalization = typeof personalization === 'string' ? JSON.parse(personalization) : personalization;
      } catch (error) {
        console.error('Error parsing personalization:', error);
      }
    }

    // Create product object
    const productData = {
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      category: category.toLowerCase(),
      productCollection: productCollection ? productCollection.toLowerCase() : undefined,
      featured: featured === 'true' || featured === true,
      isActive: isActive === 'false' ? false : true,
      images,
      brand: brand ? brand.trim() : '',
      stock: Number(stock) || 0,
      sku,
      rating: rating ? Number(rating) : undefined,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim().toLowerCase())) : [],
      sizes: parsedSizes,
      fragrance_notes: parsedFragranceNotes,
      personalization: parsedPersonalization,
      ingredients: ingredients ? ingredients.trim() : undefined,
      volume: volume ? volume.trim() : undefined,
      concentration: concentration ? concentration.trim() : undefined,
      longevity: longevity ? longevity.trim() : undefined,
      sillage: sillage ? sillage.trim() : undefined,
      season: season ? (Array.isArray(season) ? season : season.split(',').map(s => s.trim())) : [],
      occasion: occasion ? (Array.isArray(occasion) ? occasion : occasion.split(',').map(o => o.trim())) : []
    };

    // Create and save product
    const product = new Product(productData);
    const savedProduct = await product.save();

    console.log('Product created successfully:', savedProduct._id);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: savedProduct
    });

  } catch (error) {
    console.error('Error creating product:', error);
    
    // Clean up uploaded files if product creation fails
    if (req.files) {
      req.files.forEach(file => {
        const filePath = path.join(__dirname, '../../public/images', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
});

// PARAMETERIZED ROUTES LAST

// GET /api/products/:id - Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Fetching product with ID:', id);
    
    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    let product = await Product.findById(id).lean();
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Ensure proper size structure
    product = ensureProductSizes(product);

    console.log('Product found:', product._id);

    res.json({
      success: true,
      data: {
        product: product
      }
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', upload.array('images', 5), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const updateData = { ...req.body };
    
    // Process uploaded images - FIXED: Changed path to /images/filename instead of /images/products/filename
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/images/${file.filename}`);
      
      // If keepExistingImages is true, append new images to existing ones
      if (req.body.keepExistingImages === 'true') {
        updateData.images = [...(existingProduct.images || []), ...newImages];
      } else {
        // Replace existing images
        updateData.images = newImages;
        
        // Delete old image files
        if (existingProduct.images) {
          existingProduct.images.forEach(imagePath => {
            const fullPath = path.join(__dirname, '../../public', imagePath);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
          });
        }
      }
    }

    // Parse complex fields
    if (updateData.sizes && typeof updateData.sizes === 'string') {
      try {
        updateData.sizes = JSON.parse(updateData.sizes);
      } catch (error) {
        console.error('Error parsing sizes:', error);
      }
    }

    if (updateData.fragrance_notes && typeof updateData.fragrance_notes === 'string') {
      try {
        updateData.fragrance_notes = JSON.parse(updateData.fragrance_notes);
      } catch (error) {
        console.error('Error parsing fragrance notes:', error);
      }
    }

    if (updateData.personalization && typeof updateData.personalization === 'string') {
      try {
        updateData.personalization = JSON.parse(updateData.personalization);
      } catch (error) {
        console.error('Error parsing personalization:', error);
      }
    }

    // Handle arrays
    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map(tag => tag.trim().toLowerCase());
    }

    if (updateData.season && typeof updateData.season === 'string') {
      updateData.season = updateData.season.split(',').map(s => s.trim());
    }

    if (updateData.occasion && typeof updateData.occasion === 'string') {
      updateData.occasion = updateData.occasion.split(',').map(o => o.trim());
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

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    console.log('Product updated successfully:', updatedProduct._id);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });

  } catch (error) {
    console.error('Error updating product:', error);
    
    // Clean up uploaded files if update fails - FIXED: Updated path for cleanup
    if (req.files) {
      req.files.forEach(file => {
        const filePath = path.join(__dirname, '../../public/images', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete associated image files
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach(imagePath => {
        const fullPath = path.join(__dirname, '../../public', imagePath);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
            console.log('Deleted image file:', fullPath);
          } catch (error) {
            console.error('Error deleting image file:', fullPath, error);
          }
        }
      });
    }

    await Product.findByIdAndDelete(id);

    console.log('Product deleted successfully:', id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
});

// POST /api/products/:id/toggle-status - Toggle product active status
router.post('/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.isActive = !product.isActive;
    await product.save();

    res.json({
      success: true,
      message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`,
      data: product
    });

  } catch (error) {
    console.error('Error toggling product status:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling product status',
      error: error.message
    });
  }
});

// DELETE /api/products/:id/image/:index - Delete specific image
router.delete('/:id/image/:index', async (req, res) => {
  try {
    const { id, index } = req.params;
    
    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const imageIndex = parseInt(index);
    if (imageIndex < 0 || imageIndex >= (product.images?.length || 0)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image index'
      });
    }

    const imagePath = product.images[imageIndex];
    const fullPath = path.join(__dirname, '../../public', imagePath);
    
    // Delete file from filesystem
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Remove from product
    product.images.splice(imageIndex, 1);
    await product.save();

    res.json({
      success: true,
      message: 'Image deleted successfully',
      data: product
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      error: error.message
    });
  }
});

export default router;