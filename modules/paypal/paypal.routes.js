const { Router } = require("express");
const {
  calculateTax,
  createOrder,
  captureOrder,
  handleWebhook,
  getOrders,
} = require("./paypal.controller");

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────

// POST /api/paypal/calculate-tax   — { amount, currency? }
router.post("/calculate-tax",  calculateTax);

// POST /api/paypal/create-order    — { amount, currency?, description?, promo_code?, customer_name?, customer_email? }
router.post("/create-order",   createOrder);

// POST /api/paypal/capture-order   — { order_id }
router.post("/capture-order",  captureOrder);

// POST /api/paypal/webhook         — raw body (PayPal server-to-server)
router.post("/webhook",        handleWebhook);

// ─── Admin ────────────────────────────────────────────────────────────────────

// GET /api/paypal/orders?page=1&limit=20&status=captured
router.get("/orders", getOrders);

module.exports = router;