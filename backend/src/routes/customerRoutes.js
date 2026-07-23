const router = require("express").Router();
const controller = require("../controllers/customerController");
const requireAuth = require("../middleware/auth");
router.use(requireAuth);
router.route("/").get(controller.getCustomers).post(controller.createCustomer);
router.delete("/:id", controller.deleteCustomer);
module.exports = router;
