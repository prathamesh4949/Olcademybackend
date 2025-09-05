
import { Wishlist } from '../models/Wishlist.js';
import Product from '../models/Product.js';

// Get user's wishlist
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id; // From authMiddleware
    let wishlist = await Wishlist.findOne({ userId }).lean();
    
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, items: [] });
      wishlist = wishlist.toObject();
    }

    console.log(`Fetched wishlist for user ${userId}:`, (wishlist.items || []).length, 'items');
    res.json({
      success: true,
      wishlistItems: wishlist.items || []
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wishlist',
      error: error.message
    });
  }
};

// Add item to wishlist
export const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, name, price, image, description = '', category = '', selectedSize } = req.body;

    // Validate required fields
    if (!id || !name || !price || !image) {
      return res.status(400).json({
        success: false,
        message: 'All product fields (id, name, price, image) are required'
      });
    }

    // Validate product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, items: [] });
    }

    // Check if item already exists in wishlist
    const existingItemIndex = wishlist.items.findIndex(
      item => item.id === id && item.selectedSize === selectedSize
    );

    if (existingItemIndex >= 0) {
      return res.status(400).json({
        success: false,
        message: 'Item already in wishlist'
      });
    }

    // Add new item
    const wishlistItem = {
      id,
      name,
      price,
      image,
      description,
      category,
      selectedSize: selectedSize || null,
      addedAt: new Date()
    };

    wishlist.items.push(wishlistItem);
    await wishlist.save();

    console.log(`Added item to wishlist for user ${userId}:`, wishlistItem);

    res.json({
      success: true,
      message: `${name} added to wishlist`,
      wishlistItems: wishlist.items
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid wishlist item data',
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error adding to wishlist',
      error: error.message
    });
  }
};

// Remove item from wishlist
export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    const itemIndex = wishlist.items.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in wishlist'
      });
    }

    const itemName = wishlist.items[itemIndex].name;
    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    console.log(`Removed item ${id} from wishlist for user ${userId}`);

    res.json({
      success: true,
      message: `${itemName} removed from wishlist`,
      wishlistItems: wishlist.items
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing item from wishlist',
      error: error.message
    });
  }
};

// Move item from wishlist to cart
export const moveToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity = 1 } = req.body;

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    const itemIndex = wishlist.items.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in wishlist'
      });
    }

    const wishlistItem = wishlist.items[itemIndex];
    
    // Import Cart model dynamically to avoid circular dependency
    const { Cart } = await import('../models/Cart.js');
    
    // Validate product exists
    const product = await Product.findById(wishlistItem.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Determine size to use
    let selectedSize = wishlistItem.selectedSize;
    let availableStock = 0;

    if (product.sizes && product.sizes.length > 0) {
      // If no size is selected, choose the first available size with stock
      if (!selectedSize) {
        const availableSize = product.sizes.find(s => s.available && s.stock > 0);
        if (!availableSize) {
          return res.status(400).json({
            success: false,
            message: 'No available sizes in stock'
          });
        }
        selectedSize = availableSize.size;
        availableStock = availableSize.stock || 0;
      } else {
        // If size is selected, validate it
        const size = product.sizes.find(s => s.size === selectedSize);
        if (!size) {
          return res.status(400).json({
            success: false,
            message: `Selected size ${selectedSize} not found`
          });
        }
        if (!size.available) {
          return res.status(400).json({
            success: false,
            message: `Selected size ${selectedSize} is not available`
          });
        }
        availableStock = size.stock || 0;
      }
    } else {
      // No sizes array, use general stock
      availableStock = product.stock || 0;
    }

    if (availableStock === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product is out of stock',
        outOfStock: true,
        availableStock: 0
      });
    }

    if (availableStock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${availableStock} available.`
      });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Check if item already exists in cart
    const existingCartItemIndex = cart.items.findIndex(
      item => item.id === id && item.selectedSize === selectedSize
    );

    if (existingCartItemIndex >= 0) {
      return res.status(400).json({
        success: false,
        message: 'Item already in cart'
      });
    }

    // Add to cart
    const cartItem = {
      id: wishlistItem.id,
      name: wishlistItem.name,
      price: wishlistItem.price,
      image: wishlistItem.image,
      quantity: quantity,
      selectedSize: selectedSize || null
    };

    cart.items.push(cartItem);
    await cart.save();

    // Remove from wishlist
    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    console.log(`Moved item ${id} from wishlist to cart for user ${userId}`);

    res.json({
      success: true,
      message: `${wishlistItem.name} moved to cart`,
      wishlistItems: wishlist.items
    });
  } catch (error) {
    console.error('Error moving to cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error moving item to cart',
      error: error.message
    });
  }
};

// Clear entire wishlist
export const clearWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    wishlist.items = [];
    await wishlist.save();

    console.log(`Cleared wishlist for user ${userId}`);
    res.json({
      success: true,
      message: 'Wishlist cleared successfully',
      wishlistItems: []
    });
  } catch (error) {
    console.error('Error clearing wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing wishlist',
      error: error.message
    });
  }
};
