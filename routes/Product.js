const express = require("express");
const router = express.Router();
const fetchUser = require("../middleware/FetchUser");
const upload = require("../middleware/upload");

const {
  createProduct,
  getAllProducts,
  getMyProducts,
  editMyProduct,
  deleteMyProduct,
} = require("../controllers/productController");

// @route   GET api/products
// @desc    Get all products (Protected)
// @access  Private
router.get("/allproduct", fetchUser, getAllProducts);
router.post("/addproduct", fetchUser, upload.single("image"), createProduct);
router.get("/myproduct", fetchUser, getMyProducts);
router.put("/updateproduct/:id", fetchUser, editMyProduct);
router.delete("/deleteproduct/:id", fetchUser, deleteMyProduct);

module.exports = router;
