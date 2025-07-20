import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
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
  quantity: {
    type: Number,
    default: 1,
    min: 1
  }
}, { _id: false }); // Disable _id for subdocuments

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema]
}, { 
  timestamps: true 
});

// Create indexes for better performance
cartSchema.index({ userId: 1 });

export const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);