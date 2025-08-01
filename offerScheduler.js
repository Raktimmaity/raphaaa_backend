// offerScheduler.js
const cron = require("node-cron");
const Offer = require("./models/offer");
const Order = require("./models/Order");
const User = require("./models/User");
const Subscriber = require("./models/Subscriber");
const { sendMail } = require("./utils/sendMail");

const sendScheduledEmails = async () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const todayStr = now.toISOString().slice(0, 10);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const offersStartingTomorrow = await Offer.find({ startDate: { $gte: tomorrowStr, $lt: `${tomorrowStr}T23:59:59Z` } });
  const offersStartingToday = await Offer.find({ startDate: { $lte: todayStr }, endDate: { $gte: todayStr } });

  const subscribers = await Subscriber.find({ isSubscribed: true });
  const subscribersEmails = subscribers.map(s => s.email);

  for (const offer of [...offersStartingTomorrow, ...offersStartingToday]) {
    const buyersIds = await Order.distinct("user", {
      "orderItems.productId": { $in: offer.productIds },
    });
    const buyers = await User.find({ _id: { $in: buyersIds } });
    const buyerEmails = buyers.map(b => b.email);
    const recipients = [...new Set([...subscribersEmails, ...buyerEmails])];

    const formattedStart = new Date(offer.startDate).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric"
    });
    const formattedEnd = new Date(offer.endDate).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric"
    });

    const isToday = offersStartingToday.includes(offer);
    const subject = isToday
      ? `🔥 Sale Now Live: ${offer.title}`
      : `⏳ Starts Tomorrow: ${offer.title}`;

    const message = `
      <h2>${offer.title}</h2>
      <p>${isToday ? "Our exciting offer is now LIVE!" : "Hurry! Starts tomorrow!"}</p>
      <p><strong>${offer.offerPercentage}% OFF</strong> from <strong>${formattedStart}</strong> to <strong>${formattedEnd}</strong>.</p>
      <p><a href="https://raphaaa.onrender.com/offers">View Now</a></p>
    `;

    for (const email of recipients) {
      await sendMail({ to: email, subject, message });
    }
  }
};

// Schedule the function to run every day at 9:00 AM
cron.schedule("0 9 * * *", sendScheduledEmails);

module.exports = { sendScheduledEmails };
