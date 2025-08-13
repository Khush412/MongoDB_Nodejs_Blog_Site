const express = require('express');
const { ensureAuth } = require('../middleware/auth');
const Blog = require('../models/Blog');
const Category = require('../models/Category');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/blogImages');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Default images
const defaultImages = [
  '/uploads/blogImages/1.jpg',
  '/uploads/blogImages/2.jpg',
  '/uploads/blogImages/3.jpg',
  '/uploads/blogImages/4.jpg'
];

// ===== NEW /blogs route for Latest, Popular, Random =====
router.get('/blogs', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    // Latest Posts
    const latestBlogs = await Blog.find({ published: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('category')
      .populate('author')
      .lean();

    // Most Popular This Year (by likes)
    const popularBlogs = await Blog.aggregate([
      { $match: { published: true, createdAt: { $gte: new Date(`${currentYear}-01-01`) } } },
      {
        $addFields: {
          likesCount: { $cond: [{ $isArray: "$likes" }, { $size: "$likes" }, 0] }
        }
      },
      { $sort: { likesCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" }
    ]);

    // Random Picks
    const randomBlogs = await Blog.aggregate([
      { $match: { published: true } },
      { $sample: { size: 5 } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" }
    ]);

    res.render('blogs', {
      title: "All Blogs",
      latestBlogs,
      popularBlogs,
      randomBlogs,
      user: req.user || null,
      categories: res.locals.categories
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading blogs");
  }
});

// My Blogs
router.get('/myblogs', ensureAuth, async (req, res) => {
  try {
    const blogs = await Blog.find({ author: req.user._id })
      .populate('category')
      .sort({ createdAt: -1 })
      .lean();
    res.render('myBlogs', { title: "My Blogs", blogs });
  } catch (err) {
    console.error(err);
    res.send("Error loading my blogs");
  }
});

// Create Blog Form
router.get('/blogs/new', ensureAuth, async (req, res) => {
  try {
    const categories = await Category.find().lean();
    res.render('createBlog', { title: "Create Blog", categories });
  } catch (err) {
    console.error(err);
    res.send("Error loading create blog page");
  }
});

// CREATE BLOG
router.post('/blogs', ensureAuth, upload.single('coverImage'), async (req, res) => {
  try {
    const { title, description, content, category } = req.body;
    let tags = req.body.tags
      ? req.body.tags.split(',').map(tag => tag.trim().toLowerCase())
      : [];

    if (!req.user.role || req.user.role !== 'admin') {
      tags = tags.filter(tag => tag !== 'editor-pick');
    }

    const coverImagePath = req.file
      ? '/uploads/blogImages/' + req.file.filename
      : defaultImages[Math.floor(Math.random() * defaultImages.length)];

    await Blog.create({
      title,
      description,
      content,
      category,
      author: req.user._id,
      coverImage: coverImagePath,
      published: req.body.published === 'true',
      tags
    });

    req.flash('success', 'Blog created successfully!');
    res.redirect('/myblogs');
  } catch (err) {
    console.error(err);
    res.send("Error creating blog");
  }
});

// EDIT BLOG
router.post('/blogs/edit/:id', ensureAuth, upload.single('coverImage'), async (req, res) => {
  try {
    let blog = await Blog.findById(req.params.id);
    if (!blog) return res.send("Blog not found");
    if (blog.author.toString() !== req.user._id.toString()) {
      req.flash('error', 'Not authorized');
      return res.redirect('/myblogs');
    }

    blog.title = req.body.title;
    blog.description = req.body.description;
    blog.content = req.body.content;
    blog.category = req.body.category;
    blog.published = req.body.published === 'true';

    let tags = req.body.tags
      ? req.body.tags.split(',').map(tag => tag.trim().toLowerCase())
      : [];
    if (!req.user.role || req.user.role !== 'admin') {
      tags = tags.filter(tag => tag !== 'editor-pick');
    }
    blog.tags = tags;

    if (req.file) {
      blog.coverImage = '/uploads/blogImages/' + req.file.filename;
    }

    await blog.save();
    req.flash('success', 'Blog updated successfully!');
    res.redirect('/myblogs');
  } catch (err) {
    console.error(err);
    res.send("Error updating blog");
  }
});

// Delete Blog
router.get('/blogs/delete/:id', ensureAuth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.send("Blog not found");
    if (blog.author.toString() !== req.user._id.toString()) {
      req.flash('error', 'Not authorized');
      return res.redirect('/myblogs');
    }
    await Blog.findByIdAndDelete(req.params.id);
    req.flash('success', 'Blog deleted successfully');
    res.redirect('/myblogs');
  } catch (err) {
    console.error(err);
    res.send("Error deleting blog");
  }
});

// Post a comment
router.post('/blog/:id/comment', ensureAuth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).send("Blog not found");

    blog.comments.push({
      user: req.user._id,
      name: req.user.name,
      text: req.body.text
    });

    await blog.save();
    req.flash('success', 'Comment added!');
    res.redirect(`/blog/${blog._id}`);
  } catch (err) {
    console.error(err);
    res.send("Error posting comment");
  }
});

// Delete Own Comment
router.get('/blog/:blogId/comment/:commentId/delete', ensureAuth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.blogId);
    if (!blog) return res.status(404).send("Blog not found");

    blog.comments = blog.comments.filter(comment =>
      !(comment._id.toString() === req.params.commentId && comment.user.toString() === req.user._id.toString())
    );

    await blog.save();
    req.flash('success', 'Comment deleted successfully');
    res.redirect(`/blog/${blog._id}`);
  } catch (err) {
    console.error(err);
    res.send("Error deleting comment");
  }
});


// Toggle upvote for a comment
router.post('/blog/:blogId/comment/:commentId/upvote', ensureAuth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.blogId);
    if (!blog) return res.status(404).send("Blog not found");

    const comment = blog.comments.id(req.params.commentId);
    if (!comment) return res.status(404).send("Comment not found");

    const userId = req.user._id.toString();
    const alreadyUpvoted = comment.upvotes.some(id => id.toString() === userId);

    if (alreadyUpvoted) {
      // Remove upvote
      comment.upvotes = comment.upvotes.filter(id => id.toString() !== userId);
    } else {
      // Add upvote
      comment.upvotes.push(req.user._id);
    }

    await blog.save();
    res.redirect(`/blog/${req.params.blogId}#comment-${comment._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error upvoting comment");
  }
});

// Render Edit Blog Form
router.get('/blogs/edit/:id', ensureAuth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).lean();
    if (!blog) return res.status(404).send('Blog not found');

    // Only allow the blog’s author to edit
    if (blog.author.toString() !== req.user._id.toString()) {
      req.flash('error', 'Not authorized');
      return res.redirect('/myblogs');
    }

    const categories = await Category.find().lean();
    res.render('editBlog', { title: 'Edit Blog', blog, categories });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading edit blog page');
  }
});

// Add this near the bottom of blogs.js, before module.exports

// ===== Category-specific blogs (latest, popular, random) =====
router.get('/category/:slug', async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug }).lean();
    if (!category) return res.status(404).send('Category not found');

    const currentYear = new Date().getFullYear();

    // Latest in this category
    const latestBlogs = await Blog.find({ published: true, category: category._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('category')
      .populate('author')
      .lean();

    // Popular in this category
    const popularBlogs = await Blog.aggregate([
      {
        $match: {
          published: true,
          category: category._id,
          createdAt: { $gte: new Date(`${currentYear}-01-01`) }
        }
      },
      {
        $addFields: {
          likesCount: {
            $cond: [{ $isArray: "$likes" }, { $size: "$likes" }, 0]
          }
        }
      },
      { $sort: { likesCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" }
    ]);

    // Random in this category
    const randomBlogs = await Blog.aggregate([
      { $match: { published: true, category: category._id } },
      { $sample: { size: 5 } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" }
    ]);

    res.render('blogs', {
      title: `${category.name} Blogs`,
      latestBlogs,
      popularBlogs,
      randomBlogs,
      user: req.user || null,
      categories: res.locals.categories
    });

  } catch (err) {
    console.error('Error loading category blogs:', err);
    res.status(500).send('Error loading category blogs');
  }
});

router.post('/blog/:id/like', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      throw new Error('Blog not found');
    }

    const userId = req.user._id;
    const likedIndex = blog.likes.findIndex(id => id.toString() === userId.toString());

    let liked;
    if (likedIndex > -1) {
      blog.likes.splice(likedIndex, 1);
      liked = false;
    } else {
      blog.likes.push(userId);
      liked = true;
    }

    await blog.save();

    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({
        success: true,
        liked,
        likesCount: blog.likes.length
      });
    }

    res.redirect('back');
  } catch (error) {
    console.error('Error liking blog:', error);

    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }

    // Fallback for non-AJAX requests
    res.status(500).send('Error liking blog');
  }
});


module.exports = router;
