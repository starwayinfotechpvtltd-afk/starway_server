import { Router } from "express";
import {
  calculateTax,
  createRazorpayOrder,
  verifyPayment,
  handleWebhook,
  getOrders,
} from "./razorpay.controller.js";

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────

// POST /api/razorpay/calculate-tax
// Body: { amount: 1000 }
// Returns tax breakdown before checkout
router.post("/calculate-tax", calculateTax);

// POST /api/razorpay/create-order
// Body: { amount, currency?, customer_name?, customer_email?, customer_phone?, notes? }
// Creates Razorpay order with 5% tax applied
router.post("/create-order", createRazorpayOrder);

// POST /api/razorpay/verify-payment
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Called by frontend after successful Razorpay checkout
router.post("/verify-payment", verifyPayment);

// POST /api/razorpay/webhook
// Called by Razorpay servers (raw body — handled in App.js middleware)
router.post("/webhook", handleWebhook);

// ─── Admin Routes ─────────────────────────────────────────────────────────────
// TODO: protect with auth middleware before going live

// GET /api/razorpay/orders?page=1&limit=20&status=paid
router.get("/orders", getOrders);

export default router;