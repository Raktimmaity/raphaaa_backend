const nodemailer = require("nodemailer");

const sendMail = async ({ to, subject, message }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // or use your SMTP provider
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Raphaaa Support" <${process.env.SMTP_EMAIL}>`,
    to,
    subject,
    html: `
      <div style="background: linear-gradient(to bottom right, #e0f2fe, #0284c7); padding: 32px; font-family: 'Segoe UI', sans-serif; color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 8px 20px rgba(0,0,0,0.05);">
          <h2 style="color: #0284c7; font-size: 22px; margin-bottom: 16px;">${subject}</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #334155;">${message}</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 13px; color: #64748b; text-align: center;">This is an automated message. Please do not reply.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// 🛍️ New Arrivals Notification
const sendNewArrivalNotification = async (emails, products) => {
  const htmlBody = `
    <div style="background: linear-gradient(to bottom right, #e0f2fe, #0284c7); padding: 32px; font-family: 'Segoe UI', sans-serif; color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 8px 20px rgba(0,0,0,0.05);">
        <h2 style="color: #0284c7; font-size: 22px; margin-bottom: 16px;">🆕 New Arrivals at Raphaaa!</h2>
        <p style="font-size: 16px; color: #334155;">Check out our latest additions:</p>
        <ul style="padding-left: 18px;">
          ${products
            .map(
              (p) => `
              <li style="margin-bottom: 10px;">
                <strong>${p.name}</strong> – ₹${p.price}<br/>
                ${p.images?.[0]?.url ? `<img src="${p.images[0].url}" alt="${p.name}" width="100" style="margin-top: 5px;" />` : ""}
              </li>
            `
            )
            .join("")}
        </ul>
        <p style="margin-top: 16px;">
          <a href="https://your-site.com/shop" style="color:#0284c7; font-weight:bold;">🛒 Shop Now</a>
        </p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">This is an automated message. Please do not reply.</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Raphaaa Store" <${process.env.EMAIL_USER}>`,
    to: emails,
    subject: "🆕 New Arrivals Just Dropped!",
    html: htmlBody,
  });
};


module.exports = {
  sendMail,
  sendNewArrivalNotification,
};
