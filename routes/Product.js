const express = require("express");
const router = express.Router();
const fetchUser = require("../middleware/FetchUser");
const {
  createProduct,
  getAllProducts,
} = require("../controllers/productController");

// @route   GET api/products
// @desc    Get all products (Protected)
// @access  Private
router.get("/allproduct", fetchUser, getAllProducts);
router.post("/addproduct", fetchUser, createProduct);

module.exports = router;
