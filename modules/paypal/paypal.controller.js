const fetch = require("node-fetch");
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
const PAYPAL_MODE   = process.env.PAYPAL_MODE;

const PAYPAL_BASE_URL = PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

console.log(`🔧 PayPal mode: ${PAYPAL_MODE} → ${PAYPAL_BASE_URL}`);

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET missing in .env");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAccessToken = async () => {
  try {
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
      console.error("❌ PayPal token error FULL:", data);
      throw new Error(data.error_description || "Token failed");
    }

    return data.access_token;

  } catch (err) {
    console.error("❌ getAccessToken crash:", err.message);
    throw err;
  }
};

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
    console.error("PayPal API error:", data);
    throw new Error(data.message || "PayPal API error");
  }

  return data;
};

// ─── POST /api/paypal/calculate-tax ──────────────────────────────────────────

const calculateTax = (req, res) => {
  const baseAmount = parseFloat(req.body.amount || 0);

  if (baseAmount <= 0) {
    return res.status(400).json({ success: false, message: "amount must be a positive number" });
  }

  const { base, tax, total } = calculateAmountWithTax(baseAmount);

  res.status(200).json({
    success: true,
    data: {
      base_amount: base,
      tax_rate: `${TAX_RATE * 100}%`,
      tax_amount: tax,
      total_amount: total,
      currency: req.body.currency || "USD",
    },
  });
};

// ─── POST /api/paypal/create-order ───────────────────────────────────────────

const createOrder = async (req, res, next) => {
  try {
    const {
      amount,
      currency       = "USD",
      description    = "Starway Web Digital — Payment",
      promo_code     = null,
      customer_name  = "",
      customer_email = "",
    } = req.body;

    const baseAmount = parseFloat(amount || 0);

    if (baseAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    let breakdown, taxTotal, finalTotal, normalDiscount = 0, taxWaived = 0;

    if (promo_code) {
      const { valid, promo, error } = await validatePromoCode({
        code: promo_code,
        baseAmount,
        email: customer_email,
      });

      if (!valid) {
        return res.status(400).json({ success: false, message: error });
      }

      breakdown      = calculatePromoBreakdown(promo, baseAmount);
      taxTotal       = breakdown.tax_payable;
      finalTotal     = breakdown.final_amount;
      normalDiscount = breakdown.normal_discount;
      taxWaived      = breakdown.tax_waived;
    } else {
      const calc = calculateAmountWithTax(baseAmount);
      taxTotal   = calc.tax;
      finalTotal = calc.total;
      breakdown  = calc;
    }

    const totalDiscount = parseFloat((normalDiscount + taxWaived).toFixed(2));

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [{
        description,
        amount: {
          currency_code: currency,
          value: finalTotal.toFixed(2),
        },
      }],
      application_context: {
        return_url: `${process.env.CLIENT_URL}/payment/success`,
        cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
      },
    };

    const paypalOrder = await paypalRequest("/v2/checkout/orders", "POST", orderPayload);

    await createPaypalOrder({
      paypal_order_id: paypalOrder.id,
      amount: finalTotal,
      currency,
      description,
      customer_name,
      customer_email,
      promo_code,
      discount_amount: totalDiscount,
    });

    return res.status(200).json({
      success: true,
      data: {
        order_id: paypalOrder.id,
      },
    });

  } catch (error) {
    next(error);
  }
};

// ─── POST /api/paypal/capture-order ──────────────────────────────────────────

const captureOrder = async (req, res, next) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, message: "order_id required" });
    }

    const capture = await paypalRequest(`/v2/checkout/orders/${order_id}/capture`, "POST");

    const captureUnit = capture.purchase_units?.[0]?.payments?.captures?.[0];

    const isSuccess = captureUnit?.status === "COMPLETED";

    await updatePaypalOrder({
      paypal_order_id: order_id,
      paypal_capture_id: captureUnit?.id,
      payer_id: capture.payer?.payer_id,
      status: isSuccess ? "captured" : "failed",
    });

    return res.status(200).json({
      success: isSuccess,
      data: captureUnit,
    });

  } catch (error) {
    next(error);
  }
};

// ─── POST /api/paypal/webhook ─────────────────────────────────────────────────

const handleWebhook = async (req, res, next) => {
  try {
    const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const resource = event.resource;

    switch (event.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED":
        await updatePaypalOrder({
          paypal_order_id: resource.supplementary_data?.related_ids?.order_id,
          paypal_capture_id: resource.id,
          status: "captured",
        });
        break;

      case "PAYMENT.CAPTURE.DENIED":
        await updatePaypalOrder({
          paypal_order_id: resource.id,
          status: "failed",
        });
        break;
    }

    res.status(200).send("OK");

  } catch (error) {
    next(error);
  }
};

// ─── GET /api/paypal/orders ───────────────────────────────────────────────────

const getOrders = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page) || 1;
    const limit  = parseInt(req.query.limit) || 20;

    const { rows, total } = await getAllPaypalOrders({ page, limit });

    res.json({
      success: true,
      data: rows,
      total,
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  calculateTax,
  createOrder,
  captureOrder,
  handleWebhook,
  getOrders,
};
