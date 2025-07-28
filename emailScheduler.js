const cron = require("node-cron");
const Product = require("./models/Product");
const Subscriber = require("./models/Subscriber");
const { sendMail } = require("./utils/sendMail");

cron.schedule("*/1 * * * *", async () => {
  try {
    const newProducts = await Product.find().sort({ createdAt: -1 }).limit(5);
    const subscribers = await Subscriber.find({ isSubscribed: true });

    if (newProducts.length === 0 || subscribers.length === 0) return;

    const itemsHtml = newProducts.map(p => `
      <p><strong>${p.name}</strong> - <a href="https://raphaaa.onrender.com/product/${p._id}">View Product</a></p>
    `).join("");

    for (const s of subscribers) {
      await sendMail({
        to: s.email,
        subject: "🛍️ This Week's Latest from Raphaaa",
        message: `
          <p>Hey fashion lover,</p>
          <p>Here are some of the hottest new arrivals just for you:</p>
          ${itemsHtml}
          <p style="font-size:12px;margin-top:20px;">
            Don’t want these emails? <a href="https://raphaaa-backend.onrender.com/api/unsubscribe/${encodeURIComponent(s.email)}">Unsubscribe</a>
          </p>
        `,
      });
    }
    console.log("✅ Daily product update emails sent.");
    console.log("✅ Automated newsletter sent to all subscribers.");
  } catch (err) {
    console.error("❌ Error sending daily product update emails:", err);
  }
});
