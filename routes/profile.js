const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ensureAuth } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Multer storage setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/profilePics');
    },
    filename: function (req, file, cb) {
        cb(null, req.user._id + path.extname(file.originalname)); // userId.png/jpg
    }
});
const upload = multer({ storage });

// Profile page
router.get('/profile', ensureAuth, (req, res) => {
    res.render('profile', { title: 'My Profile', user: req.user });
});

// Handle profile update
router.post('/profile', ensureAuth, upload.single('profilePic'), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const updateData = { name, email };

        // If password is provided, update it
        if (password) {
            updateData.password = password;
        }

        // If file uploaded, update profilePic path
        if (req.file) {
            updateData.profilePic = '/uploads/profilePics/' + req.file.filename;
        }

        await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true });
        req.flash('success', 'Profile updated successfully');
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error updating profile');
        res.redirect('/profile');
    }
});

module.exports = router;
