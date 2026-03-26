const { Router } = require("express");
const {
  calculateTax,
  createRazorpayOrder,
  verifyPayment,
  handleWebhook,
  getOrders,
} = require("./razorpay.controller");

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────

// POST /api/razorpay/calculate-tax   — { amount, currency? }
router.post("/calculate-tax",  calculateTax);

// POST /api/razorpay/create-order    — { amount, currency?, customer_name?, customer_email?, customer_phone?, notes? }
router.post("/create-order",   createRazorpayOrder);

// POST /api/razorpay/verify-payment  — { razorpay_order_id, razorpay_payment_id, razorpay_signature }
router.post("/verify-payment", verifyPayment);

// POST /api/razorpay/webhook         — raw body (handled in App.js middleware)
router.post("/webhook", handleWebhook);

// ─── Admin (add auth middleware before going live) ────────────────────────────

// GET /api/razorpay/orders?page=1&limit=20&status=paid
router.get("/orders", getOrders);

module.exports = router;