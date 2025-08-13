const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');

// Middleware to check login
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
    return res.status(401).json({ success: false, message: 'Login required' });
  }
  // Non-AJAX -> redirect to login
  return res.redirect('/login');
}

// 📌 Toggle Bookmark (Add or Remove)
router.post('/bookmarks/:blogId', ensureAuthenticated, async (req, res) => {
  try {
    const blogId = req.params.blogId;

    if (!mongoose.Types.ObjectId.isValid(blogId)) {
      return req.headers['x-requested-with'] === 'XMLHttpRequest'
        ? res.status(400).json({ success: false, message: 'Invalid blog ID' })
        : res.redirect(req.get('referer') || '/');
    }

    const user = await User.findById(req.user._id);
    let bookmarked;

    if (user.bookmarks.includes(blogId)) {
      // Remove bookmark
      user.bookmarks = user.bookmarks.filter(id => id.toString() !== blogId);
      bookmarked = false;
    } else {
      // Add bookmark
      user.bookmarks.push(blogId);
      bookmarked = true;
    }

    await user.save();

    // If AJAX, return JSON
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: true, bookmarked });
    }

    // Normal form submit fallback
    res.redirect(req.get('referer') || '/bookmarks');
  } catch (err) {
    console.error('Bookmark toggle error:', err);
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(500).json({ success: false, message: 'Server error' });
    }
    res.status(500).send('Server error');
  }
});

// 📌 View all bookmarks
router.get('/bookmarks', ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'bookmarks',
        populate: ['category', 'author']
      })
      .lean();

    res.render('bookmarks', {
      title: 'My Bookmarks',
      bookmarks: user.bookmarks || [],
      user: req.user,
      categories: res.locals.categories
    });
  } catch (err) {
    console.error('Get bookmarks error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
