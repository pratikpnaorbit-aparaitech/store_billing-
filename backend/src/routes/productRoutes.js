const express = require("express");
const {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const router = express.Router();
const requireAuth = require("../middleware/auth");
const requireSubscription = require("../middleware/subscription");

router.use(requireAuth, requireSubscription);

router.route("/").get(getProducts).post(createProduct);
router.route("/:id").put(updateProduct).delete(deleteProduct);

module.exports = router;
