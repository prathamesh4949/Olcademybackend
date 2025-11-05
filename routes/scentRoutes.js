import express from 'express';
import Scent from '../models/Scent.js';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer with proper path handling and ALL image extensions
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
   
    console.log('Uploading file:', {
      original: file.originalname,
      saved: filename,
      extension: ext,
      mimetype: file.mimetype,
      fullPath: path.join(__dirname, '../public/images', filename)
    });
   
    cb(null, filename);
  },
});

// Enhanced file filter to accept ALL common image formats
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
    console.log('File accepted:', file.originalname, 'Type:', file.mimetype);
    cb(null, true);
  } else {
    console.log('File rejected:', file.originalname, 'Type:', file.mimetype);
    cb(new Error(`Only image files are allowed! Received: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for better quality images
  },
  fileFilter: fileFilter,
});

// Helper function to validate custom 24-character hex IDs
const isValidCustomId = (id) => {
  if (!id || typeof id !== 'string') return false;
  const cleanId = id.trim();
  return cleanId.length === 24 && /^[0-9a-fA-F]{24}$/.test(cleanId);
};

// ENHANCED: Check if image file exists with multiple naming patterns and ALL extensions
const findImageFile = (imagePath) => {
  if (!imagePath) return null;

  const cleanFilename = imagePath.replace(/^\/+/, '').replace(/^images\//, '');
  const imagesDir = path.join(__dirname, '../public/images');
  const fullPath = path.join(imagesDir, cleanFilename);

  if (fs.existsSync(fullPath)) {
    console.log('Found exact file:', cleanFilename);
    return fullPath;
  }

  if (!cleanFilename.match(/_\d{13}/)) {
    const ext = path.extname(cleanFilename);
    const baseName = path.basename(cleanFilename, ext);
   
    try {
      const files = fs.readdirSync(imagesDir);
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.ico'];
     
      for (const imageExt of imageExtensions) {
        const pattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d{13}${imageExt.replace('.', '\\.')}$`, 'i');
        const matchingFile = files.find(file => pattern.test(file));
       
        if (matchingFile) {
          const matchingPath = path.join(imagesDir, matchingFile);
          console.log('Found timestamped version:', matchingFile, 'for', cleanFilename);
          return matchingPath;
        }
      }
     
      if (ext) {
        const pattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d{13}${ext.replace('.', '\\.')}$`, 'i');
        const matchingFile = files.find(file => pattern.test(file));
       
        if (matchingFile) {
          const matchingPath = path.join(imagesDir, matchingFile);
          console.log('Found timestamped version:', matchingFile, 'for', cleanFilename);
          return matchingPath;
        }
      }
    } catch (error) {
      console.error('Error searching for timestamped file:', error);
    }
  }

  console.warn('Image file not found:', cleanFilename);
  return null;
};

// ENHANCED: Helper function to delete image files (handles all extensions)
const deleteImageFile = (imagePath) => {
  if (!imagePath) return false;

  const foundPath = findImageFile(imagePath);

  if (foundPath) {
    try {
      fs.unlinkSync(foundPath);
      console.log('Deleted image:', path.basename(foundPath));
      return true;
    } catch (error) {
      console.error('Error deleting image:', foundPath, error.message);
    }
  }

  return false;
};

// Helper to format image paths - store ONLY the filename
const formatImagePath = (filename) => {
  if (!filename) return null;

  const cleanFilename = filename.replace(/^\/+/, '').replace(/^images\//, '');

  console.log('Formatted image path:', {
    input: filename,
    output: cleanFilename
  });

  return cleanFilename;
};

// NEW: Middleware to serve images with fallback to timestamped versions
router.use('/images', (req, res, next) => {
  const requestedFile = req.path.substring(1); // Remove leading slash
  const imagePath = findImageFile(requestedFile);

  if (imagePath) {
    console.log('Serving image:', path.basename(imagePath), 'for request:', requestedFile);
    return res.sendFile(imagePath);
  }

  console.warn('Image not found:', requestedFile);
  next();
});

// Helper function to generate unique SKU
const generateSKU = (name, collection, counter) => {
  const namePrefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
  const collectionPrefix = collection.substring(0, 2).toUpperCase();
  return `${namePrefix}-${collectionPrefix}S-H${counter.toString().padStart(3, '0')}`;
};

// Helper function to ensure scent has proper size structure
const ensureScentSizes = (scent) => {
  if (!scent.sizes || scent.sizes.length === 0) {
    scent.sizes = [
      {
        size: scent.volume || '50ml',
        price: scent.price,
        available: scent.stock > 0,
        stock: scent.stock || 0,
      },
    ];
  } else {
    scent.sizes = scent.sizes.map((size) => ({
      ...size,
      stock: size.stock ?? 0,
      available: size.stock > 0,
    }));
  }
  return scent;
};

// SPECIFIC ROUTES FIRST
// GET /api/scents/featured
router.get('/featured', async (req, res) => {
  try {
    console.log('Fetching featured scents...');
    const collections = [
      'trending',
      'best-seller',
      'signature',
      'limited-edition',
      'mens-signature',
      'orange-marmalade',
      'rose-garden-essence',
      'gender-free',
      'limitless',
      'perfect-discover-gifts',
      'perfect-gifts-premium',
      'perfect-gifts-luxury',
      'home-decor-gifts'
    ];
    const result = {};
    for (const collection of collections) {
      let scents = await Scent.find({
        collection: collection,
        isActive: true,
      })
        .sort('-createdAt')
        .limit(6)
        .lean();
      scents = scents.map(ensureScentSizes);
      console.log(`Found ${scents.length} scents for collection: ${collection}`);
      result[collection.replace(/-/g, '_')] = scents;
    }
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching featured scents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured scents',
      error: error.message,
    });
  }
});

// GET /api/scents/search
router.get('/search', async (req, res) => {
  try {
    const { query, category, collection, minPrice, maxPrice, limit = 20 } = req.query;
    const filter = { isActive: true };
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { brand: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ];
    }
    if (category) {
      filter.category = category.toLowerCase();
    }
    if (collection) {
      filter.collection = collection.toLowerCase();
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    let scents = await Scent.find(filter).limit(parseInt(limit)).lean();
    scents = scents.map(ensureScentSizes);
    res.json({
      success: true,
      data: scents,
      count: scents.length,
    });
  } catch (error) {
    console.error('Error searching scents:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching scents',
      error: error.message,
    });
  }
});

// GET /api/scents/collection/:collection
router.get('/collection/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const { limit = 20, page = 1, sort = '-createdAt' } = req.query;
    const filter = {
      collection: collection.toLowerCase(),
      isActive: true,
    };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let scents = await Scent.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    scents = scents.map(ensureScentSizes);
    const total = await Scent.countDocuments(filter);
    console.log(`Found ${scents.length} scents for collection: ${collection}`);
    res.json({
      success: true,
      data: scents,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: scents.length,
        totalScents: total,
      },
    });
  } catch (error) {
    console.error('Error fetching scents by collection:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scents by collection',
      error: error.message,
    });
  }
});

// GET /api/scents/brand/:brand
router.get('/brand/:brand', async (req, res) => {
  try {
    const { brand } = req.params;
    const { limit = 20, page = 1, sort = '-createdAt' } = req.query;
    const filter = {
      brand: { $regex: new RegExp(brand, 'i') },
      isActive: true,
    };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let scents = await Scent.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    scents = scents.map(ensureScentSizes);
    const total = await Scent.countDocuments(filter);
    console.log(`Found ${scents.length} scents for brand: ${brand}`);
    res.json({
      success: true,
      data: scents,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: scents.length,
        totalScents: total,
      },
    });
  } catch (error) {
    console.error('Error fetching scents by brand:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scents by brand',
      error: error.message,
    });
  }
});

// GET /api/scents/filters
router.get('/filters', async (req, res) => {
  try {
    const categories = await Scent.distinct('category');
    const collections = await Scent.distinct('collection');
    const brands = await Scent.distinct('brand');
    const scentFamilies = await Scent.distinct('scentFamily');
    const intensities = await Scent.distinct('intensity');
    res.json({
      success: true,
      data: {
        categories: categories.filter(Boolean),
        collections: collections.filter(Boolean),
        brands: brands.filter(Boolean),
        scentFamilies: scentFamilies.filter(Boolean),
        intensities: intensities.filter(Boolean),
        longevities: ['2-4 hours', '4-6 hours', '6-8 hours', '8+ hours'],
        sillages: ['intimate', 'moderate', 'strong', 'enormous'],
        concentrations: ['parfum', 'eau de parfum', 'eau de toilette', 'eau de cologne', 'eau fraiche'],
        seasons: ['spring', 'summer', 'autumn', 'winter'],
        occasions: ['casual', 'formal', 'romantic', 'office', 'party', 'evening']
      },
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching filter options',
      error: error.message,
    });
  }
});

// GENERAL ROUTES
// GET /api/scents
router.get('/', async (req, res) => {
  try {
    const { category, collection, featured, limit = 50, page = 1, sort = '-createdAt', isActive } = req.query;
    const filter = {};
    if (category) filter.category = category.toLowerCase();
    if (collection) filter.collection = collection.toLowerCase();
    if (featured) filter.featured = featured === 'true';
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let scents = await Scent.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    scents = scents.map(ensureScentSizes);
    const total = await Scent.countDocuments(filter);
    console.log(`Found ${scents.length} scents with filter:`, filter);
    res.json({
      success: true,
      data: scents,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: scents.length,
        totalScents: total,
      },
    });
  } catch (error) {
    console.error('Error fetching scents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scents',
      error: error.message,
    });
  }
});

// POST /api/scents
router.post('/', upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'hoverImage', maxCount: 1 },
]), async (req, res) => {
  try {
    console.log('Creating new scent with data:', req.body);
    console.log('Uploaded files:', req.files);
    const {
      name,
      description,
      price,
      category,
      collection,
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
      scentFamily,
      intensity,
    } = req.body;
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, price, and category are required',
      });
    }
    const images = req.files['images']
      ? req.files['images'].map((file) => formatImagePath(file.filename))
      : [];
    const hoverImage = req.files['hoverImage']
      ? formatImagePath(req.files['hoverImage'][0].filename)
      : null;
    console.log('Stored image filenames:', { images, hoverImage });
    const counter = (await Scent.countDocuments()) + 100;
    const sku = generateSKU(name, collection || category, counter);
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
    const scentData = {
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      category: category.toLowerCase(),
      collection: collection ? collection.toLowerCase() : undefined,
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
      scentFamily: scentFamily ? scentFamily.trim() : undefined,
      intensity: intensity ? intensity.trim() : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const scent = new Scent(scentData);
    const savedScent = await scent.save();
    console.log('Scent created successfully:', savedScent._id);
    res.status(201).json({
      success: true,
      message: 'Scent created successfully',
      data: savedScent,
    });
  } catch (error) {
    console.error('Error creating scent:', error);
    if (req.files) {
      const filesToDelete = [...(req.files['images'] || []), ...(req.files['hoverImage'] || [])];
      filesToDelete.forEach((file) => {
        deleteImageFile(file.filename);
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Scent with this SKU already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating scent',
      error: error.message,
    });
  }
});

// PARAMETERIZED ROUTES
// GET /api/scents/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching scent with ID:', id);
    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scent ID format',
      });
    }
    let scent = await Scent.findById(id).lean();
    if (!scent) {
      return res.status(404).json({
        success: false,
        message: 'Scent not found',
      });
    }
    scent = ensureScentSizes(scent);
    console.log('Scent found:', scent._id);
    res.json({
      success: true,
      data: scent,
    });
  } catch (error) {
    console.error('Error fetching scent:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scent',
      error: error.message,
    });
  }
});

// ⭐ PUT /api/scents/:id - COMPLETE FIXED VERSION
router.put('/:id', upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'hoverImage', maxCount: 1 },
]), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('========== SCENT UPDATE START ==========');
    console.log('Scent ID:', id);
    console.log('keepExistingImages from body:', req.body.keepExistingImages);
    console.log('All body keys:', Object.keys(req.body));
    console.log('Files received:', req.files ? Object.keys(req.files) : 'none');
    
    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scent ID format',
      });
    }
    
    const existingScent = await Scent.findById(id);
    if (!existingScent) {
      return res.status(404).json({
        success: false,
        message: 'Scent not found',
      });
    }
    
    console.log('BEFORE UPDATE:');
    console.log('- Existing images count:', existingScent.images?.length || 0);
    console.log('- Existing images:', existingScent.images);
    console.log('- Existing hover image:', existingScent.hoverImage);
    
    // Create updateData without images first
    const updateData = {};
    
    // Copy all non-image fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'images' && key !== 'hoverImage' && key !== 'keepExistingImages') {
        updateData[key] = req.body[key];
      }
    });
    
    // ===== IMAGE HANDLING LOGIC =====
    const hasNewImages = req.files?.images?.length > 0;
    const hasNewHoverImage = req.files?.hoverImage?.length > 0;
    const keepExisting = req.body.keepExistingImages === 'true';
    
    console.log('IMAGE DECISION FACTORS:');
    console.log('- New images uploaded:', hasNewImages, hasNewImages ? `(${req.files.images.length} files)` : '');
    console.log('- New hover uploaded:', hasNewHoverImage);
    console.log('- Keep existing flag:', keepExisting);
    
    // Handle main images
    if (hasNewImages) {
      const newImages = req.files.images.map(file => formatImagePath(file.filename));
      console.log('New images to add:', newImages);
      
      if (keepExisting) {
        // APPEND MODE
        const existingImages = Array.isArray(existingScent.images) ? existingScent.images : [];
        updateData.images = [...existingImages, ...newImages];
        console.log('✅ APPEND MODE: Combined', existingImages.length, '+', newImages.length, '=', updateData.images.length, 'images');
      } else {
        // REPLACE MODE
        console.log('✅ REPLACE MODE: Deleting', existingScent.images?.length || 0, 'old images');
        if (existingScent.images?.length > 0) {
          existingScent.images.forEach(img => deleteImageFile(img));
        }
        updateData.images = newImages;
        console.log('✅ REPLACE MODE: Set to', newImages.length, 'new images');
      }
    } else {
      // No new images uploaded
      if (keepExisting) {
        // DON'T touch images field - will preserve existing
        console.log('✅ PRESERVE MODE: Not modifying images field (will keep existing', existingScent.images?.length || 0, 'images)');
        // Don't set updateData.images at all
      } else {
        // Clear images
        console.log('✅ CLEAR MODE: Deleting all images');
        if (existingScent.images?.length > 0) {
          existingScent.images.forEach(img => deleteImageFile(img));
        }
        updateData.images = [];
      }
    }
    
    // Handle hover image
    if (hasNewHoverImage) {
      const newHover = formatImagePath(req.files.hoverImage[0].filename);
      console.log('✅ New hover image:', newHover);
      if (existingScent.hoverImage) {
        deleteImageFile(existingScent.hoverImage);
      }
      updateData.hoverImage = newHover;
    } else {
      if (keepExisting) {
        // DON'T touch hover image field
        console.log('✅ PRESERVE MODE: Not modifying hover image field');
        // Don't set updateData.hoverImage at all
      } else {
        // Clear hover image
        console.log('✅ CLEAR MODE: Removing hover image');
        if (existingScent.hoverImage) {
          deleteImageFile(existingScent.hoverImage);
        }
        updateData.hoverImage = null;
      }
    }
    
    console.log('FINAL UPDATE DATA:');
    console.log('- images field present:', 'images' in updateData);
    console.log('- images value:', updateData.images);
    console.log('- hoverImage field present:', 'hoverImage' in updateData);
    console.log('- hoverImage value:', updateData.hoverImage);
    
    // Parse other fields
    if (updateData.sizes && typeof updateData.sizes === 'string') {
      try {
        updateData.sizes = JSON.parse(updateData.sizes);
      } catch (e) {
        console.error('Error parsing sizes:', e);
      }
    }
    
    if (updateData.fragrance_notes && typeof updateData.fragrance_notes === 'string') {
      try {
        updateData.fragrance_notes = JSON.parse(updateData.fragrance_notes);
      } catch (e) {
        console.error('Error parsing fragrance_notes:', e);
      }
    }
    
    if (updateData.personalization && typeof updateData.personalization === 'string') {
      try {
        updateData.personalization = JSON.parse(updateData.personalization);
      } catch (e) {
        console.error('Error parsing personalization:', e);
      }
    }
    
    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map(t => t.trim().toLowerCase());
    }
    
    if (updateData.season && typeof updateData.season === 'string') {
      updateData.season = updateData.season.split(',').map(s => s.trim().toLowerCase());
    }
    
    if (updateData.occasion && typeof updateData.occasion === 'string') {
      updateData.occasion = updateData.occasion.split(',').map(o => o.trim().toLowerCase());
    }
    
    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.stock) updateData.stock = Number(updateData.stock);
    if (updateData.rating) updateData.rating = Number(updateData.rating);
    if (updateData.featured !== undefined) updateData.featured = updateData.featured === 'true' || updateData.featured === true;
    if (updateData.isActive !== undefined) updateData.isActive = updateData.isActive === 'true' || updateData.isActive === true;
    if (updateData.category) updateData.category = updateData.category.toLowerCase();
    if (updateData.collection) updateData.collection = updateData.collection.toLowerCase();
    
    updateData.updatedAt = new Date();
    
    // Perform update
    const updatedScent = await Scent.findByIdAndUpdate(id, updateData, { 
      new: true, 
      runValidators: true 
    });
    
    console.log('AFTER UPDATE:');
    console.log('- Updated images count:', updatedScent.images?.length || 0);
    console.log('- Updated images:', updatedScent.images);
    console.log('- Updated hover:', updatedScent.hoverImage);
    console.log('========== SCENT UPDATE END ==========');
    
    res.json({
      success: true,
      message: 'Scent updated successfully',
      data: updatedScent,
    });
  } catch (error) {
    console.error('Error updating scent:', error);
    
    if (req.files) {
      const filesToDelete = [...(req.files['images'] || []), ...(req.files['hoverImage'] || [])];
      filesToDelete.forEach(file => deleteImageFile(file.filename));
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating scent',
      error: error.message,
    });
  }
});

// DELETE /api/scents/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scent ID format',
      });
    }
    const scent = await Scent.findById(id);
    if (!scent) {
      return res.status(404).json({
        success: false,
        message: 'Scent not found',
      });
    }
    if (scent.images && Array.isArray(scent.images)) {
      scent.images.forEach((imagePath) => {
        deleteImageFile(imagePath);
      });
    }
    if (scent.hoverImage) {
      deleteImageFile(scent.hoverImage);
    }
    await Scent.findByIdAndDelete(id);
    console.log('Scent deleted successfully:', id);
    res.json({
      success: true,
      message: 'Scent deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting scent:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting scent',
      error: error.message,
    });
  }
});

// PATCH /api/scents/:id/deactivate
router.patch('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scent ID format',
      });
    }
    const scent = await Scent.findById(id);
    if (!scent) {
      return res.status(404).json({
        success: false,
        message: 'Scent not found',
      });
    }
    scent.isActive = !scent.isActive;
    scent.updatedAt = new Date();
    await scent.save();
    res.json({
      success: true,
      message: `Scent ${scent.isActive ? 'activated' : 'deactivated'} successfully`,
      data: scent,
    });
  } catch (error) {
    console.error('Error toggling scent status:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling scent status',
      error: error.message,
    });
  }
});

// DELETE /api/scents/:id/images/:index
router.delete('/:id/images/:index', async (req, res) => {
  try {
    const { id, index } = req.params;
    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scent ID format',
      });
    }
    const scent = await Scent.findById(id);
    if (!scent) {
      return res.status(404).json({
        success: false,
        message: 'Scent not found',
      });
    }
    const imageIndex = parseInt(index);
    if (imageIndex < 0 || imageIndex >= (scent.images?.length || 0)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image index',
      });
    }
    const imagePath = scent.images[imageIndex];
    deleteImageFile(imagePath);
    scent.images.splice(imageIndex, 1);
    scent.updatedAt = new Date();
    await scent.save();
    res.json({
      success: true,
      message: 'Image deleted successfully',
      data: scent.images,
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

// DELETE /api/scents/:id/hover-image
router.delete('/:id/hover-image', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidCustomId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scent ID format',
      });
    }
    const scent = await Scent.findById(id);
    if (!scent) {
      return res.status(404).json({
        success: false,
        message: 'Scent not found',
      });
    }
    if (!scent.hoverImage) {
      return res.status(400).json({
        success: false,
        message: 'No hover image to delete',
      });
    }
    deleteImageFile(scent.hoverImage);
    scent.hoverImage = null;
    scent.updatedAt = new Date();
    await scent.save();
    res.json({
      success: true,
      message: 'Hover image deleted successfully',
      data: scent,
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