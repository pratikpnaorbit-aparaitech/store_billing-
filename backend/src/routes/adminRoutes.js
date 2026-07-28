const router = require("express").Router();
const controller = require("../controllers/adminController");
const requireAdmin = require("../middleware/admin");

router.post("/login", controller.login);
router.get("/dashboard", requireAdmin, controller.dashboard);
router.get("/plans", requireAdmin, controller.plans);
router.patch("/plans/:durationMonths", requireAdmin, controller.updatePlan);
router.patch("/users/:userId/trial", requireAdmin, controller.extendTrial);
router.patch("/users/:userId/access", requireAdmin, controller.setAccountAccess);
router.post("/users/:userId/force-logout", requireAdmin, controller.forceLogout);

module.exports = router;
