const User = require("../model/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const nodemailer = require("nodemailer");

const JWT_SECRET = process.env.JWT_SECRET;

// @route   POST api/auth/login
// @desc    Login user
// @access  Public
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
        return res.status(400).json({
          error: "Invalid credentials",
        });
      }

      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        return res.status(400).json({
          error: "Invalid credentials",
        });
      }

      const data = {
        user: {
          id: user.id,
        },
      };
      var authToken = jwt.sign(data, JWT_SECRET, { expiresIn: "1h" });

      res
        .status(200)
        .json({ success: true, message: "login successfull", user, authToken });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
    }
  },
];

// @route   POST api/auth/createuser
// @desc    Create new user
// @access  Public

const createUser = [
  body("name")
    .isLength({ min: 3 })
    .withMessage("Name must be atleast 3")
    .trim()
    .escape(),
  body("email").isEmail().withMessage("Invalid email").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      let user = await User.findOne({ email: req.body.email });

      if (user) {
        return res.status(400).json({
          error: "User already exists",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const secPassword = await bcrypt.hash(req.body.password, salt);
      user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: secPassword,
      });

      token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      const data = {
        user: {
          id: user._id,
        },
      };

      res.json({
        message: "User created successfully",
        data,
        token,
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
    }
  },
];

// @route   GET api/auth/getuser
// @desc    Get user details (Protected)
// @access  Private
const getUserDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    res.status(200).json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Forgot Password Route
const forgetPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ Status: "User not existed" });
    }

    // Generate JWT reset token
    const token = jwt.sign({ id: user._id }, "heisagoodboy", {
      expiresIn: "1d",
    });

    // Log the target email
    console.log("Sending password reset email to:", email);

    // Setup Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "postman.himalaya@gmail.com", // Your Gmail
        pass: "sssshhhhh", // Your Gmail App Password
      },
    });

    const resetLink = `http://localhost:5173/reset_password/${user._id}/${token}`;

    const mailOptions = {
      from: "postman.himalaya@gmail.com",
      to: email,
      subject: "Reset Password Link",
      text: `Click the link to reset your password: ${resetLink}`,
    };

    // Send the email
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({ Status: "Email not sent", Error: error });
      } else {
        console.log("Email sent successfully:", info.response);
        return res.status(200).json({ Status: "Success", Info: info.response });
      }
    });
  } catch (error) {
    console.error("Internal error:", error);
    res.status(500).send("Internal Server Error");
  }
};

const resetPassword = async (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;

  jwt.verify(token, "heisagoodboy", (err, decoded) => {
    if (err) {
      return res.json({ Status: "Error with token" });
    } else {
      bcrypt
        .hash(password, 10)
        .then((hash) => {
          User.findByIdAndUpdate({ _id: id }, { password: hash })
            .then((u) => res.send({ Status: "Success" }))
            .catch((err) => res.send({ Status: err }));
        })
        .catch((err) => res.send({ Status: err }));
    }
  });
};

module.exports = {
  loginUser,
  createUser,
  getUserDetails,
  forgetPassword,
  resetPassword,
};
