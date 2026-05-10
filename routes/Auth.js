const express = require("express");
const router = express.Router();

const { loginUser, createUser } = require("../controllers/userController");

// Login Route
router.post("/login", loginUser);

// Create User Route
router.post("/createuser", createUser);

// Get User Details Route
// router.get("/getuser", getUserDetails);

module.exports = router;
