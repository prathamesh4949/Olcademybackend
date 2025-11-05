import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Banner from '../models/Banner.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    
    console.log('📁 Uploading banner file:', {
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
    console.log('✅ Banner file accepted:', file.originalname, 'Type:', file.mimetype);
    cb(null, true);
  } else {
    console.log('❌ Banner file rejected:', file.originalname, 'Type:', file.mimetype);
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

// ✅ ENHANCED: Check if image file exists with multiple naming patterns and ALL extensions
const findImageFile = (imagePath) => {
  if (!imagePath) return null;
  
  // Clean the path to get just the filename
  const cleanFilename = imagePath.replace(/^\/+/, '').replace(/^images\//, '');
  const imagesDir = path.join(__dirname, '../public/images');
  const fullPath = path.join(imagesDir, cleanFilename);
  
  // Check if exact file exists
  if (fs.existsSync(fullPath)) {
    console.log('✅ Found exact banner file:', cleanFilename);
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
          console.log('✅ Found timestamped banner version:', matchingFile, 'for', cleanFilename);
          return matchingPath;
        }
      }
      
      // If original extension search didn't work, try with the same extension
      if (ext) {
        const pattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d{13}${ext.replace('.', '\\.')}$`, 'i');
        const matchingFile = files.find(file => pattern.test(file));
        
        if (matchingFile) {
          const matchingPath = path.join(imagesDir, matchingFile);
          console.log('✅ Found timestamped banner version:', matchingFile, 'for', cleanFilename);
          return matchingPath;
        }
      }
    } catch (error) {
      console.error('❌ Error searching for timestamped banner file:', error);
    }
  }
  
  console.warn('⚠️ Banner image file not found:', cleanFilename);
  return null;
};

// ✅ ENHANCED: Helper function to delete image files (handles all extensions)
const deleteImageFile = (imagePath) => {
  if (!imagePath) return false;
  
  const foundPath = findImageFile(imagePath);
  
  if (foundPath) {
    try {
      fs.unlinkSync(foundPath);
      console.log('✅ Deleted banner image:', path.basename(foundPath));
      return true;
    } catch (error) {
      console.error('❌ Error deleting banner image:', foundPath, error.message);
    }
  }
  
  return false;
};

// ✅ Helper to format image paths - store ONLY the filename
const formatImagePath = (filename) => {
  if (!filename) return null;
  
  // Strip any existing path prefixes - store ONLY the filename
  const cleanFilename = filename.replace(/^\/+/, '').replace(/^images\//, '');
  
  console.log('📝 Formatted banner image path:', {
    input: filename,
    output: cleanFilename
  });
  
  return cleanFilename;
};

// ✅ NEW: Middleware to serve banner images with fallback to timestamped versions
router.use('/images', (req, res, next) => {
  const requestedFile = req.path.substring(1); // Remove leading slash
  const imagePath = findImageFile(requestedFile);
  
  if (imagePath) {
    console.log('📸 Serving banner image:', path.basename(imagePath), 'for request:', requestedFile);
    return res.sendFile(imagePath);
  }
  
  console.warn('⚠️ Banner image not found:', requestedFile);
  // Let express handle 404
  next();
});

// IMPORTANT: Debug route must come BEFORE parameterized routes
// GET /api/banners/debug/count - Debug endpoint
router.get('/debug/count', async (req, res) => {
  try {
    const totalBanners = await Banner.countDocuments();
    const activeBanners = await Banner.countDocuments({ isActive: true });
    
    const categoryCounts = {};
    const categories = ['home', 'men', 'women', 'unisex', 'gift', 'gifts'];
    const types = ['hero', 'product_highlight', 'collection_highlight', 'gift_highlight'];
    
    for (const category of categories) {
      categoryCounts[category] = await Banner.countDocuments({ category });
      
      for (const type of types) {
        categoryCounts[`${category}_${type}`] = await Banner.countDocuments({ 
          category, 
          type 
        });
      }
    }

    const sampleBanners = await Banner.find()
      .select('_id title category type backgroundImage image')
      .limit(5)
      .lean();

    res.json({
      success: true,
      data: {
        totalBanners,
        activeBanners,
        categoryCounts,
        sampleBanners: sampleBanners.map(b => ({
          id: b._id,
          title: b.title,
          category: b.category,
          type: b.type,
          backgroundImage: b.backgroundImage,
          image: b.image
        }))
      }
    });
  } catch (error) {
    console.error('Error in banner debug count:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting debug count',
      error: error.message
    });
  }
});

// GET /api/banners - Get all banners with filters
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      type, 
      isActive = 'true',
      limit,
      page = 1,
      sort = '-createdAt'
    } = req.query;

    console.log('GET /api/banners - Query params:', req.query);

    const filter = {};
    
    if (category && category !== 'all') filter.category = category.toLowerCase();
    if (type && type !== 'all') filter.type = type;
    if (isActive !== 'all') filter.isActive = isActive === 'true';

    console.log('Applied filter:', filter);

    let query = Banner.find(filter);

    if (sort) {
      query = query.sort(sort);
    }
    
    if (limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      query = query.limit(parseInt(limit)).skip(skip);
    }

    const banners = await query.lean();
    const total = await Banner.countDocuments(filter);

    console.log(`Found ${banners.length} banners`);

    res.json({
      success: true,
      data: banners,
      pagination: limit ? {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: banners.length,
        totalBanners: total
      } : null
    });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching banners',
      error: error.message
    });
  }
});

// POST /api/banners - Create new banner
router.post('/', upload.fields([
  { name: 'backgroundImage', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('POST /api/banners - Creating new banner');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);

    const bannerData = { ...req.body };

    // Handle file uploads - store ONLY the filename
    if (req.files) {
      if (req.files.backgroundImage && req.files.backgroundImage[0]) {
        bannerData.backgroundImage = formatImagePath(req.files.backgroundImage[0].filename);
        console.log('Background image uploaded:', bannerData.backgroundImage);
      }
      if (req.files.image && req.files.image[0]) {
        bannerData.image = formatImagePath(req.files.image[0].filename);
        console.log('Image uploaded:', bannerData.image);
      }
    }

    // Validate required fields
    if (!bannerData.title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    if (!bannerData.category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    if (!bannerData.type) {
      return res.status(400).json({
        success: false,
        message: 'Type is required'
      });
    }

    // Ensure lowercase for category
    if (bannerData.category) {
      bannerData.category = bannerData.category.toLowerCase();
    }

    console.log('Creating banner with data:', bannerData);

    const banner = new Banner(bannerData);
    await banner.save();

    console.log('Banner created successfully:', banner._id);

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: banner
    });
  } catch (error) {
    console.error('Error creating banner:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      if (req.files.backgroundImage && req.files.backgroundImage[0]) {
        deleteImageFile(req.files.backgroundImage[0].filename);
      }
      if (req.files.image && req.files.image[0]) {
        deleteImageFile(req.files.image[0].filename);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating banner',
      error: error.message
    });
  }
});

// PUT /api/banners/:id - Update banner
router.put('/:id', upload.fields([
  { name: 'backgroundImage', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`PUT /api/banners/${id} - Updating banner`);
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);

    const updateData = { ...req.body };
    const keepExistingImages = req.body.keepExistingImages === 'true';

    const existingBanner = await Banner.findById(id);
    if (!existingBanner) {
      // Clean up any uploaded files if banner doesn't exist
      if (req.files) {
        if (req.files.backgroundImage && req.files.backgroundImage[0]) {
          deleteImageFile(req.files.backgroundImage[0].filename);
        }
        if (req.files.image && req.files.image[0]) {
          deleteImageFile(req.files.image[0].filename);
        }
      }
      
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    console.log('Existing banner found:', existingBanner.title);

    // Handle file uploads
    if (req.files) {
      if (req.files.backgroundImage && req.files.backgroundImage[0]) {
        // Delete old background image if not keeping existing
        if (existingBanner.backgroundImage && !keepExistingImages) {
          deleteImageFile(existingBanner.backgroundImage);
        }
        updateData.backgroundImage = formatImagePath(req.files.backgroundImage[0].filename);
        console.log('New background image:', updateData.backgroundImage);
      }
      
      if (req.files.image && req.files.image[0]) {
        // Delete old image if not keeping existing
        if (existingBanner.image && !keepExistingImages) {
          deleteImageFile(existingBanner.image);
        }
        updateData.image = formatImagePath(req.files.image[0].filename);
        console.log('New image:', updateData.image);
      }
    }

    // Ensure lowercase for category
    if (updateData.category) {
      updateData.category = updateData.category.toLowerCase();
    }

    // Convert boolean fields
    if (updateData.isActive !== undefined) {
      updateData.isActive = updateData.isActive === 'true' || updateData.isActive === true;
    }

    delete updateData.keepExistingImages;

    console.log('Update data:', updateData);

    const updatedBanner = await Banner.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    console.log('Banner updated successfully:', updatedBanner._id);

    res.json({
      success: true,
      message: 'Banner updated successfully',
      data: updatedBanner
    });
  } catch (error) {
    console.error('Error updating banner:', error);
    
    // Clean up new files on error
    if (req.files) {
      if (req.files.backgroundImage && req.files.backgroundImage[0]) {
        deleteImageFile(req.files.backgroundImage[0].filename);
      }
      if (req.files.image && req.files.image[0]) {
        deleteImageFile(req.files.image[0].filename);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating banner',
      error: error.message
    });
  }
});

// DELETE /api/banners/:id - Delete banner
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`DELETE /api/banners/${id} - Deleting banner`);

    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    console.log('Banner found for deletion:', banner.title);

    // Delete banner from database first
    await Banner.findByIdAndDelete(id);

    // Then delete associated files
    if (banner.backgroundImage) {
      deleteImageFile(banner.backgroundImage);
    }
    if (banner.image) {
      deleteImageFile(banner.image);
    }

    console.log('Banner deleted successfully');

    res.json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting banner',
      error: error.message
    });
  }
});

// POST /api/banners/:id/toggle-status - Toggle banner status
router.post('/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`POST /api/banners/${id}/toggle-status - Toggling banner status`);

    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    banner.isActive = !banner.isActive;
    await banner.save();

    console.log(`Banner ${banner.isActive ? 'activated' : 'deactivated'}`);

    res.json({
      success: true,
      message: `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: banner.isActive }
    });
  } catch (error) {
    console.error('Error toggling banner status:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling banner status',
      error: error.message
    });
  }
});

// DELETE /api/banners/:id/image/:imageType - Delete specific image
router.delete('/:id/image/:imageType', async (req, res) => {
  try {
    const { id, imageType } = req.params;
    console.log(`DELETE /api/banners/${id}/image/${imageType} - Deleting specific image`);

    if (!['background', 'backgroundImage', 'image'].includes(imageType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image type. Must be "background", "backgroundImage", or "image"'
      });
    }

    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    // Normalize imageType
    const imageField = imageType === 'background' ? 'backgroundImage' : imageType;
    const imageUrl = banner[imageField];

    if (!imageUrl) {
      return res.status(404).json({
        success: false,
        message: `No ${imageType} image found for this banner`
      });
    }

    // Delete file from filesystem
    deleteImageFile(imageUrl);

    // Remove image reference from database
    banner[imageField] = undefined;
    await banner.save();

    console.log(`${imageType} image deleted successfully`);

    res.json({
      success: true,
      message: `${imageType} image deleted successfully`
    });
  } catch (error) {
    console.error(`Error deleting ${req.params.imageType} image:`, error);
    res.status(500).json({
      success: false,
      message: `Error deleting ${req.params.imageType} image`,
      error: error.message
    });
  }
});

// POST /api/banners/:id/click - Track banner clicks
router.post('/:id/click', async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findByIdAndUpdate(
      id,
      { $inc: { clickCount: 1 } },
      { new: true }
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    res.json({
      success: true,
      message: 'Click tracked successfully',
      clickCount: banner.clickCount
    });
  } catch (error) {
    console.error('Error tracking banner click:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking click',
      error: error.message
    });
  }
});

// GET /api/banners/:category - Get banners by category
router.get('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { type, isActive = 'true', limit } = req.query;

    console.log(`GET /api/banners/${category} - Fetching banners by category`);
    console.log('Query params:', { type, isActive, limit });

    const filter = { 
      category: category.toLowerCase(),
      ...(isActive !== 'all' && { isActive: isActive === 'true' })
    };
    
    if (type) filter.type = type;

    console.log('Applied filter:', filter);

    let query = Banner.find(filter).sort({ order: 1, createdAt: -1 });
    
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const banners = await query.lean();

    console.log(`Found ${banners.length} banners for category ${category}`);

    res.json({
      success: true,
      data: banners,
      count: banners.length
    });
  } catch (error) {
    console.error('Error fetching banners by category:', error);
    res.status(500).json({
      success: false,
      message: `Error fetching banners for category ${req.params.category}`,
      error: error.message
    });
  }
});

// GET /api/banners/:category/:type - Get specific banner
router.get('/:category/:type', async (req, res) => {
  try {
    const { category, type } = req.params;

    console.log(`GET /api/banners/${category}/${type} - Fetching specific banner`);

    const banner = await Banner.findOne({
      category: category.toLowerCase(),
      type,
      isActive: true
    }).lean();

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: `Banner not found for category: ${category}, type: ${type}`
      });
    }

    // Increment impression count
    await Banner.findByIdAndUpdate(banner._id, { 
      $inc: { impressionCount: 1 } 
    });

    console.log(`Found banner: ${banner.title}`);

    res.json({
      success: true,
      data: banner
    });
  } catch (error) {
    console.error('Error fetching specific banner:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching banner',
      error: error.message
    });
  }
});

export default router;