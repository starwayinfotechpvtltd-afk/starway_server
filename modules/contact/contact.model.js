import { pool } from "../../config/db.js";

// Valid service options — must match the frontend checkbox labels exactly
export const VALID_SERVICES = [
  "E-Commerce / WooCommerce",
  "PPC Advertising",
  "Web Design & Development",
  "Lead Generation",
  "SEO / AEO / GEO",
  "Social Media Marketing",
];

// ─── Create a new lead submission ─────────────────────────────────────────────

const createContact = async ({
  full_name,
  email,
  phone,
  project_overview,
  website_url,
  services,
  ip_address,
}) => {
  const sql = `
    INSERT INTO contacts
      (full_name, email, phone, project_overview, website_url, services, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.execute(sql, [
    full_name,
    email,
    phone        || null,
    project_overview,
    website_url  || null,
    services?.length ? JSON.stringify(services) : null,
    ip_address   || null,
  ]);

  return result.insertId;
};

// ─── Get all contacts with pagination + optional status filter ────────────────

const getAllContacts = async ({ page = 1, limit = 20, status } = {}) => {
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

  const dataSql = `
    SELECT
      id, full_name, email, phone, project_overview,
      website_url, services, status, ip_address,
      created_at, updated_at
    FROM   contacts
    ${whereClause}
    ORDER  BY created_at DESC
    LIMIT  ? OFFSET ?
  `;

  const countSql = `SELECT COUNT(*) AS total FROM contacts ${whereClause}`;

  const [[rows], [[{ total }]]] = await Promise.all([
    pool.execute(dataSql,  dataParams),
    pool.execute(countSql, countParams),
  ]);

  // Parse services JSON back to array for each row
  const parsed = rows.map((row) => ({
    ...row,
    services: row.services
      ? (typeof row.services === "string" ? JSON.parse(row.services) : row.services)
      : [],
  }));

  return { rows: parsed, total: Number(total) };
};

// ─── Get single contact by ID ─────────────────────────────────────────────────

const getContactById = async (id) => {
  const sql = `
    SELECT
      id, full_name, email, phone, project_overview,
      website_url, services, status, ip_address,
      created_at, updated_at
    FROM contacts
    WHERE id = ?
  `;
  const [[row]] = await pool.execute(sql, [id]);
  if (!row) return null;

  return {
    ...row,
    services: row.services
      ? (typeof row.services === "string" ? JSON.parse(row.services) : row.services)
      : [],
  };
};

// ─── Update contact status ────────────────────────────────────────────────────

const updateContactStatus = async (id, status) => {
  const sql     = `UPDATE contacts SET status = ? WHERE id = ?`;
  const [result] = await pool.execute(sql, [status, id]);
  return result.affectedRows > 0;
};

// ─── Delete a contact ─────────────────────────────────────────────────────────

const deleteContact = async (id) => {
  const sql     = `DELETE FROM contacts WHERE id = ?`;
  const [result] = await pool.execute(sql, [id]);
  return result.affectedRows > 0;
};

export {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
};