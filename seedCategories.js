require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');

const categories = [
    { name: 'Technology', slug: 'technology', image: '/images/categories/technology.png' },
    { name: 'Science', slug: 'science', image: '/images/categories/science.png' },
    { name: 'Health', slug: 'health', image: '/images/categories/health.png' },
    { name: 'Travel', slug: 'travel', image: '/images/categories/travel.png' },
    { name: 'Food', slug: 'food', image: '/images/categories/food.png' },
    { name: 'Business', slug: 'business', image: '/images/categories/business.png' },
    { name: 'Lifestyle', slug: 'lifestyle', image: '/images/categories/lifestyle.png' },
    { name: 'Education', slug: 'education', image: '/images/categories/education.png' },
    { name: 'News', slug: 'news', image: '/images/categories/news.png' }
];

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("✅ MongoDB Connected");
        await Category.deleteMany({});
        await Category.insertMany(categories);
        console.log("✅ Categories seeded with images!");
        process.exit();
    })
    .catch(err => {
        console.error("❌ Error seeding categories:", err);
        process.exit(1);
    });
