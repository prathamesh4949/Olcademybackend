// models/Product.js
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    lowercase: true
  },
  productCollection: {
    type: String,
    lowercase: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  images: [{
    type: String
  }],
  hoverImage: {
    type: String
  },
  brand: {
    type: String,
    trim: true
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  sku: {
    type: String,
    unique: true,
    required: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 5
  },
  tags: [{
    type: String,
    lowercase: true
  }],
  // Updated sizes array with stock property
  sizes: [{
    size: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    available: {
      type: Boolean,
      default: true
    },
    stock: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  fragrance_notes: {
    top: [String],
    middle: [String],
    base: [String]
  },
  personalization: {
    available: {
      type: Boolean,
      default: false
    },
    max_characters: {
      type: Number,
      default: 15
    },
    price: {
      type: Number,
      default: 0
    }
  },
  ingredients: {
    type: String
  },
  volume: {
    type: String
  },
  concentration: {
    type: String
  },
  longevity: {
    type: String
  },
  sillage: {
    type: String
  },
  season: [String],
  occasion: [String]
}, {
  timestamps: true,
  suppressReservedKeysWarning: true
});

// Create text index for search functionality
productSchema.index({
  name: 'text',
  description: 'text'
});

// Create index for category and productCollection for faster queries
productSchema.index({ category: 1, productCollection: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ isActive: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;