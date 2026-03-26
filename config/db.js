require("dotenv").config();
const mysql = require("mysql2/promise");

const DB_HOST     = process.env.DB_HOST     || "localhost";
const DB_PORT     = Number(process.env.DB_PORT) || 3306;
const DB_USER     = process.env.DB_USER     || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME     = process.env.DB_NAME     || "myapp";

const pool = mysql.createPool({
  host:               DB_HOST,
  port:               DB_PORT,
  user:               DB_USER,
  password:           DB_PASSWORD,
  database:           DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           "Z",
  decimalNumbers:     true,
  connectTimeout:     10000,
  enableKeepAlive:    true,
  keepAliveInitialDelay: 0,
});

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ MySQL connected → ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    connection.release();
    return true;
  } catch (error) {
    console.error("❌ MySQL connection failed:", error.message);
    return null;
  }
};

module.exports = { pool, testConnection };