const router = require("express").Router();
const controller = require("../controllers/adminController");
const requireAdmin = require("../middleware/admin");

router.post("/login", controller.login);
router.get("/dashboard", requireAdmin, controller.dashboard);

module.exports = router;
