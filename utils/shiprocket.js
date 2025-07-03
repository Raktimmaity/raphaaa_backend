// utils/getShiprocketToken.js
const axios = require("axios");

const getShiprocketToken = async () => {
  const { data } = await axios.post("https://apiv2.shiprocket.in/v1/external/auth/login", {
    email: "raktimmaity20031@gmail.com",
    password: "ZV9e8Rn#U2J@UZtF"
  });
  return data.token;
};

module.exports = getShiprocketToken;
