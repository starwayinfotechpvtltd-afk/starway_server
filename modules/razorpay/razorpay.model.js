const { pool } = require("../../config/db");

// ─── Tax Config ───────────────────────────────────────────────────────────────

const TAX_RATE = 0.05; // 5%

/**
 * Calculate base amount, tax, and total.
 * Razorpay works in PAISE (1 INR = 100 paise) — always integers.
 */
const calculateAmountWithTax = (baseAmountInRupees) => {
  const base  = parseFloat(baseAmountInRupees.toFixed(2));
  const tax   = parseFloat((base * TAX_RATE).toFixed(2));
  const total = parseFloat((base + tax).toFixed(2));
  return {
    base,
    tax,
    total,
    totalPaise: Math.round(total * 100),
  };
};

// ─── Create Order Record ──────────────────────────────────────────────────────

const createOrder = async ({
  razorpay_order_id, amount, currency, receipt,
  customer_name, customer_email, customer_phone, notes,
}) => {
  const sql = `
    INSERT INTO razorpay_orders
      (razorpay_order_id, amount, currency, receipt,
       customer_name, customer_email, customer_phone, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [
    razorpay_order_id,
    amount,
    currency       || "INR",
    receipt        || null,
    customer_name  || null,
    customer_email || null,
    customer_phone || null,
    notes ? JSON.stringify(notes) : null,
  ]);
  return result.insertId;
};

// ─── Update Order After Payment ───────────────────────────────────────────────

const updateOrderAfterPayment = async ({
  razorpay_order_id, razorpay_payment_id, razorpay_signature, status,
}) => {
  const [result] = await pool.execute(
    `UPDATE razorpay_orders
     SET razorpay_payment_id = ?, razorpay_signature = ?, status = ?
     WHERE razorpay_order_id = ?`,
    [razorpay_payment_id, razorpay_signature, status, razorpay_order_id]
  );
  return result.affectedRows > 0;
};

// ─── Get Order by Razorpay Order ID ──────────────────────────────────────────

const getOrderByRazorpayId = async (razorpay_order_id) => {
  const [[row]] = await pool.execute(
    `SELECT * FROM razorpay_orders WHERE razorpay_order_id = ?`,
    [razorpay_order_id]
  );
  return row || null;
};

// ─── Get All Orders (admin) ───────────────────────────────────────────────────

const getAllOrders = async ({ page = 1, limit = 20, status } = {}) => {
  const offset = (page - 1) * limit;
  let whereClause = "";
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
      `SELECT * FROM razorpay_orders ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      dataParams
    ),
    pool.execute(`SELECT COUNT(*) AS total FROM razorpay_orders ${whereClause}`, countParams),
  ]);
  return { rows, total: Number(total) };
};

module.exports = {
  TAX_RATE,
  calculateAmountWithTax,
  createOrder,
  updateOrderAfterPayment,
  getOrderByRazorpayId,
  getAllOrders,
};