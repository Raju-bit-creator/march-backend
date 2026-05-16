const express = require("express");
const router = express.Router();

const {
  loginUser,
  createUser,
  getUserDetails,
} = require("../controllers/userController");
const fetchUser = require("../middleware/FetchUser");

// Login Route
router.post("/login", loginUser);

// Create User Route
router.post("/createuser", createUser);

// Get User Details Route
router.get("/getuser", fetchUser, getUserDetails);

module.exports = router;
