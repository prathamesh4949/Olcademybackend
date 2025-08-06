// routes/productRoutes.js
import express from 'express';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

const router = express.Router();

// Helper function to validate custom 24-character hex IDs
const isValidCustomId = (id) => {
  if (!id || typeof id !== 'string') return false;
  const cleanId = id.trim();
  return cleanId.length === 24 && /^[0-9a-fA-F]{24}$/.test(cleanId);
};

// Helper function to ensure product has proper size structure
const ensureProductSizes = (product) => {
  // If product doesn't have sizes array or it's empty, create default sizes
  if (!product.sizes || product.sizes.length === 0) {
    product.sizes = [
      {
        size: '50ml',
        price: product.price,
        available: product.stock > 0
      }
    ];
  } else {
    // Ensure existing sizes have availability based on stock
    product.sizes = product.sizes.map(size => ({
      ...size,
      available: size.available !== undefined ? size.available : product.stock > 0
    }));
  }
  return product;
};

// GET /api/products - Get products with filters
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      collection, 
      featured, 
      limit = 50, 
      page = 1,
      sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    if (category) filter.category = category.toLowerCase();
    if (collection) filter.productCollection = collection.toLowerCase();
    if (featured) filter.featured = featured === 'true';

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination and sorting
    let products = await Product.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Ensure all products have proper size structure
    products = products.map(ensureProductSizes);

    // Get total count for pagination
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

// GET /api/products/women/collections - Get women's products by collections
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

      // Ensure all products have proper size structure
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

// GET /api/products/men/collections - Get men's products by collections
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

      // Ensure all products have proper size structure
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

// GET /api/products/unisex/collections - Get unisex products by collections
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

      // Ensure all products have proper size structure
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

// GET /api/products/search - Search products
router.get('/search', async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, limit = 20 } = req.query;
    const filter = { isActive: true };
    
    // Text search
    if (q) {
      filter.$text = { $search: q };
    }
    
    // Category filter
    if (category) {
      filter.category = category.toLowerCase();
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseInt(minPrice);
      if (maxPrice) filter.price.$lte = parseInt(maxPrice);
    }

    let products = await Product.find(filter)
      .limit(parseInt(limit))
      .lean();

    // Ensure all products have proper size structure
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

// GET /api/products/debug/exists/:id - Check if product exists (handles custom IDs)
router.get('/debug/exists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 Debug: Checking product existence for ID:', id);
    
    if (!isValidCustomId(id)) {
      console.log('❌ Invalid custom ID format:', id);
      return res.json({
        success: true,
        exists: false,
        error: 'Invalid ID format',
        id: id,
        validId: false,
        expectedLength: 24,
        actualLength: id?.length || 0,
        expectedFormat: '24 character hexadecimal string'
      });
    }
    
    console.log('🔍 Searching for product with custom ID:', id);
    let product = await Product.findOne({ _id: id }).lean();
    
    if (product) {
      product = ensureProductSizes(product);
    }
    
    console.log('🔍 Product lookup result:', product ? 'Found' : 'Not found');
    
    res.json({
      success: true,
      exists: !!product,
      id: id,
      validId: true,
      product: product ? {
        _id: product._id,
        name: product.name,
        category: product.category,
        isActive: product.isActive,
        price: product.price,
        brand: product.brand,
        sizes: product.sizes
      } : null
    });
  } catch (error) {
    console.error('Error in debug exists check:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking product existence',
      error: error.message,
      id: req.params.id
    });
  }
});

// UPDATED: GET /api/products/:id - Get single product (handles custom IDs)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 Fetching product by ID:', {
      id,
      idType: typeof id,
      idLength: id.length,
      isValidCustomId: isValidCustomId(id)
    });
    
    if (!id) {
      console.error('❌ No ID provided');
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
        validFormat: false
      });
    }
    
    const cleanId = id.toString().trim();
    if (cleanId.length !== 24) {
      console.error('❌ Invalid ID length:', cleanId.length);
      return res.status(400).json({
        success: false,
        message: `Invalid product ID format. Expected 24 characters, got ${cleanId.length}`,
        id: cleanId,
        validFormat: false,
        expectedLength: 24,
        actualLength: cleanId.length
      });
    }
    
    if (!isValidCustomId(cleanId)) {
      console.error('❌ Invalid custom ID format:', cleanId);
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
        id: cleanId,
        validFormat: false,
        expectedFormat: '24 character hexadecimal string'
      });
    }
    
    console.log('🔍 Searching for product in database with custom ID...');
    
    let product = await Product.findOne({ _id: cleanId }).lean();
    
    if (!product) {
      console.error('❌ Product not found:', cleanId);
      
      const sampleProducts = await Product.find({}, { _id: 1, name: 1, category: 1 }).limit(5).lean();
      const totalCount = await Product.countDocuments();
      
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        id: cleanId,
        debug: {
          searchedId: cleanId,
          totalProductsInDB: totalCount,
          sampleProductIds: sampleProducts.map(p => ({
            _id: p._id.toString(),
            name: p.name,
            category: p.category
          })),
          searchMethod: 'Custom ID lookup',
          idFormat: 'Custom 24-character hex string'
        }
      });
    }

    // Ensure product has proper size structure
    product = ensureProductSizes(product);

    console.log('✅ Product found:', {
      id: product._id,
      name: product.name,
      category: product.category,
      hasImages: !!(product.images && product.images.length > 0),
      hasAvailableSizes: product.sizes.some(size => size.available)
    });

    // Get related products from same category, excluding current product
    console.log('🔍 Fetching related products...');
    let relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true
    })
    .limit(4)
    .lean();

    // Ensure related products have proper size structure
    relatedProducts = relatedProducts.map(ensureProductSizes);

    console.log('✅ Related products found:', relatedProducts.length);

    // Ensure all required fields are present
    const completeProduct = {
      ...product,
      images: product.images || [],
      sizes: product.sizes || [],
      fragrance_notes: product.fragrance_notes || {},
      personalization: product.personalization || { available: false },
      rating: product.rating || null,
      brand: product.brand || '',
      description: product.description || 'No description available'
    };

    res.json({
      success: true,
      data: {
        product: completeProduct,
        relatedProducts: relatedProducts || []
      },
      debug: {
        productId: product._id.toString(),
        relatedCount: relatedProducts.length,
        timestamp: new Date().toISOString(),
        idType: 'Custom ID',
        availableSizes: completeProduct.sizes.filter(size => size.available).length,
        totalSizes: completeProduct.sizes.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching product:', {
      id: req.params.id,
      error: error.message,
      stack: error.stack
    });
    
    let statusCode = 500;
    let errorMessage = 'Error fetching product';
    
    if (error.name === 'CastError') {
      statusCode = 400;
      errorMessage = 'Invalid product ID format';
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      errorMessage = 'Product validation failed';
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message,
      id: req.params.id,
      errorType: error.name || 'UnknownError'
    });
  }
});

// GET /api/products/debug/count - Enhanced debug endpoint
router.get('/debug/count', async (req, res) => {
  try {
    console.log('🔍 Getting debug counts...');
    
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const womenProducts = await Product.countDocuments({ category: 'women' });
    const menProducts = await Product.countDocuments({ category: 'men' });
    const unisexProducts = await Product.countDocuments({ category: 'unisex' });
    
    const collectionCounts = {};
    const collections = ['just-arrived', 'best-sellers', 'huntsman-savile-row'];
    
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

    let sampleProducts = await Product.find({}, { _id: 1, name: 1, category: 1, productCollection: 1, isActive: 1, stock: 1, sizes: 1 }).limit(20).lean();
    
    // Ensure sample products have proper size structure
    sampleProducts = sampleProducts.map(ensureProductSizes);

    const productsByCategory = {
      men: await Product.find({ category: 'men' }, { _id: 1, name: 1, productCollection: 1, stock: 1, sizes: 1 }).limit(10).lean(),
      women: await Product.find({ category: 'women' }, { _id: 1, name: 1, productCollection: 1, stock: 1, sizes: 1 }).limit(10).lean(),
      unisex: await Product.find({ category: 'unisex' }, { _id: 1, name: 1, productCollection: 1, stock: 1, sizes: 1 }).limit(10).lean()
    };

    // Ensure products by category have proper size structure
    Object.keys(productsByCategory).forEach(category => {
      productsByCategory[category] = productsByCategory[category].map(ensureProductSizes);
    });

    console.log('✅ Debug counts completed');

    res.json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        womenProducts,
        menProducts,
        unisexProducts,
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

export default router;