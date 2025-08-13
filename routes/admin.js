const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const ensureAdmin = require('../middleware/ensureAdmin');

// Models
const Setting = require('../models/Setting');
const User = require('../models/User');
const Blog = require('../models/Blog');
const Category = require('../models/Category');
const Log = require('../models/log'); // NEW - for Recent Activity Logs

// ===== Multer Config for Category Images =====
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/categories');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ===== Slugify Helper =====
function slugify(text) {
    return text.toString().toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// ===== Log Action Helper =====
async function logAction(action, details, icon = 'info-circle') {
    try {
        await Log.create({ action, details, icon });
    } catch (err) {
        console.error('Error saving log:', err);
    }
}

/* ===========================
   DASHBOARD
=========================== */
router.get('/admin/dashboard', ensureAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const postsPublished = await Blog.countDocuments();
        const totalCategories = await Category.countDocuments();

        // Fetch latest 8 logs from DB
        const logs = await Log.find().sort({ createdAt: -1 }).limit(8);

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            user: req.user,
            totalUsers,
            postsPublished,
            totalCategories,
            logs
        });
    } catch (err) {
        console.error('Error loading dashboard:', err);
        req.flash('error', 'Failed to load dashboard');
        res.redirect('/');
    }
});

/* ===========================
   MANAGE USERS
=========================== */
router.get('/admin/users', ensureAdmin, async (req, res) => {
    try {
        const search = req.query.search || '';
        const query = search
            ? {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            }
            : {};

        const users = await User.find(query).sort({ createdAt: -1 });
        res.render('admin/users', { title: 'Manage Users', user: req.user, users, search });
    } catch (err) {
        console.error('Error loading users:', err);
        res.redirect('/admin/dashboard');
    }
});

// Edit User form
router.get('/admin/users/:id/edit', ensureAdmin, async (req, res) => {
    const userEdit = await User.findById(req.params.id);
    if (!userEdit) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
    }
    res.render('admin/users-edit', { title: 'Edit User', user: req.user, userEdit });
});

// Edit User submit
router.post('/admin/users/:id/edit', ensureAdmin, async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(req.params.id, {
            name: req.body.name,
            email: req.body.email,
            role: req.body.role,
            status: req.body.status,
            isAdmin: req.body.isAdmin === 'on'
        }, { new: true });

        if (updatedUser) {
            await logAction('User Updated', `User ${updatedUser.name} (${updatedUser.email}) updated.`, 'user-edit');
        }
        req.flash('success', 'User updated successfully');
        res.redirect('/admin/users');
    } catch (err) {
        console.error('Error editing user:', err);
        req.flash('error', 'Failed to update user');
        res.redirect('/admin/users');
    }
});

// Delete User
router.post('/admin/users/:id/delete', ensureAdmin, async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (deletedUser) {
            await logAction('User Deleted', `User ${deletedUser.name} (${deletedUser.email}) deleted.`, 'user-times');
        }
        req.flash('success', 'User deleted successfully');
        res.redirect('/admin/users');
    } catch (err) {
        console.error('Error deleting user:', err);
        req.flash('error', 'Failed to delete user');
        res.redirect('/admin/users');
    }
});

/* ===========================
   MANAGE CATEGORIES
=========================== */
router.get('/admin/categories', ensureAdmin, async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.render('admin/categories', { title: 'Manage Categories', user: req.user, categories });
    } catch (err) {
        console.error('Error loading categories:', err);
        res.redirect('/admin/dashboard');
    }
});

// Add Category
router.post('/admin/categories/add', ensureAdmin, upload.single('image'), async (req, res) => {
    try {
        const name = req.body.name.trim();
        const slug = slugify(name);
        const image = req.file ? `/uploads/categories/${req.file.filename}` : '/images/default-category.png';

        await Category.create({ name, slug, image });
        await logAction('Category Added', `Category ${name} created.`, 'folder-plus');

        req.flash('success', 'Category added successfully');
        res.redirect('/admin/categories');
    } catch (err) {
        console.error('Error adding category:', err);
        req.flash('error', 'Failed to add category');
        res.redirect('/admin/categories');
    }
});

// Edit Category form
router.get('/admin/categories/:id/edit', ensureAdmin, async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        req.flash('error', 'Category not found');
        return res.redirect('/admin/categories');
    }
    res.render('admin/categories-edit', { title: 'Edit Category', user: req.user, category });
});

// Edit Category submit
router.post('/admin/categories/:id/edit', ensureAdmin, upload.single('image'), async (req, res) => {
    try {
        const name = req.body.name.trim();
        const slug = slugify(name);
        const updateData = { name, slug };
        if (req.file) {
            updateData.image = `/uploads/categories/${req.file.filename}`;
        }
        const updatedCategory = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });

        if (updatedCategory) {
            await logAction('Category Updated', `Category ${updatedCategory.name} updated.`, 'edit');
        }

        req.flash('success', 'Category updated successfully');
        res.redirect('/admin/categories');
    } catch (err) {
        console.error('Error updating category:', err);
        req.flash('error', 'Failed to update category');
        res.redirect('/admin/categories');
    }
});

// Delete Category
router.post('/admin/categories/:id/delete', ensureAdmin, async (req, res) => {
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id);
        if (deletedCategory) {
            await logAction('Category Deleted', `Category ${deletedCategory.name} deleted.`, 'trash');
        }
        req.flash('success', 'Category deleted successfully');
        res.redirect('/admin/categories');
    } catch (err) {
        console.error('Error deleting category:', err);
        req.flash('error', 'Failed to delete category');
        res.redirect('/admin/categories');
    }
});
router.get('/admin/site-settings', ensureAdmin, async (req, res) => {
  let settings = await Setting.findOne({});
  if (!settings) {
    settings = new Setting();
    await settings.save();
  }
  res.render('admin/site-settings', { title: 'Site Settings', user: req.user, settings });
});

const storageSettings = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/settings'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random()*1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadSetting = multer({ storage: storageSettings });

router.post('/admin/site-settings', ensureAdmin, uploadSetting.single('logo'), async (req, res) => {
  let settings = await Setting.findOne({});
  if (!settings) {
    settings = new Setting();
  }

  settings.siteTitle = req.body.siteTitle;
  settings.siteDescription = req.body.siteDescription;
  settings.contactEmail = req.body.contactEmail;
  settings.googleAnalyticsID = req.body.googleAnalyticsID;
  settings.allowRegistration = req.body.allowRegistration === 'on';
  settings.defaultUserRole = req.body.defaultUserRole;

  if (req.file) {
    settings.logoUrl = '/uploads/settings/' + req.file.filename;
  }

  await settings.save();
  req.flash('success', 'Site settings updated successfully.');
  res.redirect('/admin/site-settings');
});

module.exports = router;
