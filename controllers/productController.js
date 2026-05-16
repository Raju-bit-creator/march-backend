// make create product controller and route

const Product = require("../model/Product");

// controllers/productController.js

const getAllProducts = async (req, res) => {
  const products = await Product.find({});
  res.json(products);
};
const createProduct = async (req, res) => {
  //   add product endpoint can be implemented here
  try {
    const { name, description, price, category, instock } = req.body;

    if (!name || !description || !price) {
      return res.status(400).json({ error: "Please fill all the fields" });
    }

    const newProduct = new Product({
      name,
      description,
      price,
      category,
      instock,
      user: req.user.id,
    });

    const savedProduct = await newProduct.save();
    res.json(savedProduct);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  getAllProducts,
  createProduct,
};
