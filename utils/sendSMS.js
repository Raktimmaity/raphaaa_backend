const axios = require("axios");

// const sendSMS = async (mobile, otp) => {
//   const apiKey = process.env.FAST2SMS_API_KEY;

//   const payload = {
//     sender_id: "FSTSMS",
//     message: `Your verification code is ${otp}`,
//     language: "english",
//     route: "p",
//     numbers: mobile,
//   };

//   await axios.post("https://www.fast2sms.com/dev/bulkV2", payload, {
//     headers: {
//       authorization: apiKey,
//       "Content-Type": "application/json",
//     },
//   });
// };

// module.exports = sendSMS;

const sendSMS = async (mobile, otp) => {
  console.log(`🔐 [Mock SMS] Sending OTP ${otp} to mobile: ${mobile}`);
};

module.exports = sendSMS;
