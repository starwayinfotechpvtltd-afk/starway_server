const { pool } = require("../../config/db");

// ─── Create Service Lead ─────────────────────────────────────────

const createServiceLead = async ({
  business_name,
  email,
  challenge,
  ip_address,
}) => {
  const sql = `
    INSERT INTO service_leads
    (business_name, email, challenge, ip_address)
    VALUES (?, ?, ?, ?)
  `;

  const [result] = await pool.execute(sql, [
    business_name,
    email,
    challenge || null,
    ip_address || null,
  ]);

  return result.insertId;
};

// ─── Get All Leads (optional for admin) ──────────────────────────

const getAllServiceLeads = async () => {
  const sql = `
    SELECT id, business_name, email, challenge, ip_address, created_at
    FROM service_leads
    ORDER BY created_at DESC
  `;

  const [rows] = await pool.execute(sql);
  return rows;
};

// ─── Get Single Lead ─────────────────────────────────────────────

const getServiceLeadById = async (id) => {
  const sql = `
    SELECT id, business_name, email, challenge, ip_address, created_at
    FROM service_leads
    WHERE id = ?
  `;

  const [[row]] = await pool.execute(sql, [id]);
  return row || null;
};

// ─── Delete Lead (optional) ──────────────────────────────────────

const deleteServiceLead = async (id) => {
  const [result] = await pool.execute(
    `DELETE FROM service_leads WHERE id = ?`,
    [id]
  );

  return result.affectedRows > 0;
};

module.exports = {
  createServiceLead,
  getAllServiceLeads,
  getServiceLeadById,
  deleteServiceLead,
};