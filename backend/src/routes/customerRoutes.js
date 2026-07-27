const router = require("express").Router();
const controller = require("../controllers/customerController");
const requireAuth = require("../middleware/auth");
const requireSubscription = require("../middleware/subscription");
router.use(requireAuth, requireSubscription);
router.route("/").get(controller.getCustomers).post(controller.createCustomer);
router.delete("/:id", controller.deleteCustomer);
module.exports = router;
