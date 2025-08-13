const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  content: String,
  coverImage: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  views: { type: Number, default: 0 },
  published: { type: Boolean, default: true },
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String,
      text: String,
      createdAt: { type: Date, default: Date.now },
      upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // NEW
    }
  ],
  likes: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  ],
  tags: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Blog', blogSchema);
