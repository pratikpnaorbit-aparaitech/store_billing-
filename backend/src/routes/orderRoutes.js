const express = require("express");
const {
  createOrder,
  getOrders,
} = require("../controllers/orderController");

const router = express.Router();

router.route("/").get(getOrders).post(createOrder);

module.exports = router;
