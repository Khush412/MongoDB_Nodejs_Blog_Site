const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true },
    image: { type: String, default: '/images/default-category.png' }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
