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

  const offersStartingTomorrow = await Offer.find({
    startDate: { $gte: tomorrowStr, $lt: `${tomorrowStr}T23:59:59Z` },
  });
  const offersStartingToday = await Offer.find({
    startDate: { $lte: todayStr },
    endDate: { $gte: todayStr },
  });

  const subscribers = await Subscriber.find({ isSubscribed: true });
  const subscribersEmails = subscribers.map((s) => s.email);

  for (const offer of [...offersStartingTomorrow, ...offersStartingToday]) {
    const buyersIds = await Order.distinct("user", {
      "orderItems.productId": { $in: offer.productIds },
    });
    const buyers = await User.find({ _id: { $in: buyersIds } });
    const buyerEmails = buyers.map((b) => b.email);
    const recipients = [...new Set([...subscribersEmails, ...buyerEmails])];

    const formattedStart = new Date(offer.startDate).toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
    const formattedEnd = new Date(offer.endDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const isToday = offersStartingToday.includes(offer);
    const subject = isToday
      ? `🔥 Sale Now Live: ${offer.title}`
      : `⏳ Starts Tomorrow: ${offer.title}`;

    const message = `
      <h2>${offer.title}</h2>
      <img
  src="${offer.bannerImage}"
  alt="Offers Banner"
  className="w-full h-auto object-cover mb-6 rounded-lg shadow"
/>
      <p>${
        isToday ? "Our exciting offer is now LIVE!" : "Hurry! Starts tomorrow!"
      }</p>
      <p><strong>${
        offer.offerPercentage
      }% OFF</strong> from <strong>${formattedStart}</strong> to <strong>${formattedEnd}</strong>.</p>
      {new Date() >= new Date(offer.startDate) ? (
  <a
    href="/offers"
    className="inline-block px-6 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition-all duration-200 shadow"
  >
    View Now
  </a>
) : null}
      <p>Don't miss out on this amazing deal!</p>
      <p>Best regards,</p>
      <p>Team Raphaaa</p>
    `;

    for (const email of recipients) {
      await sendMail({ to: email, subject, message });
    }
  }
};

// Schedule the function to run every day at 9:00 AM
cron.schedule("0 9 * * *", sendScheduledEmails);

module.exports = { sendScheduledEmails };
