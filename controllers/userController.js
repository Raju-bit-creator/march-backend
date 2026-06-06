const User = require("../model/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");

const JWT_SECRET = process.env.JWT_SECRET;

// ─── Shared Nodemailer transporter ───────────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password
    },
  });

// ─── @route  POST api/auth/createuser ────────────────────────────────────────
// ─── @desc   Create new user
// ─── @access Public
const createUser = [
  body("name")
    .isLength({ min: 3 })
    .withMessage("Name must be at least 3")
    .trim()
    .escape(),
  body("email").isEmail().withMessage("Invalid email").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      let user = await User.findOne({ email: req.body.email });
      if (user) return res.status(400).json({ error: "User already exists" });

      const salt = await bcrypt.genSalt(10);
      const secPassword = await bcrypt.hash(req.body.password, salt);

      user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: secPassword,
      });

      const otp = otpGenerator.generate(6, {
        digits: true,
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });

      user.otp = await bcrypt.hash(otp, 10);
      user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await user.save();

      const authToken = jwt.sign({ id: user.id }, JWT_SECRET, {
        expiresIn: "1h",
      });

      const transporter = createTransporter();
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Your account verification OTP",
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: auto;">
            <h2>Verify your account</h2>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #333;">${otp}</p>
            <p>This OTP expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
          </div>
        `,
      });

      res.status(201).json({
        message: "User created successfully. OTP sent to your email.",
        data: { user: { id: user._id } },
        authToken,
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
    }
  },
];

// ─── @route  POST api/auth/login ─────────────────────────────────────────────
// ─── @desc   Login user with email and password, return JWT
// ─── @access Public
const loginUser = [
  body("email").isEmail().withMessage("Invalid email").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: "Invalid credentials" });
      }
      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const authToken = jwt.sign({ id: user.id }, JWT_SECRET, {
        expiresIn: "1h",
      });
      return res.status(200).json({
        success: true,
        message: "Login successful",
        user: { id: user._id, name: user.name, email: user.email },
        authToken,
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
    }
  },
];

// ─── @route  POST api/auth/verify-otp ────────────────────────────────────────
// ─── @desc   Verify account creation OTP and issue JWT
// ─── @access Public
const verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp)
    return res.status(400).json({ error: "userId and otp are required" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if OTP exists and hasn't expired
    if (!user.otp || !user.otpExpiresAt)
      return res
        .status(400)
        .json({ error: "No OTP found. Please log in again." });

    if (user.otpExpiresAt < new Date())
      return res
        .status(400)
        .json({ error: "OTP has expired. Please log in again." });

    // Compare submitted OTP with hashed OTP in DB
    const isValid = await bcrypt.compare(otp, user.otp);
    if (!isValid) return res.status(400).json({ error: "Invalid OTP" });

    // Clear OTP fields after successful verification
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    // Issue JWT
    const authToken = jwt.sign({ user: { id: user._id } }, JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: { id: user._id, name: user.name, email: user.email },
      authToken,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// ─── @route  GET api/auth/getuser ────────────────────────────────────────────
// ─── @desc   Get logged-in user details (Protected)
// ─── @access Private
const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -otp -otpExpiresAt",
    );
    res.status(200).json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// ─── @route  POST api/auth/forgot-password ───────────────────────────────────
// ─── @desc   Send password reset link to email
// ─── @access Public
const forgetPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ Status: "User not found" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1d" });

    const resetLink = `http://localhost:5173/reset-password/${user._id}/${token}`;

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset Your Password",
      html:
        `<div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px;">
          <h2 style="color: #1a1a1a;">Password Reset Request</h2>
          <p style="color: #555;">Click the button below to reset your password. This link expires in <strong>24 hours</strong>.</p>

          <a href="` +
        resetLink +
        `"
            style="display:inline-block; margin: 16px 0; padding: 12px 24px; background:#3B6D11; color:#ffffff;
                   text-decoration:none; border-radius:8px; font-weight:bold; font-size:15px;">
            Reset Password
          </a>

          <p style="margin-top:12px; color:#555; font-size:13px;">Or copy and paste this link in your browser:</p>
          <p style="font-size:12px; color:#3B6D11; word-break:break-all;">` +
        resetLink +
        `</p>

          <p style="margin-top:24px; color:#999; font-size:12px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ Status: "Success" });
  } catch (error) {
    console.error("Error in forgetPassword:", error);
    res.status(500).send("Internal Server Error");
  }
};

// ─── @route  POST api/auth/reset-password/:id/:token ─────────────────────────
// ─── @desc   Reset password using token from email link
// ─── @access Public
const resetPassword = async (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;

  try {
    // Verify token using JWT_SECRET (not hardcoded string)
    jwt.verify(token, JWT_SECRET);

    const hash = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(id, { password: hash });

    return res.status(200).json({ Status: "Success" });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(400).json({ Status: "Invalid or expired token" });
    }
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  loginUser,
  verifyOtp,
  createUser,
  getUserDetails,
  forgetPassword,
  resetPassword,
};
