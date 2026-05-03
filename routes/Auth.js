const express = require("express");
const User = require("../model/User");
const router = express.Router();

// @route   POST api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", (req, res) => {
  // Here you would normally handle authentication logic
  res.json({ message: "Login successful" });
});

router.post("/createuser", async (req, res) => {
  try {
    let user = await User.findOne({ email: req.body.email });
    if (user) {
      return res.status(400).json({ error: "User already exists" });
    }
    console.log(req.body);

    user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
    });

    res.json({ message: "User created successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
