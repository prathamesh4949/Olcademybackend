import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import Banner from '../models/Banner.js';

const router = express.Router();

// Configure multer for banner image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = 'uploads/images';
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      console.error('Error creating upload directory:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const fieldName = file.fieldname;
      const filename = `banner-${fieldName}-${uniqueSuffix}${extension}`;
      cb(null, filename);
    } catch (error) {
      console.error('Error generating filename:', error);
      cb(error);
    }
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WebP) are allowed!'));
    }
  }
});

// Helper function to delete file safely
const deleteFile = async (filePath) => {
  try {
    if (filePath && typeof filePath === 'string') {
      await fs.unlink(filePath);
      console.log(`Deleted file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error.message);
  }
};

// Helper function to get file path from URL
const getFilePathFromUrl = (url) => {
  try {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('/images/')) {
      return `uploads${url}`;
    }
    return `uploads/images/${url}`;
  } catch (error) {
    console.error('Error processing file path:', error);
    return null;
  }
};

// IMPORTANT: Debug route must come BEFORE parameterized routes
// GET /api/banners/debug/count - Debug endpoint
router.get('/debug/count', async (req, res) => {
  try {
    const totalBanners = await Banner.countDocuments();
    const activeBanners = await Banner.countDocuments({ isActive: true });
    
    const categoryCounts = {};
    const categories = ['home', 'men', 'women', 'unisex', 'gift'];
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
      .select('_id title category type')
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
          type: b.type
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

    // Handle file uploads
    if (req.files) {
      if (req.files.backgroundImage && req.files.backgroundImage[0]) {
        bannerData.backgroundImage = `/images/${req.files.backgroundImage[0].filename}`;
        console.log('Background image uploaded:', bannerData.backgroundImage);
      }
      if (req.files.image && req.files.image[0]) {
        bannerData.image = `/images/${req.files.image[0].filename}`;
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
        await deleteFile(`uploads/images/${req.files.backgroundImage[0].filename}`);
      }
      if (req.files.image && req.files.image[0]) {
        await deleteFile(`uploads/images/${req.files.image[0].filename}`);
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
          await deleteFile(`uploads/images/${req.files.backgroundImage[0].filename}`);
        }
        if (req.files.image && req.files.image[0]) {
          await deleteFile(`uploads/images/${req.files.image[0].filename}`);
        }
      }
      
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    console.log('Existing banner found:', existingBanner.title);

    const oldFiles = [];
    
    if (req.files) {
      if (req.files.backgroundImage && req.files.backgroundImage[0]) {
        if (existingBanner.backgroundImage && !keepExistingImages) {
          const oldPath = getFilePathFromUrl(existingBanner.backgroundImage);
          if (oldPath) oldFiles.push(oldPath);
        }
        updateData.backgroundImage = `/images/${req.files.backgroundImage[0].filename}`;
        console.log('New background image:', updateData.backgroundImage);
      }
      
      if (req.files.image && req.files.image[0]) {
        if (existingBanner.image && !keepExistingImages) {
          const oldPath = getFilePathFromUrl(existingBanner.image);
          if (oldPath) oldFiles.push(oldPath);
        }
        updateData.image = `/images/${req.files.image[0].filename}`;
        console.log('New image:', updateData.image);
      }
    }

    delete updateData.keepExistingImages;

    console.log('Update data:', updateData);
    console.log('Old files to delete:', oldFiles);

    const updatedBanner = await Banner.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    console.log('Banner updated successfully:', updatedBanner._id);

    // Delete old files after successful update
    for (const filePath of oldFiles) {
      await deleteFile(filePath);
    }

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
        await deleteFile(`uploads/images/${req.files.backgroundImage[0].filename}`);
      }
      if (req.files.image && req.files.image[0]) {
        await deleteFile(`uploads/images/${req.files.image[0].filename}`);
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
    const filesToDelete = [];
    if (banner.backgroundImage) {
      const bgPath = getFilePathFromUrl(banner.backgroundImage);
      if (bgPath) filesToDelete.push(bgPath);
    }
    if (banner.image) {
      const imgPath = getFilePathFromUrl(banner.image);
      if (imgPath) filesToDelete.push(imgPath);
    }

    // Delete files
    for (const filePath of filesToDelete) {
      await deleteFile(filePath);
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

    if (!['background', 'image'].includes(imageType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image type. Must be "background" or "image"'
      });
    }

    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    const imageField = imageType === 'background' ? 'backgroundImage' : 'image';
    const imageUrl = banner[imageField];

    if (!imageUrl) {
      return res.status(404).json({
        success: false,
        message: `No ${imageType} image found for this banner`
      });
    }

    // Delete file from filesystem
    const filePath = getFilePathFromUrl(imageUrl);
    if (filePath) {
      await deleteFile(filePath);
    }

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