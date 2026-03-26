// import { Router } from "express";
// import {
//   calculateTax,
//   createOrder,
//   captureOrder,
//   handleWebhook,
//   getOrders,
// } from "./paypal.controller.js";

// const router = Router();

// // ─── Public Routes ────────────────────────────────────────────────────────────

// // POST /api/paypal/calculate-tax
// // Body: { amount: 100, currency: "USD" }
// // Returns live tax breakdown before checkout
// router.post("/calculate-tax", calculateTax);

// // POST /api/paypal/create-order
// // Body: { amount, currency?, description?, customer_name?, customer_email? }
// // Creates PayPal order with 5% tax as separate line item
// router.post("/create-order", createOrder);

// // POST /api/paypal/capture-order
// // Body: { order_id }
// // Called after user approves on PayPal — captures the payment
// router.post("/capture-order", captureOrder);

// // POST /api/paypal/webhook
// // PayPal server-to-server event notifications (raw body)
// router.post("/webhook", handleWebhook);

// // ─── Admin Routes ─────────────────────────────────────────────────────────────
// // TODO: protect with auth middleware before going live

// // GET /api/paypal/orders?page=1&limit=20&status=captured
// router.get("/orders", getOrders);

// export default router;
