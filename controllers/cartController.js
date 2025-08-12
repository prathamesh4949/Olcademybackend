import { Cart } from '../models/Cart.js';
import Product from '../models/Product.js';

// Helper function to enhance cart items with stock information
const enhanceCartItems = async (cartItems) => {
  if (!cartItems || cartItems.length === 0) return [];
  
  return await Promise.all(
    cartItems.map(async (item) => {
      try {
        const product = await Product.findById(item.id);
        if (!product) {
          console.warn(`Product ${item.id} not found`);
          return { 
            ...item.toObject ? item.toObject() : item, 
            availableStock: 0, 
            outOfStock: true,
            exceedsStock: false
          };
        }

        let availableStock = 0;
        
        // If item has selected size, check size-specific stock
        if (item.selectedSize && product.sizes && product.sizes.length > 0) {
          const size = product.sizes.find(s => s.size === item.selectedSize);
          if (size) {
            availableStock = size.stock || 0;
          } else {
            console.warn(`Size ${item.selectedSize} not found for product ${item.id}`);
            availableStock = 0;
          }
        } else {
          // No selected size or no sizes array, use general stock
          availableStock = product.stock || 0;
        }

        const outOfStock = availableStock === 0;
        const exceedsStock = item.quantity > availableStock;

        return {
          ...(item.toObject ? item.toObject() : item),
          availableStock,
          outOfStock,
          exceedsStock
        };
      } catch (error) {
        console.error(`Error fetching product ${item.id}:`, error);
        return { 
          ...(item.toObject ? item.toObject() : item), 
          availableStock: 0, 
          outOfStock: true,
          exceedsStock: false
        };
      }
    })
  );
};

// Get user's cart with stock information
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id; // From authMiddleware
    let cart = await Cart.findOne({ userId }).lean();
    
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
      cart = cart.toObject();
    }

    // Enhance cart items with current stock information
    const enhancedItems = await enhanceCartItems(cart.items || []);

    console.log(`Fetched cart for user ${userId}:`, enhancedItems.length, 'items');
    res.json({
      success: true,
      cartItems: enhancedItems
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cart',
      error: error.message
    });
  }
};

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, name, price, image, quantity = 1, selectedSize, personalization } = req.body;

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

    // Validate stock for selected size or general stock
    let availableStock = 0;
    if (selectedSize && product.sizes && product.sizes.length > 0) {
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
    } else {
      availableStock = product.stock || 0;
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
    const existingItemIndex = cart.items.findIndex(
      item => item.id === id && item.selectedSize === selectedSize
    );

    if (existingItemIndex >= 0) {
      return res.status(400).json({
        success: false,
        message: 'Item already in cart'
      });
    }

    // Add new item
    const cartItem = {
      id,
      name,
      price,
      image,
      quantity,
      selectedSize: selectedSize || null,
      personalization: personalization || null
    };

    cart.items.push(cartItem);
    await cart.save();

    console.log(`Added item to cart for user ${userId}:`, cartItem);
    
    // Return enhanced cart items with stock info
    const enhancedItems = await enhanceCartItems(cart.items);

    res.json({
      success: true,
      message: `${name} added to cart`,
      cartItems: enhancedItems
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid cart item data',
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error adding to cart',
      error: error.message
    });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    const itemName = cart.items[itemIndex].name;
    cart.items.splice(itemIndex, 1);
    await cart.save();

    console.log(`Removed item ${id} from cart for user ${userId}`);
    
    // Return enhanced cart items with stock info
    const enhancedItems = await enhanceCartItems(cart.items);

    res.json({
      success: true,
      message: `${itemName} removed from cart`,
      cartItems: enhancedItems
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing item from cart',
      error: error.message
    });
  }
};

// Update item quantity with stock validation
export const updateCartItemQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    // Validate quantity input
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer'
      });
    }

    // Find cart
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Find cart item
    const itemIndex = cart.items.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
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

    // Check stock availability
    let availableStock = 0;
    const cartItem = cart.items[itemIndex];
    
    if (cartItem.selectedSize && product.sizes && product.sizes.length > 0) {
      const size = product.sizes.find(s => s.size === cartItem.selectedSize);
      if (!size || !size.available) {
        return res.status(400).json({
          success: false,
          message: `Selected size ${cartItem.selectedSize} is no longer available`,
          outOfStock: true
        });
      }
      availableStock = size.stock || 0;
    } else {
      availableStock = product.stock || 0;
    }

    // Check if out of stock
    if (availableStock === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product is out of stock',
        outOfStock: true,
        availableStock: 0
      });
    }

    // Check if requested quantity exceeds available stock
    if (quantity > availableStock) {
      return res.status(400).json({
        success: false,
        message: `Only ${availableStock} items available in stock`,
        availableStock,
        maxQuantity: availableStock
      });
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    console.log(`Updated quantity for item ${id} to ${quantity} for user ${userId}`);
    
    // Return enhanced cart items with stock info
    const enhancedItems = await enhanceCartItems(cart.items);

    res.json({
      success: true,
      message: 'Quantity updated successfully',
      cartItems: enhancedItems
    });
  } catch (error) {
    console.error('Error updating cart quantity:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating quantity',
      error: error.message
    });
  }
};

// Clear entire cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = [];
    await cart.save();

    console.log(`Cleared cart for user ${userId}`);
    res.json({
      success: true,
      message: 'Cart cleared successfully',
      cartItems: []
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cart',
      error: error.message
    });
  }
};