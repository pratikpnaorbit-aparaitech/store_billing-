const router = require("express").Router();
const controller = require("../controllers/subscriptionController");
const requireAuth = require("../middleware/auth");

router.get("/status", requireAuth, controller.getStatus);
router.post("/checkout-session", requireAuth, controller.createCheckoutSession);
router.get("/checkout/:token", controller.showCheckout);
router.post("/checkout/verify", controller.verifyCheckout);

module.exports = router;
