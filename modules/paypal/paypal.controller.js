// import crypto from "crypto";
// import {
//   calculateAmountWithTax,
//   createPaypalOrder,
//   updatePaypalOrder,
//   getPaypalOrderById,
//   getAllPaypalOrders,
//   TAX_RATE,
// } from "./paypal.model.js";

// // ─── PayPal API Config ────────────────────────────────────────────────────────

// const CLIENT_ID     = process.env.PAYPAL_CLIENT_ID;
// const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
// const PAYPAL_MODE   = process.env.PAYPAL_MODE || "sandbox";

// const PAYPAL_BASE_URL =
//   PAYPAL_MODE === "live"
//     ? "https://api-m.paypal.com"
//     : "https://api-m.sandbox.paypal.com";

// if (!CLIENT_ID || !CLIENT_SECRET) {
//   console.error(
//     "PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing in .env\n" +
//     "Get your keys from: https://developer.paypal.com/dashboard/applications\n" +
//     "Use sandbox credentials for testing"
//   );
// }

// // ─── Helper: Get PayPal Access Token ─────────────────────────────────────────
// // PayPal uses OAuth2 — we exchange client_id + secret for a short-lived token

// const getAccessToken = async () => {
//   const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

//   const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
//     method:  "POST",
//     headers: {
//       "Authorization": `Basic ${credentials}`,
//       "Content-Type":  "application/x-www-form-urlencoded",
//     },
//     body: "grant_type=client_credentials",
//   });

//   if (!res.ok) {
//     const err = await res.json();
//     console.error("❌ PayPal token error:", JSON.stringify(err, null, 2));
//     throw new Error(err.error_description || "Failed to get PayPal access token");
//   }

//   const data = await res.json();
//   return data.access_token;
// };

// // ─── Helper: PayPal API request ──────────────────────────────────────────────

// const paypalRequest = async (endpoint, method = "GET", body = null) => {
//   const token = await getAccessToken();

//   const options = {
//     method,
//     headers: {
//       "Authorization": `Bearer ${token}`,
//       "Content-Type":  "application/json",
//     },
//   };

//   if (body) options.body = JSON.stringify(body);

//   const res  = await fetch(`${PAYPAL_BASE_URL}${endpoint}`, options);
//   const data = await res.json();

//   if (!res.ok) {
//     console.error(`❌ PayPal API error [${method} ${endpoint}]:`, JSON.stringify(data, null, 2));
//     throw Object.assign(new Error(data.message || "PayPal API error"), { paypalError: data });
//   }

//   return data;
// };

// // ─── POST /api/paypal/calculate-tax ──────────────────────────────────────────
// // Preview tax breakdown before creating an order (frontend can call this)

// const calculateTax = (req, res) => {
//   const baseAmount = parseFloat(req.body.amount);

//   if (!baseAmount || isNaN(baseAmount) || baseAmount <= 0) {
//     return res.status(400).json({ success: false, message: "amount must be a positive number" });
//   }

//   const { base, tax, total } = calculateAmountWithTax(baseAmount);
//   const currency = req.body.currency || "USD";

//   res.status(200).json({
//     success: true,
//     data: {
//       base_amount:  base,
//       tax_rate:     `${TAX_RATE * 100}%`,
//       tax_amount:   tax,
//       total_amount: total,
//       currency,
//       note: `${TAX_RATE * 100}% tax has been applied to your order`,
//     },
//   });
// };

// // ─── POST /api/paypal/create-order ───────────────────────────────────────────
// // Creates a PayPal order with 5% tax shown as a separate line item

// const createOrder = async (req, res, next) => {
//   try {
//     if (!CLIENT_ID || !CLIENT_SECRET) {
//       return res.status(500).json({
//         success: false,
//         message: "PayPal credentials are not configured. Check your .env file.",
//       });
//     }

//     const {
//       amount,
//       currency       = "USD",
//       description    = "Starway Web Digital — Payment",
//       customer_name  = "",
//       customer_email = "",
//     } = req.body;

//     const baseAmount = parseFloat(amount);
//     if (!baseAmount || isNaN(baseAmount) || baseAmount <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "amount must be a positive number",
//       });
//     }

//     // ── Calculate 5% tax ─────────────────────────────────────────────────
//     const { base, tax, total } = calculateAmountWithTax(baseAmount);

//     console.log(`💰 Creating PayPal order — Base: ${currency} ${base}  Tax: ${currency} ${tax}  Total: ${currency} ${total}`);

//     // ── Build PayPal order payload ────────────────────────────────────────
//     // PayPal supports itemized breakdown with tax as a separate line
//     const orderPayload = {
//       intent: "CAPTURE",
//       purchase_units: [
//         {
//           description,
//           amount: {
//             currency_code: currency,
//             value:         total.toFixed(2),
//             breakdown: {
//               item_total: {
//                 currency_code: currency,
//                 value:         base.toFixed(2),
//               },
//               tax_total: {
//                 currency_code: currency,
//                 value:         tax.toFixed(2),
//               },
//             },
//           },
//           items: [
//             {
//               name:        description,
//               unit_amount: { currency_code: currency, value: base.toFixed(2) },
//               tax:         { currency_code: currency, value: tax.toFixed(2)  },
//               quantity:    "1",
//               category:    "DIGITAL_GOODS",
//             },
//           ],
//         },
//       ],
//       application_context: {
//         brand_name:          "Starway Web Digital",
//         landing_page:        "NO_PREFERENCE",
//         user_action:         "PAY_NOW",
//         return_url:          `${process.env.CLIENT_URL}/payment/paypal/success`,
//         cancel_url:          `${process.env.CLIENT_URL}/payment/paypal/cancel`,
//         shipping_preference: "NO_SHIPPING",
//       },
//     };

//     // ── Call PayPal API ───────────────────────────────────────────────────
//     const paypalOrder = await paypalRequest("/v2/checkout/orders", "POST", orderPayload);

//     console.log(`✅ PayPal order created: ${paypalOrder.id}`);

//     // ── Save to DB ────────────────────────────────────────────────────────
//     await createPaypalOrder({
//       paypal_order_id: paypalOrder.id,
//       amount:          total,
//       currency,
//       description,
//       customer_name,
//       customer_email,
//     });

//     // Find approval link from PayPal response links array
//     const approveLink = paypalOrder.links?.find((l) => l.rel === "approve")?.href || null;

//     res.status(201).json({
//       success: true,
//       message: "PayPal order created successfully",
//       data: {
//         order_id:     paypalOrder.id,
//         approve_link: approveLink,   // redirect user here for PayPal approval
//         status:       paypalOrder.status,
//         breakdown: {
//           base_amount:  base,
//           tax_rate:     `${TAX_RATE * 100}%`,
//           tax_amount:   tax,
//           total_amount: total,
//           currency,
//         },
//       },
//     });

//   } catch (error) {
//     if (error.paypalError) {
//       return res.status(502).json({
//         success:      false,
//         message:      error.message || "PayPal API error",
//         paypal_error: error.paypalError,
//       });
//     }
//     console.error("❌ Unexpected error in createOrder:", error);
//     next(error);
//   }
// };

// // ─── POST /api/paypal/capture-order ──────────────────────────────────────────
// // Called AFTER user approves on PayPal — captures the payment

// const captureOrder = async (req, res, next) => {
//   try {
//     const { order_id } = req.body;

//     if (!order_id) {
//       return res.status(400).json({ success: false, message: "order_id is required" });
//     }

//     console.log(`💳 Capturing PayPal order: ${order_id}`);

//     // ── Capture with PayPal ───────────────────────────────────────────────
//     const capture = await paypalRequest(
//       `/v2/checkout/orders/${order_id}/capture`,
//       "POST"
//     );

//     const captureUnit   = capture.purchase_units?.[0]?.payments?.captures?.[0];
//     const captureId     = captureUnit?.id     || null;
//     const captureStatus = captureUnit?.status || capture.status;
//     const payerId       = capture.payer?.payer_id || null;

//     const isSuccess = captureStatus === "COMPLETED" || capture.status === "COMPLETED";

//     // ── Update DB ─────────────────────────────────────────────────────────
//     await updatePaypalOrder({
//       paypal_order_id:   order_id,
//       paypal_capture_id: captureId,
//       payer_id:          payerId,
//       status:            isSuccess ? "captured" : "failed",
//     });

//     if (!isSuccess) {
//       return res.status(400).json({
//         success: false,
//         message: `Payment capture failed — status: ${captureStatus}`,
//       });
//     }

//     console.log(`✅ PayPal payment captured: ${captureId}`);

//     const order = await getPaypalOrderById(order_id);

//     res.status(200).json({
//       success: true,
//       message: "Payment captured successfully",
//       data: {
//         order_id,
//         capture_id: captureId,
//         payer_id:   payerId,
//         amount:     order?.amount,
//         currency:   order?.currency,
//         status:     "captured",
//       },
//     });

//   } catch (error) {
//     if (error.paypalError) {
//       return res.status(502).json({
//         success:      false,
//         message:      error.message,
//         paypal_error: error.paypalError,
//       });
//     }
//     console.error("❌ Unexpected error in captureOrder:", error);
//     next(error);
//   }
// };

// // ─── POST /api/paypal/webhook ─────────────────────────────────────────────────
// // PayPal server-to-server webhook events

// const handleWebhook = async (req, res, next) => {
//   try {
//     // PayPal webhook verification uses raw body + headers
//     const rawBody   = req.body;
//     const eventBody = JSON.parse(rawBody.toString());

//     // ── Verify PayPal webhook signature ───────────────────────────────────
//     const transmissionId   = req.headers["paypal-transmission-id"];
//     const transmissionTime = req.headers["paypal-transmission-time"];
//     const certUrl          = req.headers["paypal-cert-url"];
//     const authAlgo         = req.headers["paypal-auth-algo"];
//     const transmissionSig  = req.headers["paypal-transmission-sig"];

//     if (!transmissionId || !transmissionSig) {
//       return res.status(400).json({ success: false, message: "Missing PayPal webhook headers" });
//     }

//     // Verify via PayPal API (most reliable method)
//     try {
//       const token = await getAccessToken();
//       const verifyRes = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
//         method:  "POST",
//         headers: {
//           "Authorization": `Bearer ${token}`,
//           "Content-Type":  "application/json",
//         },
//         body: JSON.stringify({
//           auth_algo:          authAlgo,
//           cert_url:           certUrl,
//           transmission_id:    transmissionId,
//           transmission_sig:   transmissionSig,
//           transmission_time:  transmissionTime,
//           webhook_id:         process.env.PAYPAL_WEBHOOK_ID,
//           webhook_event:      eventBody,
//         }),
//       });

//       const verifyData = await verifyRes.json();
//       if (verifyData.verification_status !== "SUCCESS") {
//         console.error("❌ PayPal webhook verification failed:", verifyData);
//         return res.status(400).json({ success: false, message: "Webhook signature invalid" });
//       }
//     } catch (verifyErr) {
//       console.warn("⚠️  Webhook verification failed (continuing):", verifyErr.message);
//     }

//     const eventType = eventBody.event_type;
//     const resource  = eventBody.resource;

//     console.log(`📦 PayPal webhook: ${eventType}`);

//     switch (eventType) {
//       case "CHECKOUT.ORDER.APPROVED":
//         await updatePaypalOrder({
//           paypal_order_id:   resource.id,
//           paypal_capture_id: null,
//           payer_id:          resource.payer?.payer_id || null,
//           status:            "approved",
//         });
//         break;

//       case "PAYMENT.CAPTURE.COMPLETED":
//         await updatePaypalOrder({
//           paypal_order_id:   resource.supplementary_data?.related_ids?.order_id || resource.id,
//           paypal_capture_id: resource.id,
//           payer_id:          null,
//           status:            "captured",
//         });
//         break;

//       case "PAYMENT.CAPTURE.DENIED":
//       case "PAYMENT.CAPTURE.DECLINED":
//         await updatePaypalOrder({
//           paypal_order_id:   resource.supplementary_data?.related_ids?.order_id || resource.id,
//           paypal_capture_id: resource.id,
//           payer_id:          null,
//           status:            "failed",
//         });
//         break;

//       case "PAYMENT.CAPTURE.REFUNDED":
//         await updatePaypalOrder({
//           paypal_order_id:   resource.supplementary_data?.related_ids?.order_id || resource.id,
//           paypal_capture_id: resource.id,
//           payer_id:          null,
//           status:            "refunded",
//         });
//         break;

//       default:
//         console.log(`ℹ️  Unhandled PayPal webhook event: ${eventType}`);
//     }

//     res.status(200).json({ received: true });
//   } catch (error) {
//     next(error);
//   }
// };

// // ─── GET /api/paypal/orders ───────────────────────────────────────────────────

// const getOrders = async (req, res, next) => {
//   try {
//     const page   = Math.max(1, parseInt(req.query.page)  || 1);
//     const limit  = Math.min(100, parseInt(req.query.limit) || 20);
//     const status = req.query.status || undefined;

//     const validStatuses = ["created", "approved", "captured", "failed", "refunded"];
//     if (status && !validStatuses.includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
//       });
//     }

//     const { rows, total } = await getAllPaypalOrders({ page, limit, status });

//     res.status(200).json({
//       success: true,
//       data:    rows,
//       meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// export { calculateTax, createOrder, captureOrder, handleWebhook, getOrders };
