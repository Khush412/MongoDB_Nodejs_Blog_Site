const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },
    profilePic: { type: String, default: '/images/default-user.png' },
    googleId: { type: String },
    facebookId: { type: String },
    twitterId: { type: String },
    githubId: { type: String },
    isAdmin: { type: Boolean, default: false },
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Blog' }],
    role: { type: String, enum: ['Admin', 'Moderator', 'User'], default: 'User' },
    status: { type: String, enum: ['active', 'blocked', 'pending'], default: 'active' },

    // Email verification fields
    emailVerified: { type: Boolean, default: false },
    verificationCode: { type: String },
    verificationCodeExpires: { type: Date }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
    if (!this.password || !this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

userSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
