const { pool } = require("../../config/db");

// ─── Tax Config ───────────────────────────────────────────────────────────────

const TAX_RATE = 0.05; // 5% — mirrors Razorpay

const calculateAmountWithTax = (baseAmount) => {
  const base  = parseFloat(parseFloat(baseAmount).toFixed(2));
  const tax   = parseFloat((base * TAX_RATE).toFixed(2));
  const total = parseFloat((base + tax).toFixed(2));
  return { base, tax, total };
};

// ─── Create PayPal Order Record ───────────────────────────────────────────────

const createPaypalOrder = async ({
  paypal_order_id,
  amount,
  currency,
  description,
  customer_name,
  customer_email,
  promo_code      = null,   // ← added
  discount_amount = 0,      // ← added
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
    currency        || "USD",
    description     || null,
    customer_name   || null,
    customer_email  || null,
    promo_code      || null,
    discount_amount || 0,
  ]);
  return result.insertId;
};

// ─── Update Order After Capture ───────────────────────────────────────────────

const updatePaypalOrder = async ({ paypal_order_id, paypal_capture_id, payer_id, status }) => {
  const [result] = await pool.execute(
    `UPDATE paypal_orders
     SET paypal_capture_id = ?,
         payer_id          = ?,
         status            = ?
     WHERE paypal_order_id = ?`,
    [paypal_capture_id || null, payer_id || null, status, paypal_order_id]
  );
  return result.affectedRows > 0;
};

// ─── Get Order by PayPal Order ID ─────────────────────────────────────────────

const getPaypalOrderById = async (paypal_order_id) => {
  const [[row]] = await pool.execute(
    `SELECT * FROM paypal_orders WHERE paypal_order_id = ?`,
    [paypal_order_id]
  );
  return row || null;
};

// ─── Get All Orders (admin) ───────────────────────────────────────────────────

const getAllPaypalOrders = async ({ page = 1, limit = 20, status } = {}) => {
  const offset      = (page - 1) * limit;
  let whereClause   = "";
  const countParams = [];
  const dataParams  = [];

  if (status) {
    whereClause = "WHERE status = ?";
    countParams.push(status);
    dataParams.push(status);
  }
  dataParams.push(limit, offset);

  const [[rows], [[{ total }]]] = await Promise.all([
    pool.execute(
      `SELECT * FROM paypal_orders ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      dataParams
    ),
    pool.execute(
      `SELECT COUNT(*) AS total FROM paypal_orders ${whereClause}`,
      countParams
    ),
  ]);

  return { rows, total: Number(total) };
};

module.exports = {
  TAX_RATE,
  calculateAmountWithTax,
  createPaypalOrder,
  updatePaypalOrder,
  getPaypalOrderById,
  getAllPaypalOrders,
};