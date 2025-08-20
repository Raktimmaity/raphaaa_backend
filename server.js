const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const axios = require("axios");
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
const paymentRoutes = require("./routes/paymentRoutes");
const taskRoutes = require("./routes/taskRoutes");
const salesRoutes = require("./routes/salesRoutes");
// const merchRoutes = require("./routes/merchRoutes");
const Task = require("./models/taskModel");
const cron = require("node-cron");
const moment = require("moment-timezone");
const reviewRoutes = require("./routes/reviewRoutes");
const contactRoutes = require("./routes/contactRoutes");
const heroRoutes = require("./routes/heroRoutes");
const webhookRoutes = require("./routes/paymentWebhook");
const suggestionRoutes = require("./routes/suggestionRoutes");
const contactSettingRoutes = require("./routes/contactSettingRoutes");
const aboutRoutes = require("./routes/aboutRoutes");
const collabRoutes = require("./routes/collabRoutes");
const userAddressRoutes = require("./routes/userAddressRoutes");
const policyRoutes = require("./routes/policyRoutes");
const offerRoutes = require("./routes/offerRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
// require("./emailScheduler");
const { sendScheduledEmails } = require("./offerScheduler");
sendScheduledEmails(); // Run once on startup
const metaOptionRoutes = require("./routes/metaOptionRoutes");
const campaignsRoutes = require("./routes/campaignRoutes");

// Run every day at 7:00 PM IST
cron.schedule("0 19 * * *", async () => {
  const now = moment().tz("Asia/Kolkata");
  console.log(`[RUNNING] IST Time: ${now.format("hh:mm:ss A")} on ${now.format("DD-MM-YYYY")}`);
  const startOfDay = now.clone().startOf("day").toDate();
  const endOfDay = now.clone().endOf("day").toDate();

  try {
    const result = await Task.updateMany(
      {
        status: { $nin: ["completed", "not-completed"] }, // Not already completed or marked
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      },
      { $set: { status: "not-completed" } }
    );

    console.log(
      `[TASK STATUS AUTO-UPDATE] ${result.modifiedCount} tasks marked as "not-completed"`
    );
  } catch (err) {
    console.error("Auto-update failed:", err.message);
  }
});

const corsConfig = {
    origin: "*",
    Credential: true,
    methods: ["GET", "POST", "PUT", "DELETE"] ,
};

const app = express();
// app.use("/api/payment/webhook", webhookRoute);
app.use(express.json());
// app.use(cors({
//   origin: "http://localhost:9000", // change to your frontend URL
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// }));
app.options("", cors(corsConfig));
app.use(cors(corsConfig));

dotenv.config();

const PORT = process.env.PORT || 3000;

// Reset Mongoose models in development to prevent OverwriteModelError
if (process.env.NODE_ENV === 'development') {
  mongoose.models = {};
  mongoose.modelSchemas = {};
}

// Connect to the MongoDB database
connectDB();

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
app.use("/api/paymentRoutes", paymentRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/inventory", require("./routes/inventoryRoutes"));
app.use("/api/sales-analysis", salesRoutes);
// In server.js or app.js
app.use("/uploads", express.static("uploads"));
app.use("/api/reviews", reviewRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/website/hero", heroRoutes);
app.use("/api/suggestions", suggestionRoutes);
app.use("/api/settings/contact", contactSettingRoutes);
app.use("/api/settings/about", aboutRoutes);
app.use("/api/collabs", collabRoutes);
app.use("/api/payment/webhook", webhookRoutes);
app.use("/api/user/addresses", userAddressRoutes);
app.use("/api/settings/policy", policyRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/campaigns", campaignsRoutes);

// Admin routes
app.use("/api/admin/users", adminRoutes);
app.use("/api/admin/products", productAdminRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
// app.use("/api/merch", merchRoutes);
app.use("/api/meta-options", metaOptionRoutes);

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});


app.listen(PORT, () => {
    console.log(`Server is running on https://localhost:${PORT}`);
});

// Self-ping every 1 minute to prevent sleeping (Render free tier)
setInterval(() => {
  axios
    .get("https://raphaaa-backend.onrender.com/healthz" || "http://localhost:9000/healthz")
    .then(() => console.log("[SELF-PING] Success. Server responding OK."))
    .catch((err) => console.error("[SELF-PING ERROR]:", err.message));
}, 10 * 60 * 1000); // every 1 minute
// const webpush = require("web-push");
// const vapidKeys = webpush.generateVAPIDKeys();
// console.log(vapidKeys);
// {
//   publicKey: 'BIfPA4HUUcJVRPAqn4NEAcE8Bzg9cYmLTVNqGYCY5SqJvPKjp6JPva2C2aTyXKcKoUrwbwjrj7puKNPHWIgdvls',
//   privateKey: 'AevdtLtBPJhn062uTjiLqHjgpE7rKv4hwlr3Gku_dXI'
// }