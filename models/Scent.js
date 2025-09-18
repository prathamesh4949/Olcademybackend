import mongoose from 'mongoose';

const scentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Scent name is required'],
    trim: true,
    maxLength: [100, 'Scent name cannot exceed 100 characters']
  },

  description: {
    type: String,
    required: [true, 'Scent description is required'],
    maxLength: [2000, 'Description cannot exceed 2000 characters']
  },

  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true
  },

  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },

  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative']
  },

  salePercentage: {
    type: Number,
    default: 0,
    min: [0, 'Sale percentage cannot be negative'],
    max: [100, 'Sale percentage cannot exceed 100']
  },

  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['women', 'men', 'unisex', 'home', 'summer'],
    lowercase: true
  },

  collection: {
    type: String,
    required: [true, 'Collection is required'],
    enum: [
      'trending', 'best-seller', 'signature', 'limited-edition',
      'mens-signature', 'orange-marmalade', 'rose-garden-essence',
      'gender-free', 'limitless', 'perfect-discover-gifts',
      'perfect-gifts-premium', 'perfect-gifts-luxury', 'home-decor-gifts'
    ],
    lowercase: true
  },

  brand: {
    type: String,
    trim: true,
    maxLength: [50, 'Brand name cannot exceed 50 characters']
  },

  scentFamily: {
    type: String,
    enum: ['floral', 'woody', 'citrus', 'oriental', 'fresh', 'spicy', 'fruity'],
    lowercase: true
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

  concentration: {
    type: String,
    enum: ['parfum', 'eau de parfum', 'eau de toilette', 'eau de cologne', 'eau fraiche'],
    default: 'eau de parfum'
  },

  volume: {
    type: String,
    trim: true
  },

  // Stock and availability
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },

  inStock: {
    type: Boolean,
    default: true
  },

  // Images
  images: [{
    type: String,
    trim: true
  }],

  hoverImage: {
    type: String,
    trim: true
  },

  // Sizes with individual pricing and stock
  sizes: [{
    size: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Size price cannot be negative']
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Size stock cannot be negative']
    },
    available: {
      type: Boolean,
      default: true
    }
  }],

  // Fragrance notes
  fragrance_notes: {
    top: [{
      type: String,
      trim: true
    }],
    middle: [{
      type: String,
      trim: true
    }],
    base: [{
      type: String,
      trim: true
    }]
  },

  // Personalization options
  personalization: {
    available: {
      type: Boolean,
      default: false
    },
    max_characters: {
      type: Number,
      default: 15,
      min: [1, 'Max characters must be at least 1']
    },
    price: {
      type: Number,
      default: 0,
      min: [0, 'Personalization price cannot be negative']
    }
  },

  // Additional product details
  ingredients: [{
    type: String,
    trim: true
  }],

  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  season: [{
    type: String,
    enum: ['spring', 'summer', 'autumn', 'winter'],
    lowercase: true
  }],

  occasion: [{
    type: String,
    enum: ['casual', 'formal', 'romantic', 'office', 'party', 'evening'],
    lowercase: true
  }],

  // Product status and features
  isActive: {
    type: Boolean,
    default: true
  },

  featured: {
    type: Boolean,
    default: false
  },

  isFeatured: {
    type: Boolean,
    default: false
  },

  isNew: {
    type: Boolean,
    default: false
  },

  // Rating and reviews
  rating: {
    type: Number,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5']
  },

  reviewCount: {
    type: Number,
    default: 0,
    min: [0, 'Review count cannot be negative']
  },

  // SEO and metadata
  slug: {
    type: String,
    trim: true,
    lowercase: true
  },

  metaTitle: {
    type: String,
    trim: true,
    maxLength: [60, 'Meta title cannot exceed 60 characters']
  },

  metaDescription: {
    type: String,
    trim: true,
    maxLength: [160, 'Meta description cannot exceed 160 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
scentSchema.index({ category: 1, collection: 1 });
scentSchema.index({ isActive: 1 });
scentSchema.index({ featured: 1, isFeatured: 1 });
scentSchema.index({ name: 'text', description: 'text', brand: 'text' });
scentSchema.index({ sku: 1 });
scentSchema.index({ price: 1 });
scentSchema.index({ scentFamily: 1 });
scentSchema.index({ createdAt: -1 });

// Virtual for discounted price
scentSchema.virtual('discountedPrice').get(function() {
  if (this.salePercentage > 0) {
    return this.price * (1 - this.salePercentage / 100);
  }
  return this.price;
});

// Virtual for checking if on sale
scentSchema.virtual('onSale').get(function() {
  return this.salePercentage > 0;
});

// Pre-save middleware to generate slug
scentSchema.pre('save', function(next) {
  if (this.isModified('name') && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Pre-save middleware to update inStock based on total stock
scentSchema.pre('save', function(next) {
  if (this.sizes && this.sizes.length > 0) {
    const totalStock = this.sizes.reduce((sum, size) => sum + (size.stock || 0), 0);
    this.inStock = totalStock > 0;
    
    // Update main stock field with total from sizes
    if (totalStock !== this.stock) {
      this.stock = totalStock;
    }
  } else {
    this.inStock = this.stock > 0;
  }
  next();
});

// Static method to get available collections
scentSchema.statics.getAvailableCollections = function() {
  return [
    'trending', 'best-seller', 'signature', 'limited-edition',
    'mens-signature', 'orange-marmalade', 'rose-garden-essence',
    'gender-free', 'limitless', 'perfect-discover-gifts',
    'perfect-gifts-premium', 'perfect-gifts-luxury', 'home-decor-gifts'
  ];
};

// Static method to get available categories
scentSchema.statics.getAvailableCategories = function() {
  return ['women', 'men', 'unisex', 'home', 'summer'];
};

// Instance method to check if scent is low in stock
scentSchema.methods.isLowInStock = function(threshold = 10) {
  return this.stock <= threshold;
};

// Instance method to get primary image
scentSchema.methods.getPrimaryImage = function() {
  return this.images && this.images.length > 0 ? this.images[0] : null;
};

// Instance method to calculate total revenue potential
scentSchema.methods.calculateRevenueePotential = function() {
  return this.price * this.stock;
};

const Scent = mongoose.model('Scent', scentSchema);

export default Scent;