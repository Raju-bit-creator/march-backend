// make create product controller and route

const { body } = require("express-validator");
const Product = require("../model/Product");

// controllers/productController.js

const getAllProducts = async (req, res) => {
  try {
    const searchQuery = req.query.searchQuery
      ? {
          name: { $regex: req.query.searchQuery, $options: "i" },
        }
      : {};

    const products = await Product.find(searchQuery);
    res.json(products);
  } catch (error) {}
};
const getMyProducts = async (req, res) => {
  const products = await Product.find({ user: req.user.id });
  res.json(products);
};
const createProduct = [
  body("name")
    .isLength({ min: 3 })
    .withMessage("Name must be atleast 3")
    .trim()
    .escape(),
  body("price").isNumeric().withMessage("Invalid price"),
  body("description")
    .isLength({ min: 5 })
    .withMessage("Description must be atleast 5 characters long"),
  ,
  async (req, res) => {
    //   add product endpoint can be implemented here
    try {
      const { name, description, price, category, instock } = req.body;

      console.log("frontend request", req.body); //

      if (!name || !description || !price) {
        return res.status(400).json({ error: "Please fill all the fields" });
      }

      let image = req.file ? req.file.filename : "";

      const newProduct = new Product({
        name,
        description,
        price,
        category,
        instock,
        image,
        user: req.user.id,
      });

      const savedProduct = await newProduct.save();
      res.json(savedProduct);
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
    }
  },
];

const editMyProduct = async (req, res) => {
  //   edit product endpoint can be implemented here
  const { name, description, price, category, instock } = req.body;

  try {
    const newProduct = {};
    if (name) newProduct.name = name;
    if (description) newProduct.description = description;
    if (price) newProduct.price = price;
    if (category) newProduct.category = category;
    if (instock) newProduct.instock = instock;
    let product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (!product.user || product.user.toString() !== req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: newProduct },
      { returnDocument: "after" },
    );
    res.json(product);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const deleteMyProduct = async (req, res) => {
  //   delete product endpoint can be implemented here
  try {
    let product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (!product.user || product.user.toString() !== req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  getAllProducts,
  createProduct,
  getMyProducts,
  editMyProduct,
  deleteMyProduct,
};
