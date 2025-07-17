const express = require("express");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();
const bcrypt = require("bcryptjs");

// @route POST /api/users/register
// @desc Register a new User
// @access Public
router.post("/register", async (req, res) => {
  const couponCode = `WELCOME${Math.floor(1000 + Math.random() * 9000)}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 10); // Valid for 10 days
  const { name, email, password } = req.body;

  try {
    // Registration logic
    let user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "User already exists." });

    user = new User({
      name,
      email,
      password,
      coupon: {
        code: couponCode,
        discount: 10,
        expiresAt,
      },
    });
    await user.save();

    // Create JWT Payload
    const payload = { user: { id: user._id, role: user.role } };

    // Sign and return the token along with user data
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "40h" },
      (err, token) => {
        if (err) throw err;

        // Send the user and token in response
        res.status(201).json({
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          token,
        });
      }
    );
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
});

// @route POST /api/user
// @desc Authenticate user
// @access Public
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    let user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "Invalid Credentials" });
    const isMatch = await user.matchPassword(password);

    if (!isMatch)
      return res.status(400).json({ message: "Invalid Credentials" });

    // Create JWT Payload
    const payload = { user: { id: user._id, role: user.role } };

    // Sign and return the token along with user data
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "40h" },
      (err, token) => {
        if (err) throw err;

        // Send the user and token in response
        res.json({
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          token,
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server Error");
  }
});

// @route GET /api/users/profile
// @desc Get the logged-in user's profile (Protected Route)
// @access Private
router.get("/profile", protect, async (req, res) => {
  // res.json(req.user);
  const user = await User.findById(req.user._id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

// @route PUT /api/users/profile
// @desc Update user profile (Protected)
// @access Private
router.put("/update-profile", protect, async (req, res) => {
  try {
    // ✅ Enhanced validation
    const { name, email, password, photo } = req.body;

    // Check if required fields are provided
    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Check if email is already taken by another user
    if (email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailExists) {
        return res
          .status(400)
          .json({ message: "Email already in use by another user" });
      }
    }

    // Update user fields
    user.name = name;
    user.email = email;
    if (photo) {
  user.photo = photo;
}

    // ✅ Only update password if provided and not empty
    if (password && password.trim() !== "") {
      user.password = password; // Will be hashed by model pre-save
    }

    const updatedUser = await user.save();

    // ✅ Enhanced JWT payload and error handling
    const payload = { user: { id: updatedUser._id, role: updatedUser.role } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "40h" },
      (err, token) => {
        if (err) {
          console.error("JWT Sign Error:", err);
          return res.status(500).json({ message: "Error generating token" });
        }

        res.json({
          user: {
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            photo: updatedUser.photo,
          },
          token,
        });
      }
    );
  } catch (error) {
    console.error("Update profile error:", error);

    // ✅ Enhanced error handling
    if (error.code === 11000) {
      // MongoDB duplicate key error
      return res.status(400).json({ message: "Email already exists" });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

// @route   PUT /api/auth/reset-password
// @desc    Reset password using email
// @access  Public
// @route   PUT /api/auth/reset-password
// @desc    Reset password using email (only for customer role)
// @access  Public
router.put("/reset-password", async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  try {
    // ✅ Validation
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // ✅ Check if user exists
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Role restriction
    if (user.role !== "customer") {
      return res.status(403).json({ message: "Access denied!!" });
    }

    // ✅ Hash and save new password
    user.password = password; // Automatically hashed in pre-save middleware
    const updatedUser = await user.save();

    // ✅ Generate token
    const payload = { user: { id: updatedUser._id, role: updatedUser.role } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "40h" },
      (err, token) => {
        if (err) {
          console.error("JWT Sign Error:", err);
          return res.status(500).json({ message: "Error generating token" });
        }

        return res.json({
          message: "Password reset successfully!",
          user: {
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
          },
          token,
        });
      }
    );
  } catch (error) {
    console.error("Reset password error:", error);

    // ✅ Enhanced error handling
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate entry" });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
