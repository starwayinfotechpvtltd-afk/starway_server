import {
  validatePromoCode,
  applyPromoCode,
  calculatePromoBreakdown,
  createPromoCode,
  getAllPromoCodes,
  togglePromoCode,
  deletePromoCode,
  findPromoCode,
} from "./promo.model.js";

// ─── POST /api/promo/validate ─────────────────────────────────────────────────
// Called live as user types — returns discount preview (no side effects)

const validate = async (req, res, next) => {
  try {
    const { code, amount, email } = req.body;

    if (!code || !amount) {
      return res.status(400).json({ success: false, message: "code and amount are required" });
    }
    const baseAmount = parseFloat(amount);
    if (isNaN(baseAmount) || baseAmount <= 0) {
      return res.status(400).json({ success: false, message: "amount must be a positive number" });
    }
    const { valid, promo, error } = await validatePromoCode({ code, baseAmount, email });
    if (!valid) {
      return res.status(200).json({ success: false, valid: false, message: error });
    }

    const breakdown = calculatePromoBreakdown(promo, baseAmount);

    res.status(200).json({
      success:   true,
      valid:     true,
      message:   `✅ Promo code applied! ${breakdown.discount_label}`,
      data: {
        code:             promo.code,
        discount_label:   breakdown.discount_label,
        breakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/promo/apply ────────────────────────────────────────────────────
// Called internally from Razorpay / PayPal order creation — not a standalone route
// But exposed as a route too for flexibility

const apply = async (req, res, next) => {
  try {
    const { code, amount, email, gateway, order_ref, currency } = req.body;

    if (!code || !amount || !gateway || !order_ref) {
      return res.status(400).json({
        success: false,
        message: "code, amount, gateway, and order_ref are required",
      });
    }

    const result = await applyPromoCode({
      code,
      baseAmount: parseFloat(amount),
      email,
      gateway,
      order_ref,
      currency: currency || "INR",
    });

    res.status(200).json({
      success: true,
      message: "Promo code applied successfully",
      data:    result.breakdown,
    });
  } catch (error) {
    if (error.message?.includes("limit") || error.message?.includes("expired") ||
        error.message?.includes("Invalid")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// ─── POST /api/promo (Admin) ──────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const {
      code, discount_type, discount_value,
      min_order_amount, max_discount_cap,
      tax_discount_type, tax_discount_value,
      max_uses, max_uses_per_user, expires_at,
    } = req.body;

    if (!code) return res.status(400).json({ success: false, message: "code is required" });

    // Validate discount_type
    const validDiscountTypes = ["percentage", "fixed", "none"];
    if (discount_type && !validDiscountTypes.includes(discount_type)) {
      return res.status(400).json({ success: false, message: `discount_type must be: ${validDiscountTypes.join(", ")}` });
    }

    // Validate tax_discount_type
    const validTaxTypes = ["none", "partial", "full"];
    if (tax_discount_type && !validTaxTypes.includes(tax_discount_type)) {
      return res.status(400).json({ success: false, message: `tax_discount_type must be: ${validTaxTypes.join(", ")}` });
    }

    // Must have at least one discount
    const hasNormalDiscount = discount_type && discount_type !== "none" && parseFloat(discount_value || 0) > 0;
    const hasTaxDiscount    = tax_discount_type && tax_discount_type !== "none";
    if (!hasNormalDiscount && !hasTaxDiscount) {
      return res.status(400).json({
        success: false,
        message: "A promo code must have at least a discount_type/value or a tax_discount_type",
      });
    }

    const id = await createPromoCode({
      code, discount_type, discount_value,
      min_order_amount, max_discount_cap,
      tax_discount_type, tax_discount_value,
      max_uses, max_uses_per_user, expires_at,
    });

    res.status(201).json({ success: true, message: "Promo code created", data: { id } });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "A promo code with this name already exists" });
    }
    next(error);
  }
};

// ─── GET /api/promo (Admin) ───────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const { rows, total } = await getAllPromoCodes({ page, limit });
    res.status(200).json({
      success: true,
      data:    rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/promo/:id/toggle (Admin) ──────────────────────────────────────

const toggle = async (req, res, next) => {
  try {
    const { id }       = req.params;
    const { is_active } = req.body;
    if (typeof is_active === "undefined") {
      return res.status(400).json({ success: false, message: "is_active (boolean) is required" });
    }
    const updated = await togglePromoCode(Number(id), is_active);
    if (!updated) return res.status(404).json({ success: false, message: "Promo code not found" });
    res.status(200).json({ success: true, message: `Promo code ${is_active ? "activated" : "deactivated"}` });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/promo/:id (Admin) ────────────────────────────────────────────

const remove = async (req, res, next) => {
  try {
    const deleted = await deletePromoCode(Number(req.params.id));
    if (!deleted) return res.status(404).json({ success: false, message: "Promo code not found" });
    res.status(200).json({ success: true, message: "Promo code deleted" });
  } catch (error) {
    next(error);
  }
};

export { validate, apply, create, list, toggle, remove };
