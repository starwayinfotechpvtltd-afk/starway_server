// // import crypto                from "crypto";
// // import Razorpay             from "razorpay";
// // import {
// //   calculateAmountWithTax,
// //   createOrder,
// //   updateOrderAfterPayment,
// //   getOrderByRazorpayId,
// //   getAllOrders,
// //   TAX_RATE,
// // } from "./razorpay.model.js";

// // // ─── Razorpay Instance ────────────────────────────────────────────────────────

// // const razorpay = new Razorpay({
// //   key_id:     process.env.RAZORPAY_KEY_ID,
// //   key_secret: process.env.RAZORPAY_KEY_SECRET,
// // });

// // // ─── POST /api/razorpay/calculate-tax ────────────────────────────────────────
// // // Preview tax breakdown before creating an order (used by frontend)

// // const calculateTax = (req, res) => {
// //   const baseAmount = parseFloat(req.body.amount);

// //   if (!baseAmount || isNaN(baseAmount) || baseAmount <= 0) {
// //     return res.status(400).json({
// //       success: false,
// //       message: "amount must be a positive number",
// //     });
// //   }

// //   const breakdown = calculateAmountWithTax(baseAmount);

// //   res.status(200).json({
// //     success: true,
// //     data: {
// //       base_amount:  breakdown.base,
// //       tax_rate:     `${TAX_RATE * 100}%`,
// //       tax_amount:   breakdown.tax,
// //       total_amount: breakdown.total,
// //       currency:     "INR",
// //       note:         `${TAX_RATE * 100}% tax has been applied to your order`,
// //     },
// //   });
// // };

// // // ─── POST /api/razorpay/create-order ─────────────────────────────────────────
// // // Creates a Razorpay order with 5% tax applied

// // const createRazorpayOrder = async (req, res, next) => {
// //   try {
// //     const {
// //       amount,          // base amount in INR (before tax)
// //       currency = "INR",
// //       customer_name,
// //       customer_email,
// //       customer_phone,
// //       notes = {},
// //     } = req.body;

// //     // ── Validate base amount ──
// //     const baseAmount = parseFloat(amount);
// //     if (!baseAmount || isNaN(baseAmount) || baseAmount <= 0) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "amount must be a positive number (in INR)",
// //       });
// //     }

// //     // ── Calculate 5% tax ──
// //     const { base, tax, total, totalPaise } = calculateAmountWithTax(baseAmount);

// //     // ── Generate unique receipt ──
// //     const receipt = `rcpt_${Date.now()}`;

// //     // ── Create order with Razorpay ──
// //     const razorpayOrder = await razorpay.orders.create({
// //       amount:   totalPaise,   // Razorpay needs paise (integer)
// //       currency,
// //       receipt,
// //       notes: {
// //         ...notes,
// //         base_amount: base.toString(),
// //         tax_amount:  tax.toString(),
// //         tax_rate:    `${TAX_RATE * 100}%`,
// //         customer_name:  customer_name  || "",
// //         customer_email: customer_email || "",
// //       },
// //     });

// //     // ── Save to DB ──
// //     await createOrder({
// //       razorpay_order_id: razorpayOrder.id,
// //       amount:            total,
// //       currency,
// //       receipt,
// //       customer_name,
// //       customer_email,
// //       customer_phone,
// //       notes: {
// //         ...notes,
// //         base_amount: base,
// //         tax_amount:  tax,
// //         tax_rate:    TAX_RATE,
// //       },
// //     });

// //     res.status(201).json({
// //       success: true,
// //       message: "Order created successfully",
// //       data: {
// //         // Razorpay checkout needs these
// //         order_id:   razorpayOrder.id,
// //         amount:     razorpayOrder.amount,      // in paise
// //         currency:   razorpayOrder.currency,
// //         key_id:     process.env.RAZORPAY_KEY_ID,

// //         // Tax breakdown to display on frontend
// //         breakdown: {
// //           base_amount:  base,
// //           tax_rate:     `${TAX_RATE * 100}%`,
// //           tax_amount:   tax,
// //           total_amount: total,
// //           currency:     "INR",
// //         },

// //         // Pre-fill customer details in Razorpay modal
// //         prefill: {
// //           name:    customer_name  || "",
// //           email:   customer_email || "",
// //           contact: customer_phone || "",
// //         },
// //       },
// //     });
// //   } catch (error) {
// //     // Razorpay API errors
// //     if (error.error) {
// //       return res.status(502).json({
// //         success: false,
// //         message: error.error.description || "Razorpay API error",
// //       });
// //     }
// //     next(error);
// //   }
// // };

// // // ─── POST /api/razorpay/verify-payment ───────────────────────────────────────
// // // Called by frontend AFTER Razorpay checkout success
// // // Verifies HMAC signature — NEVER trust frontend for payment status

// // const verifyPayment = async (req, res, next) => {
// //   try {
// //     const {
// //       razorpay_order_id,
// //       razorpay_payment_id,
// //       razorpay_signature,
// //     } = req.body;

// //     if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
// //       });
// //     }

// //     // ── Verify HMAC-SHA256 signature ──
// //     const expectedSignature = crypto
// //       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
// //       .update(`${razorpay_order_id}|${razorpay_payment_id}`)
// //       .digest("hex");

// //     const isValid = crypto.timingSafeEqual(
// //       Buffer.from(expectedSignature, "hex"),
// //       Buffer.from(razorpay_signature,  "hex")
// //     );

// //     if (!isValid) {
// //       // Mark as failed in DB
// //       await updateOrderAfterPayment({
// //         razorpay_order_id,
// //         razorpay_payment_id,
// //         razorpay_signature,
// //         status: "failed",
// //       });

// //       return res.status(400).json({
// //         success: false,
// //         message: "Payment verification failed — invalid signature",
// //       });
// //     }

// //     // ── Signature valid — mark as paid ──
// //     await updateOrderAfterPayment({
// //       razorpay_order_id,
// //       razorpay_payment_id,
// //       razorpay_signature,
// //       status: "paid",
// //     });

// //     // Fetch updated order for response
// //     const order = await getOrderByRazorpayId(razorpay_order_id);

// //     res.status(200).json({
// //       success: true,
// //       message: "Payment verified successfully",
// //       data: {
// //         order_id:    razorpay_order_id,
// //         payment_id:  razorpay_payment_id,
// //         amount:      order?.amount,
// //         currency:    order?.currency,
// //         status:      "paid",
// //       },
// //     });
// //   } catch (error) {
// //     next(error);
// //   }
// // };

// // // ─── POST /api/razorpay/webhook ───────────────────────────────────────────────
// // // Razorpay server-to-server webhook (raw body required — set in App.js)

// // const handleWebhook = async (req, res, next) => {
// //   try {
// //     const webhookSecret    = process.env.RAZORPAY_WEBHOOK_SECRET;
// //     const receivedSig      = req.headers["x-razorpay-signature"];
// //     const rawBody          = req.body; // raw buffer (from express.raw in App.js)

// //     // ── Verify webhook signature ──
// //     const expectedSig = crypto
// //       .createHmac("sha256", webhookSecret)
// //       .update(rawBody)
// //       .digest("hex");

// //     if (
// //       !receivedSig ||
// //       !crypto.timingSafeEqual(
// //         Buffer.from(expectedSig,   "utf8"),
// //         Buffer.from(receivedSig,   "utf8")
// //       )
// //     ) {
// //       return res.status(400).json({ success: false, message: "Invalid webhook signature" });
// //     }

// //     const event   = JSON.parse(rawBody.toString());
// //     const payload = event?.payload?.payment?.entity;

// //     console.log(`📦 Razorpay webhook: ${event.event}`);

// //     switch (event.event) {
// //       case "payment.captured":
// //         await updateOrderAfterPayment({
// //           razorpay_order_id:   payload.order_id,
// //           razorpay_payment_id: payload.id,
// //           razorpay_signature:  null,
// //           status:              "paid",
// //         });
// //         break;

// //       case "payment.failed":
// //         await updateOrderAfterPayment({
// //           razorpay_order_id:   payload.order_id,
// //           razorpay_payment_id: payload.id,
// //           razorpay_signature:  null,
// //           status:              "failed",
// //         });
// //         break;

// //       case "refund.created":
// //         await updateOrderAfterPayment({
// //           razorpay_order_id:   payload.order_id,
// //           razorpay_payment_id: payload.payment_id,
// //           razorpay_signature:  null,
// //           status:              "refunded",
// //         });
// //         break;

// //       default:
// //         console.log(`ℹ️  Unhandled webhook event: ${event.event}`);
// //     }

// //     // Always return 200 to Razorpay immediately
// //     res.status(200).json({ received: true });
// //   } catch (error) {
// //     next(error);
// //   }
// // };

// // // ─── GET /api/razorpay/orders ─────────────────────────────────────────────────
// // // List all orders (admin)

// // const getOrders = async (req, res, next) => {
// //   try {
// //     const page   = Math.max(1, parseInt(req.query.page)  || 1);
// //     const limit  = Math.min(100, parseInt(req.query.limit) || 20);
// //     const status = req.query.status || undefined;

// //     const validStatuses = ["created", "paid", "failed", "refunded"];
// //     if (status && !validStatuses.includes(status)) {
// //       return res.status(400).json({
// //         success: false,
// //         message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
// //       });
// //     }

// //     const { rows, total } = await getAllOrders({ page, limit, status });

// //     res.status(200).json({
// //       success: true,
// //       data:    rows,
// //       meta: {
// //         total,
// //         page,
// //         limit,
// //         totalPages: Math.ceil(total / limit),
// //       },
// //     });
// //   } catch (error) {
// //     next(error);
// //   }
// // };

// // export {
// //   calculateTax,
// //   createRazorpayOrder,
// //   verifyPayment,
// //   handleWebhook,
// //   getOrders,
// // };



// //======================== better error handling =========================


// import crypto    from "crypto";
// import Razorpay  from "razorpay";
// import {
//   calculateAmountWithTax,
//   createOrder,
//   updateOrderAfterPayment,
//   getOrderByRazorpayId,
//   getAllOrders,
//   TAX_RATE,
// } from "./razorpay.model.js";

// // ─── Validate keys on startup ─────────────────────────────────────────────────

// const KEY_ID     = process.env.RAZORPAY_KEY_ID;
// const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// if (!KEY_ID || !KEY_SECRET) {
//   console.error(
//     "❌  RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in .env\n" +
//     "    Get your keys from: https://dashboard.razorpay.com/app/keys\n" +
//     "    Test keys start with  rzp_test_\n" +
//     "    Live keys start with  rzp_live_"
//   );
// }

// // ─── Razorpay Instance ────────────────────────────────────────────────────────

// const razorpay = new Razorpay({
//   key_id:     KEY_ID,
//   key_secret: KEY_SECRET,
// });

// // ─── POST /api/razorpay/calculate-tax ────────────────────────────────────────
// // Preview tax breakdown before creating an order (used by frontend)

// const calculateTax = (req, res) => {
//   const baseAmount = parseFloat(req.body.amount);

//   if (!baseAmount || isNaN(baseAmount) || baseAmount <= 0) {
//     return res.status(400).json({
//       success: false,
//       message: "amount must be a positive number",
//     });
//   }

//   const breakdown = calculateAmountWithTax(baseAmount);

//   res.status(200).json({
//     success: true,
//     data: {
//       base_amount:  breakdown.base,
//       tax_rate:     `${TAX_RATE * 100}%`,
//       tax_amount:   breakdown.tax,
//       total_amount: breakdown.total,
//       currency:     "INR",
//       note:         `${TAX_RATE * 100}% tax has been applied to your order`,
//     },
//   });
// };

// // ─── POST /api/razorpay/create-order ─────────────────────────────────────────

// const createRazorpayOrder = async (req, res, next) => {
//   try {
//     // ── Guard: keys must be present ──────────────────────────────────────
//     if (!KEY_ID || !KEY_SECRET) {
//       return res.status(500).json({
//         success: false,
//         message: "Razorpay keys are not configured on the server. Check your .env file.",
//       });
//     }

//     const {
//       amount,
//       currency       = "INR",
//       customer_name  = "",
//       customer_email = "",
//       customer_phone = "",
//       notes          = {},
//     } = req.body;

//     // ── Validate base amount ──────────────────────────────────────────────
//     const baseAmount = parseFloat(amount);
//     if (!baseAmount || isNaN(baseAmount) || baseAmount <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "amount must be a positive number (in INR)",
//       });
//     }

//     // ── Calculate 5% tax ──────────────────────────────────────────────────
//     const { base, tax, total, totalPaise } = calculateAmountWithTax(baseAmount);

//     console.log(`💰 Creating Razorpay order — Base: ₹${base}  Tax: ₹${tax}  Total: ₹${total}  Paise: ${totalPaise}`);

//     // ── Generate unique receipt ───────────────────────────────────────────
//     const receipt = `rcpt_${Date.now()}`;

//     // ── Call Razorpay API ─────────────────────────────────────────────────
//     const razorpayOrder = await razorpay.orders.create({
//       amount:   totalPaise,
//       currency,
//       receipt,
//       notes: {
//         ...notes,
//         base_amount:    base.toString(),
//         tax_amount:     tax.toString(),
//         tax_rate:       `${TAX_RATE * 100}%`,
//         customer_name,
//         customer_email,
//       },
//     });

//     console.log(`✅ Razorpay order created: ${razorpayOrder.id}`);

//     // ── Save to DB ────────────────────────────────────────────────────────
//     await createOrder({
//       razorpay_order_id: razorpayOrder.id,
//       amount:            total,
//       currency,
//       receipt,
//       customer_name,
//       customer_email,
//       customer_phone,
//       notes: { ...notes, base_amount: base, tax_amount: tax, tax_rate: TAX_RATE },
//     });

//     res.status(201).json({
//       success: true,
//       message: "Order created successfully",
//       data: {
//         order_id:  razorpayOrder.id,
//         amount:    razorpayOrder.amount,
//         currency:  razorpayOrder.currency,
//         key_id:    KEY_ID,
//         breakdown: {
//           base_amount:  base,
//           tax_rate:     `${TAX_RATE * 100}%`,
//           tax_amount:   tax,
//           total_amount: total,
//           currency:     "INR",
//         },
//         prefill: {
//           name:    customer_name,
//           email:   customer_email,
//           contact: customer_phone,
//         },
//       },
//     });

//   } catch (error) {
//     // ── Razorpay returns errors in error.error ────────────────────────────
//     if (error.error) {
//       console.error("❌ Razorpay API Error:", JSON.stringify(error.error, null, 2));
//       return res.status(502).json({
//         success:         false,
//         message:         error.error.description || "Razorpay API error",
//         razorpay_code:   error.error.code,
//         razorpay_reason: error.error.reason,
//       });
//     }

//     // ── 401 / auth error ─────────────────────────────────────────────────
//     if (error.statusCode === 401 || error.message?.toLowerCase().includes("unauthorized")) {
//       console.error("❌ Razorpay 401 — Invalid API keys. Check RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env");
//       return res.status(502).json({
//         success: false,
//         message: "Razorpay authentication failed — your API keys are invalid or missing",
//       });
//     }

//     console.error("❌ Unexpected error in createRazorpayOrder:", error);
//     next(error);
//   }
// };

// // ─── POST /api/razorpay/verify-payment ───────────────────────────────────────

// const verifyPayment = async (req, res, next) => {
//   try {
//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//     } = req.body;

//     if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
//       return res.status(400).json({
//         success: false,
//         message: "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
//       });
//     }

//     const expectedSignature = crypto
//       .createHmac("sha256", KEY_SECRET)
//       .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//       .digest("hex");

//     const isValid = crypto.timingSafeEqual(
//       Buffer.from(expectedSignature, "hex"),
//       Buffer.from(razorpay_signature,  "hex")
//     );

//     if (!isValid) {
//       await updateOrderAfterPayment({
//         razorpay_order_id,
//         razorpay_payment_id,
//         razorpay_signature,
//         status: "failed",
//       });
//       return res.status(400).json({
//         success: false,
//         message: "Payment verification failed — invalid signature",
//       });
//     }

//     await updateOrderAfterPayment({
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//       status: "paid",
//     });

//     const order = await getOrderByRazorpayId(razorpay_order_id);

//     res.status(200).json({
//       success: true,
//       message: "Payment verified successfully",
//       data: {
//         order_id:   razorpay_order_id,
//         payment_id: razorpay_payment_id,
//         amount:     order?.amount,
//         currency:   order?.currency,
//         status:     "paid",
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // ─── POST /api/razorpay/webhook ───────────────────────────────────────────────

// const handleWebhook = async (req, res, next) => {
//   try {
//     const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
//     const receivedSig   = req.headers["x-razorpay-signature"];
//     const rawBody       = req.body;

//     const expectedSig = crypto
//       .createHmac("sha256", webhookSecret)
//       .update(rawBody)
//       .digest("hex");

//     if (
//       !receivedSig ||
//       !crypto.timingSafeEqual(
//         Buffer.from(expectedSig,  "utf8"),
//         Buffer.from(receivedSig,  "utf8")
//       )
//     ) {
//       return res.status(400).json({ success: false, message: "Invalid webhook signature" });
//     }

//     const event   = JSON.parse(rawBody.toString());
//     const payload = event?.payload?.payment?.entity;
//     console.log(`📦 Razorpay webhook: ${event.event}`);

//     switch (event.event) {
//       case "payment.captured":
//         await updateOrderAfterPayment({
//           razorpay_order_id:   payload.order_id,
//           razorpay_payment_id: payload.id,
//           razorpay_signature:  null,
//           status:              "paid",
//         });
//         break;
//       case "payment.failed":
//         await updateOrderAfterPayment({
//           razorpay_order_id:   payload.order_id,
//           razorpay_payment_id: payload.id,
//           razorpay_signature:  null,
//           status:              "failed",
//         });
//         break;
//       case "refund.created":
//         await updateOrderAfterPayment({
//           razorpay_order_id:   payload.order_id,
//           razorpay_payment_id: payload.payment_id,
//           razorpay_signature:  null,
//           status:              "refunded",
//         });
//         break;
//       default:
//         console.log(`ℹ️  Unhandled webhook event: ${event.event}`);
//     }

//     res.status(200).json({ received: true });
//   } catch (error) {
//     next(error);
//   }
// };

// // ─── GET /api/razorpay/orders ─────────────────────────────────────────────────

// const getOrders = async (req, res, next) => {
//   try {
//     const page   = Math.max(1, parseInt(req.query.page)  || 1);
//     const limit  = Math.min(100, parseInt(req.query.limit) || 20);
//     const status = req.query.status || undefined;

//     const validStatuses = ["created", "paid", "failed", "refunded"];
//     if (status && !validStatuses.includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
//       });
//     }

//     const { rows, total } = await getAllOrders({ page, limit, status });

//     res.status(200).json({
//       success: true,
//       data:    rows,
//       meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// export { calculateTax, createRazorpayOrder, verifyPayment, handleWebhook, getOrders };

//===========================





import crypto    from "crypto";
import Razorpay  from "razorpay";
import {
  calculateAmountWithTax,
  createOrder,
  updateOrderAfterPayment,
  getOrderByRazorpayId,
  getAllOrders,
  TAX_RATE,
} from "./razorpay.model.js";

// ─── Supported currencies ─────────────────────────────────────────────────────
// NZD is NOT supported by Razorpay international — excluded here

const SUPPORTED_CURRENCIES = ["INR", "USD", "AUD", "CAD", "EUR", "GBP"];

// ─── Validate keys on startup ─────────────────────────────────────────────────

const KEY_ID     = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!KEY_ID || !KEY_SECRET) {
  console.error(
    "❌  RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in .env\n" +
    "    Get keys from: https://dashboard.razorpay.com/app/keys\n" +
    "    Test keys start with rzp_test_"
  );
}

const razorpay = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });

// ─── POST /api/razorpay/calculate-tax ────────────────────────────────────────

const calculateTax = (req, res) => {
  const baseAmount = parseFloat(req.body.amount);
  const currency   = (req.body.currency || "INR").toUpperCase();

  if (!baseAmount || isNaN(baseAmount) || baseAmount <= 0) {
    return res.status(400).json({ success: false, message: "amount must be a positive number" });
  }

  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    return res.status(400).json({
      success: false,
      message: `Currency ${currency} is not supported by Razorpay. Supported: ${SUPPORTED_CURRENCIES.join(", ")}`,
    });
  }

  const { base, tax, total } = calculateAmountWithTax(baseAmount);

  res.status(200).json({
    success: true,
    data: {
      base_amount:  base,
      tax_rate:     `${TAX_RATE * 100}%`,
      tax_amount:   tax,
      total_amount: total,
      currency,
      note: `${TAX_RATE * 100}% tax applied`,
    },
  });
};

// ─── POST /api/razorpay/create-order ─────────────────────────────────────────

const createRazorpayOrder = async (req, res, next) => {
  try {
    if (!KEY_ID || !KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Razorpay keys are not configured. Check your .env file.",
      });
    }

    const {
      amount,
      currency       = "INR",
      customer_name  = "",
      customer_email = "",
      customer_phone = "",
      notes          = {},
    } = req.body;

    const selectedCurrency = currency.toUpperCase();

    // ── Validate currency ─────────────────────────────────────────────────
    if (!SUPPORTED_CURRENCIES.includes(selectedCurrency)) {
      return res.status(400).json({
        success: false,
        message: `Currency ${selectedCurrency} is not supported by Razorpay. Supported: ${SUPPORTED_CURRENCIES.join(", ")}`,
      });
    }

    // ── Validate amount ───────────────────────────────────────────────────
    const baseAmount = parseFloat(amount);
    if (!baseAmount || isNaN(baseAmount) || baseAmount <= 0) {
      return res.status(400).json({ success: false, message: "amount must be a positive number" });
    }

    // ── Calculate 5% tax ──────────────────────────────────────────────────
    const { base, tax, total, totalPaise } = calculateAmountWithTax(baseAmount);

    console.log(`💰 Razorpay order — ${selectedCurrency} Base: ${base}  Tax: ${tax}  Total: ${total}  Paise: ${totalPaise}`);

    const receipt = `rcpt_${Date.now()}`;

    // ── Create Razorpay order ─────────────────────────────────────────────
    const razorpayOrder = await razorpay.orders.create({
      amount:   totalPaise,
      currency: selectedCurrency,
      receipt,
      notes: {
        ...notes,
        base_amount:    base.toString(),
        tax_amount:     tax.toString(),
        tax_rate:       `${TAX_RATE * 100}%`,
        currency:       selectedCurrency,
        customer_name,
        customer_email,
      },
    });

    console.log(`✅ Razorpay order created: ${razorpayOrder.id} (${selectedCurrency})`);

    // ── Save to DB ────────────────────────────────────────────────────────
    await createOrder({
      razorpay_order_id: razorpayOrder.id,
      amount:            total,
      currency:          selectedCurrency,
      receipt,
      customer_name,
      customer_email,
      customer_phone,
      notes: { ...notes, base_amount: base, tax_amount: tax, tax_rate: TAX_RATE },
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        order_id:  razorpayOrder.id,
        amount:    razorpayOrder.amount,
        currency:  razorpayOrder.currency,
        key_id:    KEY_ID,
        breakdown: {
          base_amount:  base,
          tax_rate:     `${TAX_RATE * 100}%`,
          tax_amount:   tax,
          total_amount: total,
          currency:     selectedCurrency,
        },
        prefill: {
          name:    customer_name,
          email:   customer_email,
          contact: customer_phone,
        },
      },
    });

  } catch (error) {
    if (error.error) {
      console.error("❌ Razorpay API Error:", JSON.stringify(error.error, null, 2));
      return res.status(502).json({
        success:         false,
        message:         error.error.description || "Razorpay API error",
        razorpay_code:   error.error.code,
        razorpay_reason: error.error.reason,
      });
    }
    if (error.statusCode === 401 || error.message?.toLowerCase().includes("unauthorized")) {
      console.error("❌ Razorpay 401 — check RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env");
      return res.status(502).json({
        success: false,
        message: "Razorpay authentication failed — your API keys are invalid or missing",
      });
    }
    console.error("❌ Unexpected error in createRazorpayOrder:", error);
    next(error);
  }
};

// ─── POST /api/razorpay/verify-payment ───────────────────────────────────────

const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(razorpay_signature,  "hex")
    );

    if (!isValid) {
      await updateOrderAfterPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature, status: "failed" });
      return res.status(400).json({ success: false, message: "Payment verification failed — invalid signature" });
    }

    await updateOrderAfterPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature, status: "paid" });

    const order = await getOrderByRazorpayId(razorpay_order_id);

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: {
        order_id:   razorpay_order_id,
        payment_id: razorpay_payment_id,
        amount:     order?.amount,
        currency:   order?.currency,
        status:     "paid",
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/razorpay/webhook ───────────────────────────────────────────────

const handleWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const receivedSig   = req.headers["x-razorpay-signature"];
    const rawBody       = req.body;

    const expectedSig = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

    if (!receivedSig || !crypto.timingSafeEqual(
      Buffer.from(expectedSig, "utf8"),
      Buffer.from(receivedSig, "utf8")
    )) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const event   = JSON.parse(rawBody.toString());
    const payload = event?.payload?.payment?.entity;
    console.log(`📦 Razorpay webhook: ${event.event}`);

    switch (event.event) {
      case "payment.captured":
        await updateOrderAfterPayment({ razorpay_order_id: payload.order_id, razorpay_payment_id: payload.id, razorpay_signature: null, status: "paid" });
        break;
      case "payment.failed":
        await updateOrderAfterPayment({ razorpay_order_id: payload.order_id, razorpay_payment_id: payload.id, razorpay_signature: null, status: "failed" });
        break;
      case "refund.created":
        await updateOrderAfterPayment({ razorpay_order_id: payload.order_id, razorpay_payment_id: payload.payment_id, razorpay_signature: null, status: "refunded" });
        break;
      default:
        console.log(`ℹ️  Unhandled webhook event: ${event.event}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/razorpay/orders ─────────────────────────────────────────────────

const getOrders = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const status = req.query.status || undefined;

    const validStatuses = ["created", "paid", "failed", "refunded"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const { rows, total } = await getAllOrders({ page, limit, status });
    res.status(200).json({ success: true, data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

export { calculateTax, createRazorpayOrder, verifyPayment, handleWebhook, getOrders };