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

const CLIENT_ID     = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_MODE   = process.env.PAYPAL_MODE || "sandbox";

const PAYPAL_BASE_URL = PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

// ─────────────────────────────────────────────
// 🔐 ACCESS TOKEN
// ─────────────────────────────────────────────
const getAccessToken = async () => {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error("PayPal auth failed");
  }

  return data.access_token;
};

// ─────────────────────────────────────────────
// 🔁 PAYPAL REQUEST
// ─────────────────────────────────────────────
const paypalRequest = async (endpoint, method = "GET", body = null) => {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("PayPal ERROR:", data);
    throw new Error(data.message || "PayPal API error");
  }

  return data;
};

// ─────────────────────────────────────────────
// 🧾 CREATE ORDER
// ─────────────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const {
      amount,
      currency = "USD",
      description = "Payment",
      promo_code = null,
      customer_name = "",
      customer_email = "",
    } = req.body;

    const baseAmount = parseFloat(amount);
    if (!baseAmount || baseAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    let breakdown, finalTotal, taxTotal, normalDiscount = 0, taxWaived = 0;

    if (promo_code) {
      const { valid, promo } = await validatePromoCode({
        code: promo_code,
        baseAmount,
        email: customer_email,
      });

      if (!valid) {
        return res.status(400).json({ success: false, message: "Invalid promo" });
      }

      breakdown      = calculatePromoBreakdown(promo, baseAmount);
      finalTotal     = breakdown.final_amount;
      taxTotal       = breakdown.tax_payable;
      normalDiscount = breakdown.normal_discount;
      taxWaived      = breakdown.tax_waived;
    } else {
      const calc = calculateAmountWithTax(baseAmount);
      finalTotal = calc.total;
      taxTotal   = calc.tax;

      breakdown = {
        base_amount: calc.base,
        tax_payable: calc.tax,
        final_amount: calc.total,
      };
    }

    const totalDiscount = normalDiscount + taxWaived;

    const order = await paypalRequest("/v2/checkout/orders", "POST", {
      intent: "CAPTURE",
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: finalTotal.toFixed(2),
          breakdown: {
            item_total: { currency_code: currency, value: baseAmount.toFixed(2) },
            tax_total:  { currency_code: currency, value: taxTotal.toFixed(2) },
            ...(totalDiscount > 0 && {
              discount: { currency_code: currency, value: totalDiscount.toFixed(2) }
            })
          }
        }
      }]
    });

    await createPaypalOrder({
      paypal_order_id: order.id,
      amount: finalTotal,
      currency,
      description,
      customer_name,
      customer_email,
      promo_code,
      discount_amount: totalDiscount,
    });

    res.json({
      success: true,
      data: {
        order_id: order.id,
        status: order.status,
        breakdown,
      }
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// 💰 CAPTURE ORDER (🔥 FIXED CORE)
// ─────────────────────────────────────────────
const captureOrder = async (req, res, next) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, message: "order_id required" });
    }

    console.log("Capturing:", order_id);

    // ✅ STEP 1: GET ORDER STATUS
    const orderDetails = await paypalRequest(`/v2/checkout/orders/${order_id}`);

    if (orderDetails.status !== "APPROVED") {
      return res.status(400).json({
        success: false,
        message: `Order not approved (${orderDetails.status})`,
      });
    }

    // ✅ STEP 2: CAPTURE
    const capture = await paypalRequest(`/v2/checkout/orders/${order_id}/capture`, "POST");

    console.log("CAPTURE RESPONSE:", JSON.stringify(capture, null, 2));

    const captureData =
      capture.purchase_units?.[0]?.payments?.captures?.[0];

    // 🔥 STRICT VALIDATION (NO FAKE SUCCESS)
    const isCompleted =
      capture.status === "COMPLETED" &&
      captureData?.status === "COMPLETED";

    await updatePaypalOrder({
      paypal_order_id: order_id,
      paypal_capture_id: captureData?.id || null,
      payer_id: capture.payer?.payer_id || null,
      status: isCompleted ? "captured" : "failed",
    });

    if (!isCompleted) {
      return res.status(400).json({
        success: false,
        message: "Payment not completed",
        debug: {
          order_status: capture.status,
          capture_status: captureData?.status,
        }
      });
    }

    const dbOrder = await getPaypalOrderById(order_id);

    return res.json({
      success: true,
      data: {
        status: "captured",
        capture_id: captureData.id,
        amount: dbOrder?.amount,
        currency: dbOrder?.currency,
      }
    });

  } catch (err) {
    console.error("CAPTURE ERROR:", err.message);
    next(err);
  }
};

// ─────────────────────────────────────────────
// 📦 EXPORTS
// ─────────────────────────────────────────────
module.exports = {
  createOrder,
  captureOrder,
};