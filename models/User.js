import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true, // Remove this line if you're using schema.index() below
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    // Add other fields as needed
}, {
    timestamps: true
});

// Only use ONE of these index methods:
// Option 1: Remove the unique: true from email field and use this:
// userSchema.index({ email: 1 }, { unique: true });

// Option 2: Keep unique: true in email field and remove any schema.index() calls

const User = mongoose.model('User', userSchema);
export default User;
