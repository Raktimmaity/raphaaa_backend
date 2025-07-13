// /routes/notificationRoutes.js
const router = require("express").Router();
const Subscriber = require("../models/Subscriber");
const nodemailer = require("nodemailer");

router.post("/send-new-arrivals", async (req, res) => {
  try {
    const subscribers = await Subscriber.find({});
    const emails = subscribers.map((s) => s.email);

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: emails,
      subject: "🆕 New Arrivals Just Dropped!",
      html: `
        <h3>New Products Have Arrived!</h3>
        <p>We're excited to share the latest drops in our store. Check them out before they’re gone!</p>
        <a href="https://yourstore.com/collections/new-arrivals" style="color: blue;">View New Arrivals</a>
      `,
    });

    res.json({ success: true, message: "Newsletter sent to subscribers" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send emails" });
  }
});
