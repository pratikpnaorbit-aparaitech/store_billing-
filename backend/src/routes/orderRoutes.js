const express = require("express");
const {
  createOrder,
  getOrders,
} = require("../controllers/orderController");

const router = express.Router();
const requireAuth = require("../middleware/auth");
const requireSubscription = require("../middleware/subscription");

router.use(requireAuth, requireSubscription);

router.route("/").get(getOrders).post(createOrder);

module.exports = router;
