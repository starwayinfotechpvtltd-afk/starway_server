// const { pool } = require("../../config/db");

// const createServiceLead = async ({
//   business_name,
//   email,
//   challenge,
//   ip_address,
// }) => {
//   const sql = `
//     INSERT INTO service_leads
//     (business_name, email, challenge, ip_address)
//     VALUES (?, ?, ?, ?)
//   `;

//   const [result] = await pool.execute(sql, [
//     business_name,
//     email,
//     challenge || null,
//     ip_address || null,
//   ]);

//   return result.insertId;
// };

// module.exports = {
//   createServiceLead,
// };