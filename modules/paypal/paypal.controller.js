const {
  calculateAmountWithTax,
  createPaypalOrder,
  updatePaypalOrder,
  getPaypalOrderById,
  getAllPaypalOrders,
  TAX_RATE,
} = require("./paypal.model");

const {
  validatePromoCode,
  applyPromoCode,
  calculatePromoBreakdown,
} = require("../promo/promo.model");

// ─── PayPal Config ────────────────────────────────────────────────────────────

const CLIENT_ID     = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_MODE   = process.env.PAYPAL_MODE || "sandbox";

const PAYPAL_BASE_URL = PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

console.log(`🔧 PayPal mode: ${PAYPAL_MODE} → ${PAYPAL_BASE_URL}`);

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌  PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET missing in .env");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAccessToken = async () => {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method:  "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type":  "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ PayPal token error:", JSON.stringify(data));
    throw new Error(data.error_description || "Failed to get PayPal access token");
  }

  console.log(`✅ PayPal access token obtained (expires in ${data.expires_in}s)`);
  return data.access_token;
};

const paypalRequest = async (endpoint, method = "GET", body = null) => {
  const token   = await getAccessToken();
  const options = {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
    },
  };
  if (body) options.body = JSON.stringify(body);

  console.log(`📡 PayPal API: ${method} ${PAYPAL_BASE_URL}${endpoint}`);

  const res  = await fetch(`${PAYPAL_BASE_URL}${endpoint}`, options);
  const data = await res.json();

  if (!res.ok) {
    console.error(`❌ PayPal API error [${method} ${endpoint}]:`, JSON.stringify(data, null, 2));
    throw Object.assign(new Error(data.message || "PayPal API error"), { paypalError: data });
  }

  console.log(`✅ PayPal API response [${method} ${endpoint}]: status=${data.status || res.status}`);
  return data;
};

// ─── POST /api/paypal/calculate-tax ──────────────────────────────────────────

const calculateTax = (req, res) => {
  const baseAmount = parseFloat(req.body.amount);
  if (!baseAmount || isNaN(baseAmount) || baseAmount <= 0) {
    return res.status(400).json({ success: false, message: "amount must be a positive number" });
  }
  const { base, tax, total } = calculateAmountWithTax(baseAmount);
  const currency = req.body.currency || "USD";
  res.status(200).json({
    success: true,
    data: { base_amount: base, tax_rate: `${TAX_RATE * 100}%`, tax_amount: tax, total_amount: total, currency },
  });
};

// ─── POST /api/paypal/create-order ───────────────────────────────────────────

const createOrder = async (req, res, next) => {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res.status(500).json({ success: false, message: "PayPal credentials not configured." });
    }

    const {
      amount,
      currency       = "USD",
      description    = "Starway Web Digital — Payment",
      promo_code     = null,
      customer_name  = "",
      customer_email = "",
    } = req.body;

    console.log(`\n📦 Creating PayPal order — Amount: ${amount} ${currency} Promo: ${promo_code || "none"}`);

    const baseAmount = parseFloat(amount);
    if (!baseAmount || isNaN(baseAmount) || baseAmount <= 0) {
      return res.status(400).json({ success: false, message: "amount must be a positive number" });
    }

    // ── Calculate with/without promo ──────────────────────────────────────────
    let breakdown, itemTotal, taxTotal, finalTotal, normalDiscount = 0, taxWaived = 0;

    if (promo_code) {
      const { valid, promo, error } = await validatePromoCode({ code: promo_code, baseAmount, email: customer_email });
      if (!valid) return res.status(400).json({ success: false, message: error || "Invalid promo code" });
      breakdown = calculatePromoBreakdown(promo, baseAmount);
      itemTotal = breakdown.discounted_base;
      taxTotal  = breakdown.tax_payable;
      finalTotal = breakdown.final_amount;
      normalDiscount = breakdown.normal_discount;
      taxWaived = breakdown.tax_waived;
    } else {
      const calc = calculateAmountWithTax(baseAmount);
      itemTotal = calc.base; taxTotal = calc.tax; finalTotal = calc.total;
      breakdown = { base_amount: calc.base, normal_discount: 0, discounted_base: calc.base, gross_tax: calc.tax, tax_waived: 0, tax_payable: calc.tax, final_amount: calc.total, has_normal_discount: false, has_tax_discount: false, is_tax_free: false, discount_label: null };
    }

    console.log(`💰 PayPal breakdown — Base:${baseAmount} Tax:${taxTotal} Final:${finalTotal} ${currency}`);

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [{
        description,
        amount: {
          currency_code: currency,
          value:         finalTotal.toFixed(2),
          breakdown: {
            item_total: { currency_code: currency, value: baseAmount.toFixed(2) },
            tax_total:  { currency_code: currency, value: taxTotal.toFixed(2)   },
            ...(normalDiscount > 0 && { discount: { currency_code: currency, value: normalDiscount.toFixed(2) } }),
          },
        },
        items: [{
          name:        description,
          unit_amount: { currency_code: currency, value: baseAmount.toFixed(2) },
          tax:         { currency_code: currency, value: taxTotal.toFixed(2)   },
          quantity:    "1",
          category:    "DIGITAL_GOODS",
        }],
      }],
      application_context: {
        brand_name:          "Starway Web Digital",
        landing_page:        "NO_PREFERENCE",
        user_action:         "PAY_NOW",
        return_url:          `${process.env.CLIENT_URL}/payment/paypal/success`,
        cancel_url:          `${process.env.CLIENT_URL}/payment/paypal/cancel`,
        shipping_preference: "NO_SHIPPING",
      },
    };

    const paypalOrder = await paypalRequest("/v2/checkout/orders", "POST", orderPayload);
    console.log(`✅ PayPal order created: ${paypalOrder.id} status=${paypalOrder.status}`);

    await createPaypalOrder({
      paypal_order_id: paypalOrder.id,
      amount:          finalTotal,
      currency,
      description,
      customer_name,
      customer_email,
      promo_code:      promo_code || null,
      discount_amount: normalDiscount + taxWaived,
    });

    if (promo_code) {
      try {
        await applyPromoCode({ code: promo_code, baseAmount, email: customer_email, gateway: "paypal", order_ref: paypalOrder.id, currency });
      } catch (promoErr) {
        console.warn("⚠️  Promo usage recording failed:", promoErr.message);
      }
    }

    const approveLink = paypalOrder.links?.find((l) => l.rel === "approve")?.href || null;

    res.status(201).json({
      success: true,
      message: "PayPal order created successfully",
      data: { order_id: paypalOrder.id, approve_link: approveLink, status: paypalOrder.status, breakdown },
    });

  } catch (error) {
    if (error.paypalError) {
      return res.status(502).json({ success: false, message: error.message, paypal_error: error.paypalError });
    }
    next(error);
  }
};

// ─── POST /api/paypal/capture-order ──────────────────────────────────────────

const captureOrder = async (req, res, next) => {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: "order_id is required" });
    }

    console.log(`\n💳 Capturing PayPal order: ${order_id}`);

    // ── First check current order status BEFORE capturing ────────────────────
    const orderDetails = await paypalRequest(`/v2/checkout/orders/${order_id}`, "GET");
    console.log(`📋 Order status before capture: ${orderDetails.status}`);
    console.log(`📋 Full order details:`, JSON.stringify(orderDetails, null, 2));

    // Only capture if order is APPROVED
    if (orderDetails.status !== "APPROVED") {
      console.error(`❌ Cannot capture — order status is ${orderDetails.status}, not APPROVED`);
      return res.status(400).json({
        success: false,
        message: `Cannot capture payment — order status is "${orderDetails.status}". Must be APPROVED first.`,
        order_status: orderDetails.status,
      });
    }

    // ── Capture the payment ───────────────────────────────────────────────────
    const capture = await paypalRequest(`/v2/checkout/orders/${order_id}/capture`, "POST");

    console.log(`📋 Full capture response:`, JSON.stringify(capture, null, 2));

    const captureUnit = capture.purchase_units?.[0]?.payments?.captures?.[0];
    const captureId   = captureUnit?.id   || null;
    const captureStatus = captureUnit?.status || null;
    const payerId     = capture.payer?.payer_id || null;

    console.log(`📋 Capture ID: ${captureId}`);
    console.log(`📋 Capture status: ${captureStatus}`);
    console.log(`📋 Overall capture status: ${capture.status}`);

    const isSuccess = captureStatus === "COMPLETED" || capture.status === "COMPLETED";

    await updatePaypalOrder({
      paypal_order_id:   order_id,
      paypal_capture_id: captureId,
      payer_id:          payerId,
      status:            isSuccess ? "captured" : "failed",
    });

    if (!isSuccess) {
      console.error(`❌ Capture failed — captureStatus: ${captureStatus} overall: ${capture.status}`);
      return res.status(400).json({
        success:        false,
        message:        "Payment capture failed",
        capture_status: captureStatus,
        order_status:   capture.status,
      });
    }

    console.log(`✅ PayPal payment captured successfully: ${captureId}`);
    const order = await getPaypalOrderById(order_id);

    res.status(200).json({
      success: true,
      message: "Payment captured successfully",
      data: {
        order_id,
        capture_id: captureId,
        payer_id:   payerId,
        amount:     order?.amount,
        currency:   order?.currency,
        status:     "captured",
      },
    });

  } catch (error) {
    console.error(`❌ captureOrder error:`, error);
    if (error.paypalError) {
      console.error(`❌ PayPal error details:`, JSON.stringify(error.paypalError, null, 2));
      return res.status(502).json({ success: false, message: error.message, paypal_error: error.paypalError });
    }
    next(error);
  }
};

// ─── POST /api/paypal/webhook ─────────────────────────────────────────────────

const handleWebhook = async (req, res, next) => {
  try {
    const rawBody  = req.body;
    const event    = JSON.parse(rawBody.toString());
    const resource = event.resource;
    console.log(`📦 PayPal webhook: ${event.event_type}`);

    switch (event.event_type) {
      case "CHECKOUT.ORDER.APPROVED":
        await updatePaypalOrder({ paypal_order_id: resource.id, paypal_capture_id: null, payer_id: resource.payer?.payer_id || null, status: "approved" }); break;
      case "PAYMENT.CAPTURE.COMPLETED":
        await updatePaypalOrder({ paypal_order_id: resource.supplementary_data?.related_ids?.order_id || resource.id, paypal_capture_id: resource.id, payer_id: null, status: "captured" }); break;
      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.DECLINED":
        await updatePaypalOrder({ paypal_order_id: resource.supplementary_data?.related_ids?.order_id || resource.id, paypal_capture_id: resource.id, payer_id: null, status: "failed" }); break;
      case "PAYMENT.CAPTURE.REFUNDED":
        await updatePaypalOrder({ paypal_order_id: resource.supplementary_data?.related_ids?.order_id || resource.id, paypal_capture_id: resource.id, payer_id: null, status: "refunded" }); break;
      default:
        console.log(`ℹ️  Unhandled PayPal event: ${event.event_type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) { next(error); }
};

// ─── GET /api/paypal/orders ───────────────────────────────────────────────────

const getOrders = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const status = req.query.status || undefined;
    const validStatuses = ["created", "approved", "captured", "failed", "refunded"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be: ${validStatuses.join(", ")}` });
    }
    const { rows, total } = await getAllPaypalOrders({ page, limit, status });
    res.status(200).json({ success: true, data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

module.exports = { calculateTax, createOrder, captureOrder, handleWebhook, getOrders };