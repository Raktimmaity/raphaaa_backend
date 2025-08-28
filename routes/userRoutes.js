const express = require("express");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();
const bcrypt = require("bcryptjs");
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
const sendSMS = require("../utils/sendSMS");
const { sendMail } = require("../utils/sendMail");
const emailOtps = new Map(); // key: email, val: { otp, expires: Date }
const generateEmailOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// const ALLOWED_EMAILS = new Set([
//   "test@example.com",
//   "demo@raphaaa.com",
//   // add more...
// ]);

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

    // ✅ Send welcome email
    try {
      await sendMail({
        to: user.email,
        subject: "🎉 Welcome to Raphaaa!",
        message: `
      <p>Hi ${user.name},</p>
      <p>Welcome to <strong>Raphaaa</strong>! We're thrilled to have you join our community.</p>
      <p>Start shopping and enjoy your experience!</p>
      <p>Love,<br/>Team Raphaaa</p>
    `,
      });
    } catch (err) {
      console.error("Failed to send welcome email:", err.message);
    }

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

// @route POST /api/users/google-login
// @desc Login/Register via Google OAuth
// @access Public
router.post("/google-login", async (req, res) => {
  const { name, email, photo } = req.body;

  try {
    let user = await User.findOne({ email });

    if (!user) {
      // Auto-register if not found
      user = new User({
        name,
        email,
        password: Math.random().toString(36).slice(-8), // Random password
        photo,
        coupon: {
          code: `WELCOME${Math.floor(1000 + Math.random() * 9000)}`,
          discount: 10,
          expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        },
      });
      await user.save();
    }

    const payload = { user: { id: user._id, role: user.role } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "40h" },
      (err, token) => {
        if (err) throw err;
        res.json({
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            photo: user.photo,
          },
          token,
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Google login failed" });
  }
});

// await sendSMS(mobile, otp); // right before saving user

router.post("/send-otp", async (req, res) => {
  const { userId, mobile } = req.body;

  const otp = generateOTP();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  try {
    await sendSMS(mobile, otp); // ✅ Moved INSIDE async route
  } catch (error) {
    console.error("SMS sending failed:", error);
    return res.status(500).json({ message: "Failed to send OTP" });
  }

  user.mobile = mobile;
  user.otpCode = otp;
  user.otpExpires = expires;
  await user.save();

  res.json({ message: "OTP sent to mobile" });
});

router.post("/verify-otp", async (req, res) => {
  const { userId, otp } = req.body;

  const user = await User.findById(userId);
  if (!user || !user.otpCode || !user.otpExpires) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  const now = new Date();
  if (user.otpCode !== otp || now > user.otpExpires) {
    return res.status(400).json({ message: "Incorrect or expired OTP" });
  }

  user.mobileVerified = true;
  user.otpCode = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.json({ message: "Mobile number verified successfully" });
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

// @route GET /api/users/my-coupon
// @desc Get coupon for logged-in user
// @access Private
router.get("/my-coupon", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("coupon");

    if (!user || !user.coupon) {
      return res.status(404).json({ message: "No coupon found" });
    }

    res.json(user.coupon);
  } catch (error) {
    console.error("Coupon fetch failed:", error);
    res.status(500).json({ message: "Server error while fetching coupon" });
  }
});

// @route POST /api/users/validate-coupon
// @desc Validate user's coupon
// @access Private
router.post("/validate-coupon", protect, async (req, res) => {
  const { couponCode } = req.body;
  const user = await User.findById(req.user._id);

  if (
    user &&
    user.coupon &&
    user.coupon.code.toUpperCase() === couponCode.toUpperCase() &&
    new Date(user.coupon.expiresAt) > new Date()
  ) {
    return res.json({ valid: true, discount: user.coupon.discount });
  } else {
    return res
      .status(400)
      .json({ valid: false, message: "Invalid or expired coupon" });
  }
});

// @route GET /api/users/hierarchy
// @desc Get user hierarchy for admin > merchantise > marketing
// @access Public/View Only
router.get("/hierarchy", async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select(
      "name email photo"
    );
    const merchantisers = await User.find({ role: "merchantise" }).select(
      "name email photo"
    );
    const marketing = await User.find({ role: "marketing" }).select(
      "name email photo"
    );

    res.json({
      admin: admins,
      merchantise: merchantisers,
      marketing: marketing,
    });
  } catch (err) {
    console.error("Hierarchy fetch error:", err);
    res.status(500).json({ message: "Failed to fetch hierarchy" });
  }
});

// Admin: reset ANY user's password and email it to them
router.post("/reset-password", protect, async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Generate a strong password if admin didn't provide one
    const generated = (() => {
      const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
      let out = "";
      for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
      return out;
    })();

    const finalPass = (newPassword || generated).trim();
    if (finalPass.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Set & save — will be hashed by pre-save hook in User model
    user.password = finalPass;
    await user.save(); // hashes via userSchema.pre('save') :contentReference[oaicite:7]{index=7}

    // Email the new password
    try {
      await sendMail({
        to: user.email,
        subject: "Your Raphaaa password has been reset",
        message: `
          <p>Hi ${user.name || "there"},</p>
          <p>Your password has been reset by an administrator.</p>
          <p><strong>New Password:</strong> ${finalPass}</p>
          <p>You can sign in and change it from your profile settings.</p>
          <p>– Team Raphaaa</p>
        `,
      }); // uses your nodemailer transport setup :contentReference[oaicite:8]{index=8}
    } catch (mailErr) {
      console.error("Failed to send password mail:", mailErr);
      // Still return success for reset, but inform about email failure
      return res.status(200).json({
        message:
          "Password reset. Failed to send email—please share the new password manually.",
        tempPassword: finalPass,
      });
    }

    return res.status(200).json({
      message: "Password reset and emailed to the user.",
      // (optional) expose tempPassword for admin UI if needed:
      // tempPassword: finalPass,
    });
  } catch (error) {
    console.error("Admin reset password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});


// Send 6-digit OTP to email (pre-registration)
router.post("/send-email-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    // If you want to enforce "hard coded email id" usage:
    // if (ALLOWED_EMAILS.size && !ALLOWED_EMAILS.has(email)) {
    //   return res.status(403).json({ message: "Email not allowed for OTP" });
    // }

    const otp = generateEmailOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min validity
    emailOtps.set(email, { otp, expires });

    await sendMail({
      to: email,
      subject: "Your Raphaaa verification code",
      message: `
        <p>Use this 6-digit code to verify your email:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
        <p>This code will expire in 10 minutes.</p>
      `,
    });

    return res.json({ message: "OTP sent to email" });
  } catch (err) {
    console.error("send-email-otp error:", err);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
});

// Verify email OTP (pre-registration)
router.post("/verify-email-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const record = emailOtps.get(email);
    if (!record) {
      return res.status(400).json({ message: "No OTP found. Please request again." });
    }

    const now = new Date();
    if (record.otp !== otp || now > record.expires) {
      return res.status(400).json({ message: "Incorrect or expired OTP" });
    }

    // success -> clear the OTP so it can't be reused
    emailOtps.delete(email);
    return res.json({ message: "Email verified" });
  } catch (err) {
    console.error("verify-email-otp error:", err);
    return res.status(500).json({ message: "Verification failed" });
  }
});

module.exports = router;
