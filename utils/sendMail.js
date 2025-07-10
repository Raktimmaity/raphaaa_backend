// utils/sendMail.js
const nodemailer = require("nodemailer");

const sendMail = async ({ to, subject, message }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // or use your SMTP provider
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"Raphaaa Support" <${process.env.SMTP_EMAIL}>`,
    to,
    subject,
    html: `<div style="font-family:sans-serif; line-height:1.5;">
             <h3>${subject}</h3>
             <p>${message}</p>
           </div>`,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendMail;
