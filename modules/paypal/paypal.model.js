const { pool } = require("../../config/db");

// ─────────────────────────────────────────────
// 💰 TAX CONFIG (10%)
// ─────────────────────────────────────────────
const TAX_RATE = 0.10;

const calculateAmountWithTax = (baseAmount) => {
  const base  = parseFloat(parseFloat(baseAmount).toFixed(2));
  const tax   = parseFloat((base * TAX_RATE).toFixed(2));
  const total = parseFloat((base + tax).toFixed(2));

  return { base, tax, total };
};

// ─────────────────────────────────────────────
// 🧾 CREATE ORDER
// ─────────────────────────────────────────────
const createPaypalOrder = async ({
  paypal_order_id,
  amount,
  currency = "USD",
  description = null,
  customer_name = null,
  customer_email = null,
  promo_code = null,
  discount_amount = 0,
}) => {
  const sql = `
    INSERT INTO paypal_orders
    (paypal_order_id, amount, currency, description,
     customer_name, customer_email, promo_code, discount_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.execute(sql, [
    paypal_order_id,
    amount,
    currency,
    description,
    customer_name,
    customer_email,
    promo_code,
    discount_amount,
  ]);

  return result.insertId;
};

// ─────────────────────────────────────────────
// 🔄 UPDATE ORDER (SAFE)
// ─────────────────────────────────────────────
const updatePaypalOrder = async ({
  paypal_order_id,
  paypal_capture_id = null,
  payer_id = null,
  status,
}) => {
  if (!paypal_order_id || !status) {
    throw new Error("Missing required fields for updatePaypalOrder");
  }

  const [result] = await pool.execute(
    `UPDATE paypal_orders
     SET paypal_capture_id = ?,
         payer_id = ?,
         status = ?,
         updated_at = NOW()
     WHERE paypal_order_id = ?`,
    [paypal_capture_id, payer_id, status, paypal_order_id]
  );

  // 🔥 IMPORTANT: detect failed update
  if (result.affectedRows === 0) {
    console.error("⚠️ No PayPal order found to update:", paypal_order_id);
    return false;
  }

  return true;
};

// ─────────────────────────────────────────────
// 🔍 GET ORDER
// ─────────────────────────────────────────────
const getPaypalOrderById = async (paypal_order_id) => {
  const [[row]] = await pool.execute(
    `SELECT * FROM paypal_orders WHERE paypal_order_id = ?`,
    [paypal_order_id]
  );

  return row || null;
};

// ─────────────────────────────────────────────
// 📊 GET ALL ORDERS (ADMIN)
// ─────────────────────────────────────────────
const getAllPaypalOrders = async ({
  page = 1,
  limit = 20,
  status,
} = {}) => {
  const offset = (page - 1) * limit;

  let whereClause = "";
  let params = [];

  if (status) {
    whereClause = "WHERE status = ?";
    params.push(status);
  }

  const [rows] = await pool.execute(
    `SELECT * FROM paypal_orders
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) as total FROM paypal_orders ${whereClause}`,
    params
  );

  return {
    rows,
    total: Number(total),
  };
};

module.exports = {
  TAX_RATE,
  calculateAmountWithTax,
  createPaypalOrder,
  updatePaypalOrder,
  getPaypalOrderById,
  getAllPaypalOrders,
};