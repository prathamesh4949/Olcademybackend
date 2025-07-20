import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
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
        default: 1
    }
});

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    customerInfo: {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String
        },
        zipCode: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        }
    },
    items: [orderItemSchema],
    paymentInfo: {
        method: {
            type: String,
            required: true,
            enum: ['credit-card', 'paypal', 'apple-pay']
        },
        // Only store last 4 digits for security
        cardLastFour: {
            type: String
        },
        cardName: {
            type: String
        }
    },
    shippingOption: {
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
        days: {
            type: String,
            required: true
        }
    },
    pricing: {
        subtotal: {
            type: Number,
            required: true
        },
        shipping: {
            type: Number,
            required: true
        },
        tax: {
            type: Number,
            required: true
        },
        discount: {
            type: Number,
            default: 0
        },
        discountPercentage: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            required: true
        }
    },
    promoCode: {
        type: String
    },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Generate order number before saving
orderSchema.pre('save', function(next) {
    if (!this.orderNumber) {
        // Generate order number with timestamp
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.orderNumber = `ORD${timestamp}${random}`;
    }
    this.updatedAt = Date.now();
    next();
});

export const Order = mongoose.model('Order', orderSchema);