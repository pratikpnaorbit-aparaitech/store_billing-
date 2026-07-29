const express = require("express");
const requireAuth = require("../middleware/auth");
const requireSubscription = require("../middleware/subscription");
const {
  applyInventoryImport,
  previewInventoryImport,
  uploadInventoryFile,
} = require("../controllers/inventoryImportController");

const router = express.Router();

router.use(requireAuth, requireSubscription);
router.post("/preview", uploadInventoryFile, previewInventoryImport);
router.post("/apply", applyInventoryImport);

module.exports = router;
