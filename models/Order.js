// models/Order.js
import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'Item price is required'],
        min: [0, 'Price cannot be negative']
    },
    image: {
        type: String,
        required: [true, 'Item image is required']
    },
    quantity: {
        type: Number,
        default: 1,
        min: [1, 'Quantity must be at least 1']
    },
    subtotal: {
        type: Number,
        default: function() {
            return this.price * this.quantity;
        }
    }
});

const customerInfoSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Customer email is required'],
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Customer phone is required'],
        trim: true
    },
    address: {
        type: String,
        required: [true, 'Customer address is required'],
        trim: true
    },
    city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
    },
    state: {
        type: String,
        trim: true
    },
    zipCode: {
        type: String,
        required: [true, 'Zip code is required'],
        trim: true
    },
    country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true,
        default: 'United States'
    }
});

const paymentInfoSchema = new mongoose.Schema({
    method: {
        type: String,
        required: [true, 'Payment method is required'],
        enum: {
            values: ['credit-card', 'paypal', 'apple-pay', 'google-pay', 'bank-transfer'],
            message: 'Invalid payment method'
        }
    },
    // Only store last 4 digits for security
    cardLastFour: {
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^\d{4}$/.test(v);
            },
            message: 'Card last four must be 4 digits'
        }
    },
    cardName: {
        type: String,
        trim: true
    },
    // For tracking payment processing
    transactionId: {
        type: String,
        trim: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    }
});

const shippingOptionSchema = new mongoose.Schema({
    id: {
        type: String,
        required: [true, 'Shipping option ID is required']
    },
    name: {
        type: String,
        required: [true, 'Shipping option name is required']
    },
    price: {
        type: Number,
        required: [true, 'Shipping price is required'],
        min: [0, 'Shipping price cannot be negative']
    },
    days: {
        type: String,
        required: [true, 'Delivery timeframe is required']
    },
    description: {
        type: String
    }
});

const pricingSchema = new mongoose.Schema({
    subtotal: {
        type: Number,
        required: [true, 'Subtotal is required'],
        min: [0, 'Subtotal cannot be negative']
    },
    shipping: {
        type: Number,
        required: [true, 'Shipping cost is required'],
        min: [0, 'Shipping cost cannot be negative']
    },
    tax: {
        type: Number,
        required: [true, 'Tax amount is required'],
        min: [0, 'Tax cannot be negative']
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative']
    },
    discountPercentage: {
        type: Number,
        default: 0,
        min: [0, 'Discount percentage cannot be negative'],
        max: [100, 'Discount percentage cannot exceed 100%']
    },
    total: {
        type: Number,
        required: [true, 'Total is required'],
        min: [0, 'Total cannot be negative']
    }
});

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: [true, 'Order number is required'],
        unique: true,
        uppercase: true,
        trim: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // Allow guest orders
    },
    customerInfo: {
        type: customerInfoSchema,
        required: [true, 'Customer information is required']
    },
    items: {
        type: [orderItemSchema],
        required: [true, 'Order items are required'],
        validate: {
            validator: function(items) {
                return items && items.length > 0;
            },
            message: 'At least one item is required'
        }
    },
    paymentInfo: {
        type: paymentInfoSchema,
        required: [true, 'Payment information is required']
    },
    shippingOption: {
        type: shippingOptionSchema,
        required: [true, 'Shipping option is required']
    },
    pricing: {
        type: pricingSchema,
        required: [true, 'Pricing information is required']
    },
    promoCode: {
        type: String,
        trim: true,
        uppercase: true
    },
    status: {
        type: String,
        default: 'pending',
        enum: {
            values: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
            message: 'Invalid order status'
        }
    },
    statusHistory: [{
        status: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        note: {
            type: String,
            trim: true
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    // Tracking information
    trackingNumber: {
        type: String,
        trim: true
    },
    carrier: {
        type: String,
        trim: true
    },
    // Order notes and special instructions
    customerNotes: {
        type: String,
        trim: true,
        maxlength: [500, 'Customer notes cannot exceed 500 characters']
    },
    adminNotes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
    },
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    // Estimated and actual delivery dates
    estimatedDeliveryDate: {
        type: Date
    },
    actualDeliveryDate: {
        type: Date
    },
    // Order source tracking
    source: {
        type: String,
        enum: ['web', 'mobile', 'admin', 'api'],
        default: 'web'
    },
    // Customer satisfaction
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    review: {
        type: String,
        trim: true,
        maxlength: [1000, 'Review cannot exceed 1000 characters']
    }
}, {
    timestamps: true // This will automatically manage createdAt and updatedAt
});

// Indexes for better query performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ 'customerInfo.email': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ userId: 1 });
orderSchema.index({ 'customerInfo.email': 1, createdAt: -1 });

// Pre-save middleware to generate order number and update timestamps
orderSchema.pre('save', function(next) {
    // Generate order number if not provided
    if (!this.orderNumber) {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.orderNumber = `ORD${timestamp}${random}`;
    }
    
    // Update timestamp
    this.updatedAt = Date.now();
    
    // Calculate estimated delivery date based on shipping option
    if (this.shippingOption && this.shippingOption.days && !this.estimatedDeliveryDate) {
        const deliveryDays = parseInt(this.shippingOption.days.match(/\d+/)?.[0]) || 7;
        this.estimatedDeliveryDate = new Date(Date.now() + (deliveryDays * 24 * 60 * 60 * 1000));
    }
    
    next();
});

// Pre-update middleware to track status changes
orderSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    
    // Update timestamp
    if (update.$set) {
        update.$set.updatedAt = Date.now();
    } else {
        update.updatedAt = Date.now();
    }
    
    // If status is being updated, add to status history
    if (update.status || (update.$set && update.$set.status)) {
        const newStatus = update.status || update.$set.status;
        const statusUpdate = {
            status: newStatus,
            timestamp: new Date(),
            note: update.statusNote || update.$set?.statusNote
        };
        
        if (update.$push) {
            update.$push.statusHistory = statusUpdate;
        } else {
            update.$push = { statusHistory: statusUpdate };
        }
    }
    
    next();
});

// Virtual for total items count
orderSchema.virtual('totalItems').get(function() {
    return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for order age in days
orderSchema.virtual('orderAge').get(function() {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for formatted order number
orderSchema.virtual('formattedOrderNumber').get(function() {
    return this.orderNumber.replace(/(.{3})(.{6})(.{3})/, '$1-$2-$3');
});

// Instance method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
    const cancellableStatuses = ['pending', 'confirmed'];
    return cancellableStatuses.includes(this.status);
};

// Instance method to check if order can be refunded
orderSchema.methods.canBeRefunded = function() {
    const refundableStatuses = ['delivered'];
    const daysSinceDelivery = this.actualDeliveryDate ? 
        Math.floor((Date.now() - this.actualDeliveryDate) / (1000 * 60 * 60 * 24)) : 0;
    
    return refundableStatuses.includes(this.status) && daysSinceDelivery <= 30;
};

// Static method to get orders by status
orderSchema.statics.findByStatus = function(status) {
    return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to get recent orders
orderSchema.statics.findRecent = function(limit = 10) {
    return this.find().sort({ createdAt: -1 }).limit(limit);
};

// Static method to get orders by date range
orderSchema.statics.findByDateRange = function(startDate, endDate) {
    return this.find({
        createdAt: {
            $gte: startDate,
            $lte: endDate
        }
    }).sort({ createdAt: -1 });
};

// Ensure virtual fields are serialized
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

export const Order = mongoose.model('Order', orderSchema);