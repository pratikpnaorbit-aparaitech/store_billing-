const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const { uploadProductImage } = require("../controllers/uploadController");

router.post("/product-image", requireAuth, uploadProductImage);

module.exports = router;
