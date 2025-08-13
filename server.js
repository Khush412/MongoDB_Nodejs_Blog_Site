require('dotenv').config();
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const flash = require('express-flash');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();
const adminRoutes = require('./routes/admin');

const app = express();

// ===== Models =====
const User = require('./models/User');
const Blog = require('./models/Blog');
const Category = require('./models/Category');

// ===== Passport Config =====
require('./config/passport')(passport);

// ===== Middleware =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ===== Sessions =====
app.use(session({
  secret: process.env.SESSION_SECRET || 'secretkey',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// ===== Passport Init =====
app.use(passport.initialize());
app.use(passport.session());

// ===== Flash messages =====
app.use(flash());

// ===== Global flash variables for all EJS views =====
app.use((req, res, next) => {
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  res.locals.info = req.flash('info');
  res.locals.user = req.user || null;
  next();
});

// ===== Static folder =====
app.use(express.static(path.join(__dirname, 'public')));

// ===== EJS =====
app.set('view engine', 'ejs');

// ===== Load categories globally for navbar =====
app.use(async (req, res, next) => {
  try {
    const categories = await Category.find().lean();
    res.locals.categories = categories;
    res.locals.query = req.query.q || '';
    res.locals.selectedCategory = req.query.category || '';
    next();
  } catch (err) {
    console.error('Failed to load categories for navbar', err);
    res.locals.categories = [];
    next();
  }
});

// ====== Home route ======
app.get('/', async (req, res) => {
  try {
    const categories = await Category.find().lean();
    const currentYear = new Date().getFullYear();

    const popularBlogs = await Blog.aggregate([
      { $match: { published: true, createdAt: { $gte: new Date(`${currentYear}-01-01`) } } },
      {
        $addFields: {
          likesCount: {
            $cond: { if: { $isArray: "$likes" }, then: { $size: "$likes" }, else: 0 }
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

    const latestBlogs = await Blog.find({ published: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('category')
      .populate('author')
      .lean();

    const editorsPicks = await Blog.find({ published: true, tags: 'editor-pick' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('category')
      .populate('author')
      .lean();

    res.render('index', {
      title: "Home",
      categories,
      popularBlogs,
      latestBlogs,
      editorsPicks
    });
  } catch (err) {
    console.error(err);
    res.send("Error loading home page");
  }
});

// ===== Routes =====
const authRoutes = require('./routes/auth');
const blogRoutes = require('./routes/blogs');
const profileRoutes = require('./routes/profile');
const bookmarkRoutes = require('./routes/bookmarks');
app.use('/', authRoutes);
app.use('/', blogRoutes);
app.use('/', profileRoutes);
app.use('/', bookmarkRoutes);

// ===== All blogs page =====
app.get('/blogs', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const latestBlogs = await Blog.find({ published: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('category')
      .populate('author')
      .lean();

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

// ===== By category =====
app.get('/category/:slug', async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    if (!category) return res.send("Category not found");

    const blogs = await Blog.find({ category: category._id, published: true })
      .populate('category')
      .populate('author')
      .sort({ createdAt: -1 })
      .lean();

    res.render('blogs', { 
      title: `${category.name} Blogs`, 
      latestBlogs: blogs,
      popularBlogs: [],
      randomBlogs: [],
      user: req.user || null,
      categories: res.locals.categories
    });
  } catch (error) {
    console.error("Error loading category:", error);
    res.send("Error loading category");
  }
});

// ===== Blog detail =====
app.get('/blog/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author')
      .populate('category')
      .populate('comments.user')
      .lean();

    if (!blog) return res.status(404).send('Blog not found');

    if (!blog.published && (!req.user || req.user._id.toString() !== blog.author._id.toString())) {
      return res.status(403).send('This blog is private.');
    }

    await Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } });

    const contentHTML = md.render(blog.content || '');

    res.render('blogDetail', { title: blog.title, blog: { ...blog, content: contentHTML } });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// ===== Search route =====
app.get('/search', async (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    const category = req.query.category || '';

    let pipeline = [
      { $match: { published: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author'
        }
      },
      { $unwind: '$author' },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' }
    ];

    if (q) {
      const regex = new RegExp(q, 'i');
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: regex } },
            { description: { $regex: regex } },
            { content: { $regex: regex } },
            { tags: { $regex: regex } },
            { 'author.name': { $regex: regex } },
            { 'category.name': { $regex: regex } }
          ]
        }
      });
    }

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      pipeline.push({
        $match: { 'category._id': new mongoose.Types.ObjectId(category) }
      });
    }

    pipeline.push({ $sort: { createdAt: -1 } });

    const searchResults = await Blog.aggregate(pipeline);

    res.render('search', {
      title: q ? `Search results for "${q}"` : 'Search Results',
      query: q,
      searchResults,
      user: req.user || null,
      categories: res.locals.categories
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).send('Error performing search');
  }
});

app.get('/about', (req, res) => res.render('about', { title: 'About Us' }));
app.get('/privacy', (req, res) => res.render('privacy', { title: 'Privacy Policy' }));
app.get('/contact', (req, res) => res.render('contact', { title: 'Contact Us' }));

const aiRoutes = require('./routes/ai');
app.use('/api', aiRoutes);


const aiChatRouter = require('./routes/aiChat');
app.use('/api', aiChatRouter);
app.use(express.json()); // Make sure JSON middleware is enabled
app.use('/', adminRoutes);

// ===== Mongo connect & start server =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
