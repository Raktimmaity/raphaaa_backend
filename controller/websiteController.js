const About = require("../models/About");

exports.updateAbout = async (req, res) => {
  try {
    let about = await About.findOne();
    if (!about) about = new About();

    about.content = req.body.content || "";
    await about.save();

    res.status(200).json(about);
  } catch (err) {
    res.status(500).json({ message: "Error updating about page" });
  }
};

exports.getAbout = async (req, res) => {
  try {
    const about = await About.findOne();
    res.status(200).json(about || {});
  } catch (err) {
    res.status(500).json({ message: "Error fetching about page" });
  }
};
