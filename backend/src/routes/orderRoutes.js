const express = require("express");
const {
  createOrder,
  getOrders,
} = require("../controllers/orderController");

const router = express.Router();
const requireAuth = require("../middleware/auth");

router.use(requireAuth);

router.route("/").get(getOrders).post(createOrder);

module.exports = router;
