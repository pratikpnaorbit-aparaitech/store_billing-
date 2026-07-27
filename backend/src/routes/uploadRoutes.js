const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const requireSubscription = require("../middleware/subscription");
const { uploadProductImage } = require("../controllers/uploadController");

router.post("/product-image", requireAuth, requireSubscription, uploadProductImage);

module.exports = router;
