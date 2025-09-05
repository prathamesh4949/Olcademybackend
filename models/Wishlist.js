import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: ''
  },
  selectedSize: {
    type: String,
    default: null
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [wishlistItemSchema]
}, { 
  timestamps: true 
});

wishlistSchema.index({ userId: 1 });

export const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', wishlistSchema);