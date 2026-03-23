import { pool } from "../../config/db.js";

// ─── Create a new contact submission ─────────────────────────────────────────

const createContact = async ({
  full_name,
  email,
  phone,
  designation,
  project_overview,
  website_url,
  ip_address,
}) => {
  const sql = `
    INSERT INTO contacts
      (full_name, email, phone, designation, project_overview, website_url, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.execute(sql, [
    full_name,
    email,
    phone,
    designation   || null,
    project_overview || null,
    website_url   || null,
    ip_address    || null,
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
      id, full_name, email, phone, designation,
      project_overview, website_url, status,
      ip_address, created_at, updated_at
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

  return { rows, total: Number(total) };
};

// ─── Get single contact by ID ─────────────────────────────────────────────────

const getContactById = async (id) => {
  const sql = `
    SELECT
      id, full_name, email, phone, designation,
      project_overview, website_url, status,
      ip_address, created_at, updated_at
    FROM contacts
    WHERE id = ?
  `;
  const [[row]] = await pool.execute(sql, [id]);
  return row || null;
};

// ─── Update contact status ────────────────────────────────────────────────────

const updateContactStatus = async (id, status) => {
  const [result] = await pool.execute(
    `UPDATE contacts SET status = ? WHERE id = ?`,
    [status, id]
  );
  return result.affectedRows > 0;
};

// ─── Delete a contact ─────────────────────────────────────────────────────────

const deleteContact = async (id) => {
  const [result] = await pool.execute(
    `DELETE FROM contacts WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
};

export {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
};