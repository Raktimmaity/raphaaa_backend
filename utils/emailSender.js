const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // or use SMTP provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendNewArrivalEmail = async (toEmails, products) => {
  const htmlBody = `
    <h2>🆕 New Arrivals at Raphaaa!</h2>
    <p>Check out our latest additions:</p>
    <ul>
      ${products
        .map(
          (p) => `
        <li>
          <strong>${p.name}</strong> – ₹${p.price} <br />
          <img src="${p.images[0]?.url}" alt="${p.name}" width="100" />
        </li>
      `
        )
        .join("")}
    </ul>
    <p><a href="https://your-site.com/shop" style="color:#0077cc;">🛍️ Shop Now</a></p>
  `;

  await transporter.sendMail({
    from: `"Raphaaa Store" <${process.env.EMAIL_USER}>`,
    to: toEmails,
    subject: "🆕 New Arrivals Just Dropped!",
    html: htmlBody,
  });
};

module.exports = { sendNewArrivalEmail };
