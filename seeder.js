const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const User = require('./models/User');
const Cart = require('./models/Cart');
const products = require("./data/products");

dotenv.config();

// connect to the MongoDB
mongoose.connect(process.env.MONGO_URI);

// fnction to seed the data

const seedData = async () => {
    try {
        // clear existing data
        await Product.deleteMany();
        await User.deleteMany();
        await Cart.deleteMany();

        // create a default admin user
        const createdUser = await User.create({
            name: "Admin User",
            email: "admin@admin.com",
            password: "nopass",
            role: "admin",
        });

        // Assign the default user ID to ecah product
        const userID = createdUser._id;

        const sampleProducts = products.map((product) => {
            return { ...product, user: userID };
        });

        // insert the sample products into the database
        await Product.insertMany(sampleProducts);

        console.log("Product data seeded successfully!");
        process.exit();
    } catch (error) {
        console.log("Error seeding the data", error);
        process.exit(1);
    }
};

seedData();