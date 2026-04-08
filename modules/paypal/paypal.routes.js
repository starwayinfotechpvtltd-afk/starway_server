const { Router } = require("express");
const router = Router();

const {
  calculateTax,
  createOrder,
  captureOrder,
  handleWebhook,
  getOrders,
} = require("./paypal.controller");

// ─────────────────────────────────────────────
// 🟢 PUBLIC ROUTES
// ─────────────────────────────────────────────

// Calculate tax
router.post("/calculate-tax", calculateTax);

// Create PayPal order
router.post("/create-order", createOrder);

// Capture payment
router.post("/capture-order", captureOrder);

// Webhook (IMPORTANT: raw body required)
router.post(
  "/webhook",
  require("express").raw({ type: "application/json" }),
  handleWebhook
);

// ─────────────────────────────────────────────
// 🔒 ADMIN ROUTES
// ─────────────────────────────────────────────

router.get("/orders", getOrders);

module.exports = router;