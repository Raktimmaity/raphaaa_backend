const webpush = require("web-push");

webpush.setVapidDetails(
  "mailto:raktimmaity2003@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const sendPushNotification = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    console.error("Push Notification Error:", err.message);
  }
};

module.exports = { sendPushNotification };
