// import { pool } from "../../config/db.js";

// // ─── Tax Config (mirrors Razorpay — same 5% rate) ─────────────────────────────

// export const TAX_RATE = 0.05;

// /**
//  * Calculate base, tax, and total for PayPal.
//  * PayPal uses decimal amounts (e.g. "10.50") — NOT paise.
//  *
//  * @param {number} baseAmountInUSD
//  * @returns {{ base, tax, total }}
//  */
// export const calculateAmountWithTax = (baseAmount) => {
//   const base  = parseFloat(parseFloat(baseAmount).toFixed(2));
//   const tax   = parseFloat((base * TAX_RATE).toFixed(2));
//   const total = parseFloat((base + tax).toFixed(2));
//   return { base, tax, total };
// };

// // ─── Create a PayPal order record ────────────────────────────────────────────

// const createPaypalOrder = async ({
//   paypal_order_id,
//   amount,
//   currency,
//   description,
//   customer_name,
//   customer_email,
// }) => {
//   const sql = `
//     INSERT INTO paypal_orders
//       (paypal_order_id, amount, currency, description, customer_name, customer_email)
//     VALUES (?, ?, ?, ?, ?, ?)
//   `;
//   const [result] = await pool.execute(sql, [
//     paypal_order_id,
//     amount,
//     currency       || "USD",
//     description    || null,
//     customer_name  || null,
//     customer_email || null,
//   ]);
//   return result.insertId;
// };

// // ─── Update order after capture ───────────────────────────────────────────────

// const updatePaypalOrder = async ({ paypal_order_id, paypal_capture_id, payer_id, status }) => {
//   const sql = `
//     UPDATE paypal_orders
//     SET paypal_capture_id = ?,
//         payer_id          = ?,
//         status            = ?
//     WHERE paypal_order_id = ?
//   `;
//   const [result] = await pool.execute(sql, [
//     paypal_capture_id || null,
//     payer_id          || null,
//     status,
//     paypal_order_id,
//   ]);
//   return result.affectedRows > 0;
// };

// // ─── Get order by PayPal order ID ────────────────────────────────────────────

// const getPaypalOrderById = async (paypal_order_id) => {
//   const [[row]] = await pool.execute(
//     `SELECT * FROM paypal_orders WHERE paypal_order_id = ?`,
//     [paypal_order_id]
//   );
//   return row || null;
// };

// // ─── Get all orders (admin) ───────────────────────────────────────────────────

// const getAllPaypalOrders = async ({ page = 1, limit = 20, status } = {}) => {
//   const offset = (page - 1) * limit;

//   let whereClause = "";
//   const countParams = [];
//   const dataParams  = [];

//   if (status) {
//     whereClause = "WHERE status = ?";
//     countParams.push(status);
//     dataParams.push(status);
//   }

//   dataParams.push(limit, offset);

//   const [[rows], [[{ total }]]] = await Promise.all([
//     pool.execute(
//       `SELECT * FROM paypal_orders ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
//       dataParams
//     ),
//     pool.execute(
//       `SELECT COUNT(*) AS total FROM paypal_orders ${whereClause}`,
//       countParams
//     ),
//   ]);

//   return { rows, total: Number(total) };
// };

// export { createPaypalOrder, updatePaypalOrder, getPaypalOrderById, getAllPaypalOrders };
