import express from 'express';
import Banner from '../models/Banner.js';

const router = express.Router();

// GET /api/banners - Get all banners with filters
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      type, 
      isActive = 'true',
      limit,
      page = 1 
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (category) filter.category = category.toLowerCase();
    if (type) filter.type = type;
    if (isActive !== 'all') filter.isActive = isActive === 'true';

    // Build query
    let query = Banner.find(filter).sort({ category: 1, order: 1 });
    
    // Apply pagination if limit is provided
    if (limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      query = query.limit(parseInt(limit)).skip(skip);
    }

    const banners = await query.lean();
    const total = await Banner.countDocuments(filter);

    console.log(`Found ${banners.length} banners with filter:`, filter);

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

// GET /api/banners/:category - Get banners by category
router.get('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { type, isActive = 'true' } = req.query;

    const filter = { 
      category: category.toLowerCase(),
      isActive: isActive === 'true'
    };
    
    if (type) filter.type = type;

    const banners = await Banner.find(filter)
      .sort({ order: 1 })
      .lean();

    console.log(`Found ${banners.length} banners for category: ${category}`);

    res.json({
      success: true,
      data: banners,
      count: banners.length
    });
  } catch (error) {
    console.error(`Error fetching banners for category ${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      message: `Error fetching banners for category ${req.params.category}`,
      error: error.message
    });
  }
});

// GET /api/banners/:category/:type - Get specific banner by category and type
router.get('/:category/:type', async (req, res) => {
  try {
    const { category, type } = req.params;

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

    // Increment impression count (optional - for analytics)
    await Banner.findByIdAndUpdate(banner._id, { 
      $inc: { impressionCount: 1 } 
    });

    res.json({
      success: true,
      data: banner
    });
  } catch (error) {
    console.error(`Error fetching banner for ${req.params.category}/${req.params.type}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error fetching banner',
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

// GET /api/banners/debug/count - Debug endpoint
router.get('/debug/count', async (req, res) => {
  try {
    const totalBanners = await Banner.countDocuments();
    const activeBanners = await Banner.countDocuments({ isActive: true });
    
    const categoryCounts = {};
    const categories = ['men', 'women', 'unisex'];
    const types = ['hero', 'product_highlight', 'collection_highlight'];
    
    for (const category of categories) {
      categoryCounts[category] = await Banner.countDocuments({ category });
      
      for (const type of types) {
        categoryCounts[`${category}_${type}`] = await Banner.countDocuments({ 
          category, 
          type 
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalBanners,
        activeBanners,
        categoryCounts
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

export default router;