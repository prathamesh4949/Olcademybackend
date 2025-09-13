import Scent from '../models/Scent.js';

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
      isActive = true,
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
      limit = 20,
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
    
    // Boolean filters
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (inStock !== undefined) filter.inStock = inStock === 'true';
    if (isNew !== undefined) filter.isNew = isNew === 'true';
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true';
    if (featured !== undefined) filter.featured = featured === 'true';
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Sort object
    const sort = {};
    if (search && !sortBy) {
      sort.score = { $meta: 'textScore' };
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Pagination
    const skip = (page - 1) * limit;

    const scents = await Scent.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate('sizes.stock');

    const total = await Scent.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: scents,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: Number(limit)
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
    if (!['trending', 'best-seller', 'signature', 'limited-edition', 'mens-signature', 'orange-marmalade', 'rose-garden-essence', 'gender-free', 'limitless', 'perfect-discover-gifts', 'perfect-gifts-premium', 'perfect-gifts-luxury', 'home-decor-gifts'].includes(collection)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection type'
      });
    }

    const filter = { 
      collection: collection.toLowerCase(),
      isActive: isActive === 'true'
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
      isFeatured: true,
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    const bestSellers = await Scent.find({ 
      collection: 'best-seller', 
      isFeatured: true,
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    const signature = await Scent.find({ 
      collection: 'signature', 
      isFeatured: true,
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    const limitedEdition = await Scent.find({ 
      collection: 'limited-edition', 
      isFeatured: true,
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    // Men's collections
    const mensSignature = await Scent.find({ 
      collection: 'mens-signature', 
      isFeatured: true,
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    const orangeMarmalade = await Scent.find({ 
      collection: 'orange-marmalade', 
      isFeatured: true,
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    // Women's collection
    const roseGardenEssence = await Scent.find({ 
      collection: 'rose-garden-essence', 
      isFeatured: true,
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    // Unisex collections
    const genderFree = await Scent.find({ 
      collection: 'gender-free', 
      isFeatured: true,
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    const limitless = await Scent.find({ 
      collection: 'limitless', 
      isFeatured: true,
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    // NEW: Gift collections
    const perfectDiscoverGifts = await Scent.find({ 
      collection: 'perfect-discover-gifts', 
      isFeatured: true,
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    const perfectGiftsPremium = await Scent.find({ 
      collection: 'perfect-gifts-premium', 
      isFeatured: true,
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    const perfectGiftsLuxury = await Scent.find({ 
      collection: 'perfect-gifts-luxury', 
      isFeatured: true,
      isActive: true
    }).limit(8).sort({ createdAt: -1 });

    const homeDecorGifts = await Scent.find({ 
      collection: 'home-decor-gifts', 
      isFeatured: true,
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

// Create new scent (admin only)
export const createScent = async (req, res) => {
  try {
    const scentData = req.body;
    
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
};

// Update scent (admin only)
export const updateScent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scent ID format'
      });
    }

    // Ensure lowercase for certain fields
    if (updateData.category) updateData.category = updateData.category.toLowerCase();
    if (updateData.collection) updateData.collection = updateData.collection.toLowerCase();
    if (updateData.scentFamily) updateData.scentFamily = updateData.scentFamily.toLowerCase();
    if (updateData.tags) updateData.tags = updateData.tags.map(tag => tag.toLowerCase());
    if (updateData.season) updateData.season = updateData.season.map(s => s.toLowerCase());
    if (updateData.occasion) updateData.occasion = updateData.occasion.map(o => o.toLowerCase());

    const updatedScent = await Scent.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedScent) {
      return res.status(404).json({
        success: false,
        message: 'Scent not found'
      });
    }

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

// Soft delete scent (set isActive to false)
export const softDeleteScent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scent ID format'
      });
    }

    const updatedScent = await Scent.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!updatedScent) {
      return res.status(404).json({
        success: false,
        message: 'Scent not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Scent deactivated successfully',
      data: updatedScent
    });
  } catch (error) {
    console.error('Error deactivating scent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate scent',
      error: error.message
    });
  }
};