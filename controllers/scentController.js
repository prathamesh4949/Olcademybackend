import Scent from '../models/Scent.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads - preserve original filename
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'public/images/';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Use original filename directly without any modifications
    cb(null, file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit per file
  }
}).fields([
  { name: 'images', maxCount: 5 },
  { name: 'hoverImage', maxCount: 1 }
]);

// Get all scents with optional filters
export const getAllScents = async (req, res) => {
  try {
    const { 
      collection, 
      category, 
      scentFamily, 
      minPrice, 
      maxPrice, 
      inStock,
      isActive,
      isNew, 
      isFeatured,
      featured,
      brand,
      intensity,
      longevity,
      sillage,
      season,
      occasion,
      concentration,
      search,
      page = 1, 
      limit = 1000,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    // Basic filters
    if (collection) filter.collection = collection.toLowerCase();
    if (category) filter.category = category.toLowerCase();
    if (scentFamily) filter.scentFamily = scentFamily.toLowerCase();
    if (brand) filter.brand = new RegExp(brand, 'i');
    if (intensity) filter.intensity = intensity;
    if (longevity) filter.longevity = longevity;
    if (sillage) filter.sillage = sillage;
    if (concentration) filter.concentration = concentration;
    if (season) filter.season = { $in: [season.toLowerCase()] };
    if (occasion) filter.occasion = { $in: [occasion.toLowerCase()] };
    
    // Boolean filters - handle string 'true'/'false' from query params
    if (isActive !== undefined) filter.isActive = isActive === 'true' || isActive === true;
    if (inStock !== undefined) filter.inStock = inStock === 'true' || inStock === true;
    if (isNew !== undefined) filter.isNew = isNew === 'true' || isNew === true;
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (featured !== undefined) filter.featured = featured === 'true' || featured === true;
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Text search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Sort object
    const sort = {};
    const actualSortBy = sortBy.replace('-', '');
    const actualSortOrder = sortBy.startsWith('-') ? -1 : (sortOrder === 'desc' ? -1 : 1);
    sort[actualSortBy] = actualSortOrder;

    // Pagination
    const skip = (page - 1) * limit;

    const scents = await Scent.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Scent.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: scents,
      pagination: {
        current: Number(page),
        totalPages: Math.ceil(total / limit),
        total: total,
        limit: Number(limit)
      },
      filters: filter
    });
  } catch (error) {
    console.error('Error fetching scents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scents',
      error: error.message
    });
  }
};

// Get scents by collection (updated with gift collections)
export const getScentsByCollection = async (req, res) => {
  try {
    const { collection } = req.params;
    const { 
      category, 
      scentFamily,
      brand,
      intensity,
      minPrice,
      maxPrice,
      isActive = true,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Updated to include new gift collections
    const validCollections = [
      'trending', 'best-seller', 'signature', 'limited-edition', 
      'mens-signature', 'orange-marmalade', 'rose-garden-essence', 
      'gender-free', 'limitless', 'perfect-discover-gifts', 
      'perfect-gifts-premium', 'perfect-gifts-luxury', 'home-decor-gifts'
    ];

    if (!validCollections.includes(collection)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection type'
      });
    }

    const filter = { 
      collection: collection.toLowerCase(),
      isActive: isActive === 'true' || isActive === true
    };
    
    if (category) filter.category = category.toLowerCase();
    if (scentFamily) filter.scentFamily = scentFamily.toLowerCase();
    if (brand) filter.brand = new RegExp(brand, 'i');
    if (intensity) filter.intensity = intensity;
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (page - 1) * limit;

    const scents = await Scent.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Scent.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: scents,
      collection: collection,
      count: scents.length,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching scents by collection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scents by collection',
      error: error.message
    });
  }
};

// Get single scent by ID
export const getScentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scent ID format'
      });
    }

    const scent = await Scent.findById(id);

    if (!scent) {
      return res.status(404).json({
        success: false,
        message: 'Scent not found'
      });
    }

    res.status(200).json({
      success: true,
      data: scent
    });
  } catch (error) {
    console.error('Error fetching scent by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scent',
      error: error.message
    });
  }
};

// Get featured scents for homepage (updated with gift collections)
export const getFeaturedScents = async (req, res) => {
  try {
    const trending = await Scent.find({ 
      collection: 'trending', 
      $or: [{ isFeatured: true }, { featured: true }],
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    const bestSellers = await Scent.find({ 
      collection: 'best-seller', 
      $or: [{ isFeatured: true }, { featured: true }],
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    const signature = await Scent.find({ 
      collection: 'signature', 
      $or: [{ isFeatured: true }, { featured: true }],
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    const limitedEdition = await Scent.find({ 
      collection: 'limited-edition', 
      $or: [{ isFeatured: true }, { featured: true }],
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    // Men's collections
    const mensSignature = await Scent.find({ 
      collection: 'mens-signature', 
      $or: [{ isFeatured: true }, { featured: true }],
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    const orangeMarmalade = await Scent.find({ 
      collection: 'orange-marmalade', 
      $or: [{ isFeatured: true }, { featured: true }],
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    // Women's collection
    const roseGardenEssence = await Scent.find({ 
      collection: 'rose-garden-essence', 
      $or: [{ isFeatured: true }, { featured: true }],
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    // Unisex collections
    const genderFree = await Scent.find({ 
      collection: 'gender-free', 
      $or: [{ isFeatured: true }, { featured: true }],
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    const limitless = await Scent.find({ 
      collection: 'limitless', 
      $or: [{ isFeatured: true }, { featured: true }],
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    // NEW: Gift collections
    const perfectDiscoverGifts = await Scent.find({ 
      collection: 'perfect-discover-gifts', 
      $or: [{ isFeatured: true }, { featured: true }],
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    const perfectGiftsPremium = await Scent.find({ 
      collection: 'perfect-gifts-premium', 
      $or: [{ isFeatured: true }, { featured: true }],
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    const perfectGiftsLuxury = await Scent.find({ 
      collection: 'perfect-gifts-luxury', 
      $or: [{ isFeatured: true }, { featured: true }],
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    const homeDecorGifts = await Scent.find({ 
      collection: 'home-decor-gifts', 
      $or: [{ isFeatured: true }, { featured: true }],
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        trending: trending,
        bestSellers: bestSellers,
        signature: signature,
        limitedEdition: limitedEdition,
        mensSignature: mensSignature,
        orangeMarmalade: orangeMarmalade,
        roseGardenEssence: roseGardenEssence,
        genderFree: genderFree,
        limitless: limitless,
        // NEW: Gift collections
        perfectDiscoverGifts: perfectDiscoverGifts,
        perfectGiftsPremium: perfectGiftsPremium,
        perfectGiftsLuxury: perfectGiftsLuxury,
        homeDecorGifts: homeDecorGifts
      }
    });
  } catch (error) {
    console.error('Error fetching featured scents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured scents',
      error: error.message
    });
  }
};

// Get scents by brand
export const getScentsByBrand = async (req, res) => {
  try {
    const { brand } = req.params;
    const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = req.query;

    const filter = { 
      brand: new RegExp(brand, 'i'),
      isActive: true
    };

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const scents = await Scent.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Scent.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: scents,
      brand: brand,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching scents by brand:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scents by brand',
      error: error.message
    });
  }
};

// Search scents
export const searchScents = async (req, res) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const filter = {
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { brand: { $regex: query, $options: 'i' } },
            { scentFamily: { $regex: query, $options: 'i' } },
            { tags: { $in: [new RegExp(query, 'i')] } }
          ]
        }
      ]
    };

    const skip = (page - 1) * limit;

    const scents = await Scent.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Scent.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: scents,
      query: query,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error searching scents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search scents',
      error: error.message
    });
  }
};

// Create new scent (admin only) - Updated to preserve original filename
export const createScent = async (req, res) => {
  try {
    // Handle file upload first
    upload(req, res, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({
          success: false,
          message: 'File upload failed',
          error: err.message
        });
      }

      try {
        const scentData = { ...req.body };

        // Process uploaded images - store original filenames as /images/originalname.ext
        if (req.files) {
          if (req.files.images) {
            scentData.images = req.files.images.map(file => `/images/${file.filename}`);
          }
          if (req.files.hoverImage && req.files.hoverImage[0]) {
            scentData.hoverImage = `/images/${req.files.hoverImage[0].filename}`;
          }
        }

        // Process JSON fields
        if (scentData.sizes) {
          try {
            scentData.sizes = JSON.parse(scentData.sizes);
          } catch (e) {
            console.error('Error parsing sizes:', e);
          }
        }

        if (scentData.fragrance_notes) {
          try {
            scentData.fragrance_notes = JSON.parse(scentData.fragrance_notes);
          } catch (e) {
            console.error('Error parsing fragrance_notes:', e);
          }
        }

        if (scentData.personalization) {
          try {
            scentData.personalization = JSON.parse(scentData.personalization);
          } catch (e) {
            console.error('Error parsing personalization:', e);
          }
        }

        // Process comma-separated arrays
        if (scentData.tags && typeof scentData.tags === 'string') {
          scentData.tags = scentData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        }

        if (scentData.season && typeof scentData.season === 'string') {
          scentData.season = scentData.season.split(',').map(s => s.trim()).filter(s => s);
        }

        if (scentData.occasion && typeof scentData.occasion === 'string') {
          scentData.occasion = scentData.occasion.split(',').map(o => o.trim()).filter(o => o);
        }

        if (scentData.ingredients && typeof scentData.ingredients === 'string') {
          scentData.ingredients = scentData.ingredients.split(',').map(i => i.trim()).filter(i => i);
        }

        // Generate SKU if not provided
        if (!scentData.sku) {
          const timestamp = Date.now().toString().slice(-6);
          const namePrefix = scentData.name ? scentData.name.substring(0, 3).toUpperCase() : 'SCT';
          scentData.sku = `${namePrefix}${timestamp}`;
        }

        // Ensure lowercase for certain fields
        if (scentData.category) scentData.category = scentData.category.toLowerCase();
        if (scentData.collection) scentData.collection = scentData.collection.toLowerCase();
        if (scentData.scentFamily) scentData.scentFamily = scentData.scentFamily.toLowerCase();
        if (scentData.tags) scentData.tags = scentData.tags.map(tag => tag.toLowerCase());
        if (scentData.season) scentData.season = scentData.season.map(s => s.toLowerCase());
        if (scentData.occasion) scentData.occasion = scentData.occasion.map(o => o.toLowerCase());

        // Convert string booleans to actual booleans
        if (scentData.featured === 'true') scentData.featured = true;
        if (scentData.featured === 'false') scentData.featured = false;
        if (scentData.isFeatured === 'true') scentData.isFeatured = true;
        if (scentData.isFeatured === 'false') scentData.isFeatured = false;
        if (scentData.isActive === 'true') scentData.isActive = true;
        if (scentData.isActive === 'false') scentData.isActive = false;
        if (scentData.isNew === 'true') scentData.isNew = true;
        if (scentData.isNew === 'false') scentData.isNew = false;
        if (scentData.inStock === 'true') scentData.inStock = true;
        if (scentData.inStock === 'false') scentData.inStock = false;

        console.log('Creating scent with data:', scentData);

        const newScent = new Scent(scentData);
        const savedScent = await newScent.save();

        res.status(201).json({
          success: true,
          message: 'Scent created successfully',
          data: savedScent
        });
      } catch (error) {
        console.error('Error creating scent:', error);
        if (error.code === 11000) {
          res.status(400).json({
            success: false,
            message: 'SKU already exists',
            error: 'Duplicate SKU'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to create scent',
            error: error.message
          });
        }
      }
    });
  } catch (error) {
    console.error('Error in createScent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create scent',
      error: error.message
    });
  }
};

// Update scent (admin only) - Updated to preserve original filename
export const updateScent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scent ID format'
      });
    }

    // Handle file upload first
    upload(req, res, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({
          success: false,
          message: 'File upload failed',
          error: err.message
        });
      }

      try {
        const updateData = { ...req.body };

        // Get existing scent for image handling
        const existingScent = await Scent.findById(id);
        if (!existingScent) {
          return res.status(404).json({
            success: false,
            message: 'Scent not found'
          });
        }

        // Process uploaded images - store original filenames as /images/originalname.ext
        if (req.files) {
          const keepExistingImages = updateData.keepExistingImages === 'true';
          
          if (req.files.images) {
            const newImages = req.files.images.map(file => `/images/${file.filename}`);
            
            if (keepExistingImages && existingScent.images) {
              updateData.images = [...existingScent.images, ...newImages];
            } else {
              updateData.images = newImages;
            }
          }
          
          if (req.files.hoverImage && req.files.hoverImage[0]) {
            updateData.hoverImage = `/images/${req.files.hoverImage[0].filename}`;
          }
        }

        // Remove keepExistingImages from update data
        delete updateData.keepExistingImages;

        // Process JSON fields
        if (updateData.sizes) {
          try {
            updateData.sizes = JSON.parse(updateData.sizes);
          } catch (e) {
            console.error('Error parsing sizes:', e);
          }
        }

        if (updateData.fragrance_notes) {
          try {
            updateData.fragrance_notes = JSON.parse(updateData.fragrance_notes);
          } catch (e) {
            console.error('Error parsing fragrance_notes:', e);
          }
        }

        if (updateData.personalization) {
          try {
            updateData.personalization = JSON.parse(updateData.personalization);
          } catch (e) {
            console.error('Error parsing personalization:', e);
          }
        }

        // Process comma-separated arrays
        if (updateData.tags && typeof updateData.tags === 'string') {
          updateData.tags = updateData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        }

        if (updateData.season && typeof updateData.season === 'string') {
          updateData.season = updateData.season.split(',').map(s => s.trim()).filter(s => s);
        }

        if (updateData.occasion && typeof updateData.occasion === 'string') {
          updateData.occasion = updateData.occasion.split(',').map(o => o.trim()).filter(o => o);
        }

        if (updateData.ingredients && typeof updateData.ingredients === 'string') {
          updateData.ingredients = updateData.ingredients.split(',').map(i => i.trim()).filter(i => i);
        }

        // Ensure lowercase for certain fields
        if (updateData.category) updateData.category = updateData.category.toLowerCase();
        if (updateData.collection) updateData.collection = updateData.collection.toLowerCase();
        if (updateData.scentFamily) updateData.scentFamily = updateData.scentFamily.toLowerCase();
        if (updateData.tags) updateData.tags = updateData.tags.map(tag => tag.toLowerCase());
        if (updateData.season) updateData.season = updateData.season.map(s => s.toLowerCase());
        if (updateData.occasion) updateData.occasion = updateData.occasion.map(o => o.toLowerCase());

        // Convert string booleans to actual booleans
        if (updateData.featured === 'true') updateData.featured = true;
        if (updateData.featured === 'false') updateData.featured = false;
        if (updateData.isFeatured === 'true') updateData.isFeatured = true;
        if (updateData.isFeatured === 'false') updateData.isFeatured = false;
        if (updateData.isActive === 'true') updateData.isActive = true;
        if (updateData.isActive === 'false') updateData.isActive = false;
        if (updateData.isNew === 'true') updateData.isNew = true;
        if (updateData.isNew === 'false') updateData.isNew = false;
        if (updateData.inStock === 'true') updateData.inStock = true;
        if (updateData.inStock === 'false') updateData.inStock = false;

        console.log('Updating scent with data:', updateData);

        const updatedScent = await Scent.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
        );

        res.status(200).json({
          success: true,
          message: 'Scent updated successfully',
          data: updatedScent
        });
      } catch (error) {
        console.error('Error updating scent:', error);
        if (error.code === 11000) {
          res.status(400).json({
            success: false,
            message: 'SKU already exists',
            error: 'Duplicate SKU'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to update scent',
            error: error.message
          });
        }
      }
    });
  } catch (error) {
    console.error('Error in updateScent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update scent',
      error: error.message
    });
  }
};

// Delete scent (admin only)
export const deleteScent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scent ID format'
      });
    }

    const deletedScent = await Scent.findByIdAndDelete(id);

    if (!deletedScent) {
      return res.status(404).json({
        success: false,
        message: 'Scent not found'
      });
    }

    // Optional: Delete associated image files from public/images
    if (deletedScent.images) {
      deletedScent.images.forEach(imagePath => {
        try {
          // Remove leading slash and construct full path
          const filename = imagePath.replace('/images/', '');
          const fullPath = path.join(process.cwd(), 'public', 'images', filename);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (err) {
          console.error('Error deleting image file:', err);
        }
      });
    }

    if (deletedScent.hoverImage) {
      try {
        const filename = deletedScent.hoverImage.replace('/images/', '');
        const fullPath = path.join(process.cwd(), 'public', 'images', filename);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        console.error('Error deleting hover image file:', err);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Scent deleted successfully',
      data: deletedScent
    });
  } catch (error) {
    console.error('Error deleting scent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete scent',
      error: error.message
    });
  }
};

// Soft delete scent (set isActive to false) - also toggle active status
export const softDeleteScent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scent ID format'
      });
    }

    const existingScent = await Scent.findById(id);
    if (!existingScent) {
      return res.status(404).json({
        success: false,
        message: 'Scent not found'
      });
    }

    // Toggle the isActive status
    const newActiveStatus = !existingScent.isActive;

    const updatedScent = await Scent.findByIdAndUpdate(
      id,
      { isActive: newActiveStatus },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Scent ${newActiveStatus ? 'activated' : 'deactivated'} successfully`,
      data: updatedScent
    });
  } catch (error) {
    console.error('Error toggling scent status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle scent status',
      error: error.message
    });
  }
};