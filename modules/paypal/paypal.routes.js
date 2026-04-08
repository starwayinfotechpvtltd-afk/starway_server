// const { Router } = require("express");
// const router = Router();

// const {
//   calculateTax,
//   createOrder,
//   captureOrder,
//   handleWebhook,
//   getOrders,
// } = require("./paypal.controller");

// // ─────────────────────────────────────────────
// // 🟢 PUBLIC ROUTES
// // ─────────────────────────────────────────────

// // Calculate tax
// router.post("/calculate-tax", calculateTax);

// // Create PayPal order
// router.post("/create-order", createOrder);

// // Capture payment
// router.post("/capture-order", captureOrder);

// // Webhook (IMPORTANT: raw body required)
// router.post(
//   "/webhook",
//   require("express").raw({ type: "application/json" }),
//   handleWebhook
// );

// // ─────────────────────────────────────────────
// // 🔒 ADMIN ROUTES
// // ─────────────────────────────────────────────

// router.get("/orders", getOrders);

// module.exports = router;




const { Router } = require("express");
const router = Router();

// ✅ Only import what actually exists in controller
const {
  createOrder,
  captureOrder,
} = require("./paypal.controller");

// ─────────────────────────────────────────────
// 🟢 PUBLIC ROUTES (PAYPAL)
// ─────────────────────────────────────────────

// Create PayPal Order
// POST /api/paypal/create-order
router.post("/create-order", createOrder);

// Capture PayPal Payment
// POST /api/paypal/capture-order
router.post("/capture-order", captureOrder);

module.exports = router;