require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('./models/Blog');
const Category = require('./models/Category');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB Connected');

        await Blog.deleteMany({});

        // Ensure at least one user exists
        let user = await User.findOne();
        if (!user) {
            user = await User.create({
                name: 'Admin User',
                email: 'admin@example.com',
                password: '123456'
            });
        }

        const categories = await Category.find();
        // List your blog images (use your actual filenames)
        const images = [
            '/uploads/blogImages/1.jpg',
            '/uploads/blogImages/2.jpg',
            '/uploads/blogImages/3.jpg',
            '/uploads/blogImages/4.jpg',
            '/uploads/blogImages/5.jpg'
        ];

        const blogs = [];
        categories.forEach((cat, i) => {
            blogs.push({
                title: `Blog for ${cat.name}`,
                description: `Intro for ${cat.name} blog.`,
                content: `This is the <b>detailed content</b> for ${cat.name}.`,
                category: cat._id,
                author: user._id,
                tags: [cat.slug, "demo"],
                coverImage: images[i % images.length], // image assigned per category
                views: Math.floor(Math.random() * 1000),
                likes: Math.floor(Math.random() * 50),
                published: true
            });
        });

        // Some extras for demo
        for (let i = 1; i <= 6; i++) {
            const randomCat = categories[Math.floor(Math.random() * categories.length)];
            blogs.push({
                title: `Sample Blog Post ${i}`,
                description: `This is a short intro for blog post number ${i}.`,
                content: `This is the <b>detailed content</b> of blog post ${i}.`,
                category: randomCat._id,
                author: user._id,
                tags: ['sample', 'demo'],
                coverImage: images[i % images.length],
                views: Math.floor(Math.random() * 1000),
                likes: Math.floor(Math.random() * 50),
                published: true
            });
        }

        await Blog.insertMany(blogs);
        console.log('✅ Blogs seeded with images!');
        process.exit();
    })
    .catch(err => {
        console.error('❌ Error seeding blogs:', err);
        process.exit(1);
    });
