import { Cart } from "../models/Cart.js";
import { connectDB } from "../utils/db.js";

// Get user's cart
export const getCart = async (req, res) => {
    try {
        await connectDB();
        
        const userId = req.user._id;
        
        let cart = await Cart.findOne({ userId });
        
        if (!cart) {
            // Create empty cart if doesn't exist
            cart = new Cart({ userId, items: [] });
            await cart.save();
        }
        
        res.status(200).json({
            success: true,
            cartItems: cart.items,
            message: "Cart retrieved successfully"
        });
        
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
};

// Add item to cart
export const addToCart = async (req, res) => {
    try {
        await connectDB();
        
        const userId = req.user._id;
        const { id, name, price, image } = req.body;
        
        if (!id || !name || !price || !image) {
            return res.status(400).json({
                success: false,
                message: 'All product fields are required'
            });
        }
        
        let cart = await Cart.findOne({ userId });
        
        if (!cart) {
            // Create new cart
            cart = new Cart({ userId, items: [] });
        }
        
        // Check if item already exists
        const existingItemIndex = cart.items.findIndex(item => item.id === id);
        
        if (existingItemIndex > -1) {
            return res.status(400).json({
                success: false,
                message: 'Item already in cart!'
            });
        }
        
        // Add new item
        cart.items.push({ id, name, price, image, quantity: 1 });
        await cart.save();
        
        res.status(200).json({
            success: true,
            cartItems: cart.items,
            message: `${name} added to cart`
        });
        
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
    try {
        await connectDB();
        
        const userId = req.user._id;
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
        
        const removedItem = cart.items[itemIndex];
        cart.items.splice(itemIndex, 1);
        await cart.save();
        
        res.status(200).json({
            success: true,
            cartItems: cart.items,
            message: `${removedItem.name} removed from cart`
        });
        
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
};

// Clear entire cart
export const clearCart = async (req, res) => {
    try {
        await connectDB();
        
        const userId = req.user._id;
        
        const cart = await Cart.findOne({ userId });
        
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }
        
        cart.items = [];
        await cart.save();
        
        res.status(200).json({
            success: true,
            cartItems: [],
            message: 'Cart cleared successfully'
        });
        
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
};

// Update item quantity
export const updateCartItemQuantity = async (req, res) => {
    try {
        await connectDB();
        
        const userId = req.user._id;
        const { id } = req.params;
        const { quantity } = req.body;
        
        if (!quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be at least 1'
            });
        }
        
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
        
        cart.items[itemIndex].quantity = quantity;
        await cart.save();
        
        res.status(200).json({
            success: true,
            cartItems: cart.items,
            message: 'Quantity updated successfully'
        });
        
    } catch (error) {
        console.error('Update cart item quantity error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
};