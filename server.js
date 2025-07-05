// const express = require("express");
// const cors = require("cors");
// const dotenv = require("dotenv");
// const connectDB = require("./config/db");
// const userRoutes = require("./routes/userRoutes");
// const productRoutes = require("./routes/productRoutes");
// const cartRoutes = require("./routes/cartRoutes");
// const checkoutRoutes = require("./routes/checkoutRoutes");
// const orderRoutes = require("./routes/orderRoutes");
// const uploadRoutes = require("./routes/uploadRoutes");
// const subscriberRoutes = require("./routes/subscriberRoute");
// const adminRoutes = require("./routes/adminRoutes");
// const productAdminRoutes = require("./routes/productAdminRoutes");
// const adminOrderRoutes = require("./routes/adminOrderRoutes");
// const merchRoutes = require("./routes/merchRoutes");

// // Load environment variables
// dotenv.config();

// const app = express();
// app.use(express.json());
// app.use(cors());

// // Connect to the MongoDB database
// connectDB();

// app.get("/", (req, res) => {
//     res.send("Welcome to Raphaaa API!!");
// });

// // API Routes 
// app.use("/api/users", userRoutes);
// app.use("/api/products", productRoutes);
// app.use("/api/cart", cartRoutes);
// app.use("/api/checkout", checkoutRoutes);
// app.use("/api/orders", orderRoutes);
// app.use("/api/upload", uploadRoutes);
// app.use("/api", subscriberRoutes);

// // Admin routes
// app.use("/api/admin/users", adminRoutes);
// app.use("/api/admin/products", productAdminRoutes);
// app.use("/api/admin/orders", adminOrderRoutes);
// app.use("/api/merch", merchRoutes);

// // Export the Express app for Vercel
// module.exports = app;

// // Only listen to port in local development
// if (process.env.NODE_ENV !== "production") {
//     const PORT = process.env.PORT || 3000;
//     app.listen(PORT, () => {
//         console.log(`Server is running on http://localhost:${PORT}`);
//     });
// }

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const orderRoutes = require("./routes/orderRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const subscriberRoutes = require("./routes/subscriberRoute");
const adminRoutes = require("./routes/adminRoutes");
const productAdminRoutes = require("./routes/productAdminRoutes");
const adminOrderRoutes = require("./routes/adminOrderRoutes");
const merchRoutes = require("./routes/merchRoutes");

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Connect to the MongoDB database (async)
connectDB().catch(console.error);

app.get("/", (req, res) => {
    res.send("Welcome to Raphaaa API!!");
});

// API Routes 
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api", subscriberRoutes);

// Admin routes
app.use("/api/admin/users", adminRoutes);
app.use("/api/admin/products", productAdminRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/merch", merchRoutes);

// Export the Express app for Vercel
module.exports = app;

// Only listen to port in local development
if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}