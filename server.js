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
const paymentRoutes = require("./routes/paymentRoutes");
const taskRoutes = require("./routes/taskRoutes");
// const merchRoutes = require("./routes/merchRoutes");
const Task = require("./models/taskModel");
const cron = require("node-cron");

// Runs every day at 7:00 PM IST (adjust to your server timezone)
cron.schedule("0 19 * * *", async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of day

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  try {
    const updated = await Task.updateMany(
      {
        createdAt: { $gte: today, $lt: tomorrow },
        status: "working",
      },
      { $set: { status: "not completed" } }
    );

    console.log(`[CRON] Updated ${updated.modifiedCount} tasks as 'not completed'`);
  } catch (err) {
    console.error("[CRON] Failed to auto-update tasks:", err.message);
  }
});

const corsConfig = {
    origin: "*",
    Credential: true,
    methods: ["GET", "POST", "PUT", "DELETE"] ,
};

const app = express();
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

// Connect to the MongoDB database
connectDB();

app.get("/", (req, res) => {
    res.send("Welcome tp Raphaaa API!!");
});

// API Routes 
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api", subscriberRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/tasks", taskRoutes);

// Admin routes
app.use("/api/admin/users", adminRoutes);
app.use("/api/admin/products", productAdminRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
// app.use("/api/merch", merchRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on https://localhost:${PORT}`);
});