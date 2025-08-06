// models/Banner.js
import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['hero', 'product_highlight', 'collection_highlight'],
    index: true
  },
  category: {
    type: String,
    required: true,
    lowercase: true,
    enum: ['men', 'women', 'unisex'],
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  titleHighlight: {
    type: String,
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  buttonText: {
    type: String,
    required: true,
    trim: true
  },
  buttonLink: {
    type: String,
    required: true,
    trim: true
  },
  backgroundImage: {
    type: String, // For hero banners
    trim: true
  },
  image: {
    type: String, // For product/collection highlights
    trim: true
  },
  backgroundColor: {
    type: String,
    default: '#F2F2F2'
  },
  position: {
    type: String,
    enum: ['left', 'right', 'center'],
    default: 'left'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  order: {
    type: Number,
    default: 1,
    index: true
  },
  // Additional styling options
  textColor: {
    type: String,
    default: '#FFFFFF'
  },
  highlightColor: {
    type: String,
    default: '#f6d110'
  },
  // Responsive images
  responsiveImages: {
    mobile: String,
    tablet: String,
    desktop: String
  },
  // SEO fields
  altText: {
    type: String,
    trim: true
  },
  // Analytics
  clickCount: {
    type: Number,
    default: 0
  },
  impressionCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create compound indexes for better query performance
bannerSchema.index({ category: 1, type: 1, isActive: 1, order: 1 });
bannerSchema.index({ isActive: 1, order: 1 });

// Virtual for full image URL (if needed)
bannerSchema.virtual('fullImageUrl').get(function() {
  return this.image || this.backgroundImage;
});

// Pre-save middleware to ensure proper ordering
bannerSchema.pre('save', async function(next) {
  if (this.isNew && !this.order) {
    const maxOrder = await this.constructor.findOne(
      { category: this.category, type: this.type },
      {},
      { sort: { order: -1 } }
    );
    this.order = maxOrder ? maxOrder.order + 1 : 1;
  }
  next();
});

// Static method to get banners by category
bannerSchema.statics.getBannersByCategory = function(category, isActive = true) {
  return this.find({ 
    category: category.toLowerCase(), 
    isActive 
  }).sort({ order: 1 });
};

// Static method to get banners by type
bannerSchema.statics.getBannersByType = function(type, isActive = true) {
  return this.find({ 
    type, 
    isActive 
  }).sort({ category: 1, order: 1 });
};

// Instance method to increment click count
bannerSchema.methods.incrementClick = function() {
  this.clickCount += 1;
  return this.save();
};

// Instance method to increment impression count
bannerSchema.methods.incrementImpression = function() {
  this.impressionCount += 1;
  return this.save();
};

const Banner = mongoose.model('Banner', bannerSchema);

export default Banner;