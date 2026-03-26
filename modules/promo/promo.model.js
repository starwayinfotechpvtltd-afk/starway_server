// import { pool } from "../../config/db.js";

// export const STD_TAX_RATE = 0.05; // 5% — must mirror razorpay + paypal models

// // ─────────────────────────────────────────────────────────────────────────────
// // CORE CALCULATION ENGINE
// //
// // Discount order (correct accounting):
// //   1. Apply normal discount on base amount  → discounted_base
// //   2. Calculate gross tax on discounted_base
// //   3. Apply tax discount (none / partial % / full waiver)
// //   4. final = discounted_base + tax_payable
// //
// // Example — code VIP2024 (25% off + full tax waiver) on ₹1000:
// //   base           = ₹1000
// //   normal discount = ₹250   (25%)
// //   discounted_base = ₹750
// //   gross_tax       = ₹37.50 (5% of 750)
// //   tax_waived      = ₹37.50 (full waiver)
// //   tax_payable     = ₹0
// //   final           = ₹750
// // ─────────────────────────────────────────────────────────────────────────────

// export const calculatePromoBreakdown = (promo, baseAmount) => {
//   const base = parseFloat(parseFloat(baseAmount).toFixed(2));

//   // ── Normal discount ───────────────────────────────────────────────────────
//   let normalDiscount = 0;
//   if (promo.discount_type === "percentage") {
//     normalDiscount = parseFloat((base * (promo.discount_value / 100)).toFixed(2));
//     if (promo.max_discount_cap && normalDiscount > parseFloat(promo.max_discount_cap)) {
//       normalDiscount = parseFloat(promo.max_discount_cap);
//     }
//   } else if (promo.discount_type === "fixed") {
//     normalDiscount = Math.min(parseFloat(promo.discount_value), base);
//     normalDiscount = parseFloat(normalDiscount.toFixed(2));
//   }

//   const discountedBase = parseFloat((base - normalDiscount).toFixed(2));

//   // ── Gross tax on discounted base ──────────────────────────────────────────
//   const grossTax = parseFloat((discountedBase * STD_TAX_RATE).toFixed(2));

//   // ── Tax discount ──────────────────────────────────────────────────────────
//   let taxWaived = 0;
//   if (promo.tax_discount_type === "full") {
//     taxWaived = grossTax;
//   } else if (promo.tax_discount_type === "partial") {
//     taxWaived = parseFloat((grossTax * (promo.tax_discount_value / 100)).toFixed(2));
//   }

//   const taxPayable = parseFloat((grossTax - taxWaived).toFixed(2));
//   const finalAmount = parseFloat((discountedBase + taxPayable).toFixed(2));

//   return {
//     base_amount:         base,
//     normal_discount:     normalDiscount,
//     discounted_base:     discountedBase,
//     gross_tax:           grossTax,
//     tax_rate:            `${STD_TAX_RATE * 100}%`,
//     tax_waived:          taxWaived,
//     tax_payable:         taxPayable,
//     final_amount:        finalAmount,
//     // Paise for Razorpay
//     final_amount_paise:  Math.round(finalAmount * 100),
//     // Flags for frontend display
//     has_normal_discount: normalDiscount > 0,
//     has_tax_discount:    taxWaived > 0,
//     is_tax_free:         promo.tax_discount_type === "full",
//     discount_label:      buildDiscountLabel(promo),
//   };
// };

// const buildDiscountLabel = (promo) => {
//   const parts = [];
//   if (promo.discount_type === "percentage") parts.push(`${promo.discount_value}% off`);
//   if (promo.discount_type === "fixed")      parts.push(`Flat ${promo.discount_value} off`);
//   if (promo.tax_discount_type === "full")   parts.push("Full tax waiver");
//   if (promo.tax_discount_type === "partial") parts.push(`${promo.tax_discount_value}% tax waiver`);
//   return parts.join(" + ") || "Discount applied";
// };

// // ─── Find promo by code (case-insensitive) ────────────────────────────────────

// const findPromoCode = async (code) => {
//   const [[row]] = await pool.execute(
//     `SELECT * FROM promo_codes WHERE code = UPPER(?) LIMIT 1`,
//     [code]
//   );
//   return row || null;
// };

// // ─── Validate — all business rules, no side effects ──────────────────────────

// const validatePromoCode = async ({ code, baseAmount, email }) => {
//   const promo = await findPromoCode(code);
//   if (!promo)           return { valid: false, error: "Invalid promo code" };
//   if (!promo.is_active) return { valid: false, error: "This promo code is no longer active" };

//   if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
//     return { valid: false, error: "This promo code has expired" };
//   }

//   if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
//     return { valid: false, error: "This promo code has reached its usage limit" };
//   }

//   if (promo.min_order_amount && parseFloat(baseAmount) < parseFloat(promo.min_order_amount)) {
//     return {
//       valid: false,
//       error: `Minimum order amount of ${promo.min_order_amount} required for this code`,
//     };
//   }

//   // Per-user limit
//   if (email && promo.max_uses_per_user) {
//     const [[{ userUses }]] = await pool.execute(
//       `SELECT COUNT(*) AS userUses FROM promo_usages WHERE promo_code_id = ? AND email = LOWER(?)`,
//       [promo.id, email]
//     );
//     if (Number(userUses) >= promo.max_uses_per_user) {
//       return { valid: false, error: "You have already used this promo code the maximum allowed times" };
//     }
//   }

//   return { valid: true, promo };
// };

// // ─── Apply — atomic SQL transaction ──────────────────────────────────────────
// // Called INSIDE order creation after the gateway order is created

// const applyPromoCode = async ({ code, baseAmount, email, gateway, order_ref, currency }) => {
//   const connection = await pool.getConnection();
//   try {
//     await connection.beginTransaction();

//     // Re-validate server-side
//     const promo = await findPromoCode(code);
//     if (!promo || !promo.is_active) throw new Error("Invalid or inactive promo code");
//     if (promo.expires_at && new Date(promo.expires_at) < new Date()) throw new Error("Promo code has expired");

//     // Atomic increment — WHERE clause prevents over-use even under concurrency
//     const incrementSql = promo.max_uses !== null
//       ? `UPDATE promo_codes SET current_uses = current_uses + 1 WHERE code = UPPER(?) AND is_active = 1 AND current_uses < ?`
//       : `UPDATE promo_codes SET current_uses = current_uses + 1 WHERE code = UPPER(?) AND is_active = 1`;
//     const incrementParams = promo.max_uses !== null ? [code, promo.max_uses] : [code];

//     const [updateResult] = await connection.execute(incrementSql, incrementParams);
//     if (updateResult.affectedRows === 0) throw new Error("Promo code usage limit reached — try another code");

//     // Per-user check inside transaction
//     if (email && promo.max_uses_per_user) {
//       const [[{ userUses }]] = await connection.execute(
//         `SELECT COUNT(*) AS userUses FROM promo_usages WHERE promo_code_id = ? AND email = LOWER(?)`,
//         [promo.id, email]
//       );
//       if (Number(userUses) >= promo.max_uses_per_user) {
//         await connection.rollback();
//         throw new Error("You have already used this promo code the maximum allowed times");
//       }
//     }

//     const breakdown = calculatePromoBreakdown(promo, baseAmount);

//     // Record usage
//     await connection.execute(
//       `INSERT INTO promo_usages
//          (promo_code_id, email, gateway, order_ref, base_amount, discount_amount, tax_waived, final_amount, currency)
//        VALUES (?, LOWER(?), ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         promo.id, email || "", gateway, order_ref,
//         breakdown.base_amount, breakdown.normal_discount,
//         breakdown.tax_waived,  breakdown.final_amount, currency || "INR",
//       ]
//     );

//     await connection.commit();
//     return { success: true, breakdown, promo };
//   } catch (err) {
//     await connection.rollback();
//     throw err;
//   } finally {
//     connection.release();
//   }
// };

// // ─── Admin CRUD ───────────────────────────────────────────────────────────────

// const createPromoCode = async (data) => {
//   const {
//     code, discount_type = "none", discount_value = 0,
//     min_order_amount = null, max_discount_cap = null,
//     tax_discount_type = "none", tax_discount_value = 0,
//     max_uses = null, max_uses_per_user = 1, expires_at = null,
//   } = data;

//   const [result] = await pool.execute(
//     `INSERT INTO promo_codes
//        (code, discount_type, discount_value, min_order_amount, max_discount_cap,
//         tax_discount_type, tax_discount_value, max_uses, max_uses_per_user, expires_at)
//      VALUES (UPPER(?), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//     [code, discount_type, discount_value, min_order_amount, max_discount_cap,
//      tax_discount_type, tax_discount_value, max_uses, max_uses_per_user, expires_at || null]
//   );
//   return result.insertId;
// };

// const getAllPromoCodes = async ({ page = 1, limit = 20 } = {}) => {
//   const offset = (page - 1) * limit;
//   const [[rows], [[{ total }]]] = await Promise.all([
//     pool.execute(
//       `SELECT p.*,
//               (SELECT COUNT(*) FROM promo_usages WHERE promo_code_id = p.id) AS total_usages
//        FROM promo_codes p ORDER BY created_at DESC LIMIT ? OFFSET ?`,
//       [limit, offset]
//     ),
//     pool.execute(`SELECT COUNT(*) AS total FROM promo_codes`),
//   ]);
//   return { rows, total: Number(total) };
// };

// const togglePromoCode = async (id, is_active) => {
//   const [r] = await pool.execute(`UPDATE promo_codes SET is_active = ? WHERE id = ?`, [is_active ? 1 : 0, id]);
//   return r.affectedRows > 0;
// };

// const deletePromoCode = async (id) => {
//   const [r] = await pool.execute(`DELETE FROM promo_codes WHERE id = ?`, [id]);
//   return r.affectedRows > 0;
// };

// export {
//   findPromoCode, validatePromoCode, applyPromoCode,
//   createPromoCode, getAllPromoCodes, togglePromoCode, deletePromoCode,
// };
