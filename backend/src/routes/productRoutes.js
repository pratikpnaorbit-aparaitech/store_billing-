const express = require("express");
const {
  createProduct,
  getProducts,
  lookupProduct,
  adjustStock,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const router = express.Router();
const requireAuth = require("../middleware/auth");
const requireSubscription = require("../middleware/subscription");

router.use(requireAuth, requireSubscription);

router.route("/").get(getProducts).post(createProduct);
router.get("/lookup/:barcode", lookupProduct);
router.patch("/:id/stock", adjustStock);
router.route("/:id").put(updateProduct).delete(deleteProduct);

module.exports = router;
