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
  if (!res.ok) {
    const err = await res.json();
    console.error("❌ PayPal token error:", JSON.stringify(err));
    throw new Error(err.error_description || "Failed to get PayPal access token");
  }
  return (await res.json()).access_token;
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

  const res  = await fetch(`${PAYPAL_BASE_URL}${endpoint}`, options);
  const data = await res.json();

  if (!res.ok) {
    console.error(`❌ PayPal API error [${method} ${endpoint}]:`, JSON.stringify(data));
    throw Object.assign(new Error(data.message || "PayPal API error"), { paypalError: data });
  }
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
    data: {
      base_amount:  base,
      tax_rate:     `${TAX_RATE * 100}%`,
      tax_amount:   tax,
      total_amount: total,
      currency,
    },
  });
};

// ─── POST /api/paypal/create-order ───────────────────────────────────────────

const createOrder = async (req, res, next) => {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "PayPal credentials not configured. Check your .env file.",
      });
    }

    const {
      amount,
      currency       = "USD",
      description    = "Starway Web Digital — Payment",
      promo_code     = null,
      customer_name  = "",
      customer_email = "",
    } = req.body;

    const baseAmount = parseFloat(amount);
    if (!baseAmount || isNaN(baseAmount) || baseAmount <= 0) {
      return res.status(400).json({ success: false, message: "amount must be a positive number" });
    }

    // ── Calculate amounts — with or without promo ─────────────────────────────
    let breakdown, itemTotal, taxTotal, finalTotal, normalDiscount = 0, taxWaived = 0;

    if (promo_code) {
      const { valid, promo, error } = await validatePromoCode({
        code: promo_code, baseAmount, email: customer_email,
      });
      if (!valid) {
        return res.status(400).json({ success: false, message: error || "Invalid promo code" });
      }
      breakdown      = calculatePromoBreakdown(promo, baseAmount);
      itemTotal      = breakdown.discounted_base;
      taxTotal       = breakdown.tax_payable;
      finalTotal     = breakdown.final_amount;
      normalDiscount = breakdown.normal_discount;
      taxWaived      = breakdown.tax_waived;
    } else {
      const calc = calculateAmountWithTax(baseAmount);
      itemTotal  = calc.base;
      taxTotal   = calc.tax;
      finalTotal = calc.total;
      breakdown  = {
        base_amount:         calc.base,
        normal_discount:     0,
        discounted_base:     calc.base,
        gross_tax:           calc.tax,
        tax_waived:          0,
        tax_payable:         calc.tax,
        final_amount:        calc.total,
        has_normal_discount: false,
        has_tax_discount:    false,
        is_tax_free:         false,
        discount_label:      null,
      };
    }

    console.log(
      `💰 PayPal order — ${currency} Base:${baseAmount}` +
      (promo_code ? ` Promo:${promo_code} Discount:${normalDiscount}` : "") +
      ` Final:${finalTotal}`
    );

    // ── Build PayPal payload ──────────────────────────────────────────────────
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          description,
          amount: {
            currency_code: currency,
            value:         finalTotal.toFixed(2),
            breakdown: {
              item_total: { currency_code: currency, value: baseAmount.toFixed(2) },
              tax_total:  { currency_code: currency, value: taxTotal.toFixed(2)   },
              ...(normalDiscount > 0 && {
                discount: { currency_code: currency, value: normalDiscount.toFixed(2) },
              }),
            },
          },
          items: [
            {
              name:        description,
              unit_amount: { currency_code: currency, value: baseAmount.toFixed(2) },
              tax:         { currency_code: currency, value: taxTotal.toFixed(2)   },
              quantity:    "1",
              category:    "DIGITAL_GOODS",
            },
          ],
        },
      ],
      application_context: {
        brand_name:          "Starway Web Digital",
        landing_page:        "NO_PREFERENCE",
        user_action:         "PAY_NOW",
        return_url:          `${process.env.CLIENT_URL}/payment/paypal/success`,
        cancel_url:          `${process.env.CLIENT_URL}/payment/paypal/cancel`,
        shipping_preference: "NO_SHIPPING",
      },
    };

    // ── Call PayPal API ───────────────────────────────────────────────────────
    const paypalOrder = await paypalRequest("/v2/checkout/orders", "POST", orderPayload);
    console.log(`✅ PayPal order created: ${paypalOrder.id}${promo_code ? ` (promo: ${promo_code})` : ""}`);

    // ── Save to DB ────────────────────────────────────────────────────────────
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

    // ── Record promo usage ────────────────────────────────────────────────────
    if (promo_code) {
      try {
        await applyPromoCode({
          code:       promo_code,
          baseAmount,
          email:      customer_email,
          gateway:    "paypal",
          order_ref:  paypalOrder.id,
          currency,
        });
      } catch (promoErr) {
        console.warn("⚠️  Promo usage recording failed (order still created):", promoErr.message);
      }
    }

    const approveLink = paypalOrder.links?.find((l) => l.rel === "approve")?.href || null;

    res.status(201).json({
      success: true,
      message: "PayPal order created successfully",
      data: {
        order_id:     paypalOrder.id,
        approve_link: approveLink,
        status:       paypalOrder.status,
        breakdown,
      },
    });

  } catch (error) {
    if (error.paypalError) {
      return res.status(502).json({
        success:      false,
        message:      error.message,
        paypal_error: error.paypalError,
      });
    }
    console.error("❌ Unexpected error in createOrder:", error);
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

    console.log(`💳 Capturing PayPal order: ${order_id}`);
    const capture = await paypalRequest(`/v2/checkout/orders/${order_id}/capture`, "POST");

    const captureUnit = capture.purchase_units?.[0]?.payments?.captures?.[0];
    const captureId   = captureUnit?.id || null;
    const isSuccess   = captureUnit?.status === "COMPLETED" || capture.status === "COMPLETED";

    await updatePaypalOrder({
      paypal_order_id:   order_id,
      paypal_capture_id: captureId,
      payer_id:          capture.payer?.payer_id || null,
      status:            isSuccess ? "captured" : "failed",
    });

    if (!isSuccess) {
      return res.status(400).json({ success: false, message: "Payment capture failed" });
    }

    console.log(`✅ PayPal payment captured: ${captureId}`);
    const order = await getPaypalOrderById(order_id);

    res.status(200).json({
      success: true,
      message: "Payment captured successfully",
      data: {
        order_id,
        capture_id: captureId,
        payer_id:   capture.payer?.payer_id || null,
        amount:     order?.amount,
        currency:   order?.currency,
        status:     "captured",
      },
    });
  } catch (error) {
    if (error.paypalError) {
      return res.status(502).json({
        success: false, message: error.message, paypal_error: error.paypalError,
      });
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
        await updatePaypalOrder({
          paypal_order_id:   resource.id,
          paypal_capture_id: null,
          payer_id:          resource.payer?.payer_id || null,
          status:            "approved",
        });
        break;
      case "PAYMENT.CAPTURE.COMPLETED":
        await updatePaypalOrder({
          paypal_order_id:   resource.supplementary_data?.related_ids?.order_id || resource.id,
          paypal_capture_id: resource.id,
          payer_id:          null,
          status:            "captured",
        });
        break;
      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.DECLINED":
        await updatePaypalOrder({
          paypal_order_id:   resource.supplementary_data?.related_ids?.order_id || resource.id,
          paypal_capture_id: resource.id,
          payer_id:          null,
          status:            "failed",
        });
        break;
      case "PAYMENT.CAPTURE.REFUNDED":
        await updatePaypalOrder({
          paypal_order_id:   resource.supplementary_data?.related_ids?.order_id || resource.id,
          paypal_capture_id: resource.id,
          payer_id:          null,
          status:            "refunded",
        });
        break;
      default:
        console.log(`ℹ️  Unhandled PayPal event: ${event.event_type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/paypal/orders ───────────────────────────────────────────────────

const getOrders = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const status = req.query.status || undefined;

    const validStatuses = ["created", "approved", "captured", "failed", "refunded"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const { rows, total } = await getAllPaypalOrders({ page, limit, status });
    res.status(200).json({
      success: true,
      data:    rows,
      meta:    { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { calculateTax, createOrder, captureOrder, handleWebhook, getOrders };