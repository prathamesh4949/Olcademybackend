import mongoose from 'mongoose';

const scentSchema = new mongoose.Schema({
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
  originalPrice: {
    type: Number,
    default: null
  },
  category: {
    type: String,
    required: true,
    lowercase: true,
    enum: ['women', 'men', 'unisex', 'home', 'summer']
  },
  collection: {
    type: String,
    required: true,
    lowercase: true,
    enum: [
      'trending', 
      'best-seller', 
      'signature', 
      'limited-edition', 
      'mens-signature', 
      'orange-marmalade', 
      'rose-garden-essence', 
      'gender-free', 
      'limitless',
      // NEW: Gift Collections
      'perfect-discover-gifts',
      'perfect-gifts-premium', 
      'perfect-gifts-luxury',
      'home-decor-gifts'
    ]
  },
  featured: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isNew: {
    type: Boolean,
    default: false
  },
  images: [{
    type: String,
    required: true
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
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    lowercase: true
  }],
  // Updated sizes array with stock property like Product model
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
  // Fragrance-specific fields
  fragrance_notes: {
    top: [String],
    middle: [String],
    base: [String]
  },
  scentFamily: {
    type: String,
    lowercase: true,
    enum: ['floral', 'woody', 'citrus', 'oriental', 'fresh', 'spicy', 'fruity']
  },
  intensity: {
    type: String,
    enum: ['light', 'moderate', 'strong'],
    default: 'moderate'
  },
  longevity: {
    type: String,
    enum: ['2-4 hours', '4-6 hours', '6-8 hours', '8+ hours'],
    default: '4-6 hours'
  },
  sillage: {
    type: String,
    enum: ['intimate', 'moderate', 'strong', 'enormous'],
    default: 'moderate'
  },
  season: [{
    type: String,
    lowercase: true,
    enum: ['spring', 'summer', 'autumn', 'winter']
  }],
  occasion: [{
    type: String,
    lowercase: true,
    enum: ['casual', 'formal', 'romantic', 'office', 'party', 'evening']
  }],
  // Personalization options like Product model
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
  ingredients: [{
    type: String
  }],
  volume: {
    type: String
  },
  concentration: {
    type: String,
    enum: ['parfum', 'eau de parfum', 'eau de toilette', 'eau de cologne', 'eau fraiche']
  },
  // Legacy fields for backward compatibility
  inStock: {
    type: Boolean,
    default: true
  },
  salePercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true,
  suppressReservedKeysWarning: true
});

// Create text index for search functionality
scentSchema.index({
  name: 'text',
  description: 'text'
});

// Create indexes for better query performance
scentSchema.index({ collection: 1, category: 1 });
scentSchema.index({ featured: 1 });
scentSchema.index({ isFeatured: 1 });
scentSchema.index({ isNew: 1 });
scentSchema.index({ isActive: 1 });
scentSchema.index({ scentFamily: 1 });

const Scent = mongoose.model('Scent', scentSchema);

export default Scent;