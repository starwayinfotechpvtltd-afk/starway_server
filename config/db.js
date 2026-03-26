import mysql  from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DB_HOST     = process.env.DB_HOST     || "localhost";
const DB_PORT     = Number(process.env.DB_PORT) || 3306;
const DB_USER     = process.env.DB_USER     || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME     = process.env.DB_NAME     || "myapp";

// ✅ Added connectTimeout to prevent hanging on bad credentials/host
const pool = mysql.createPool({
  host:             DB_HOST,
  port:             DB_PORT,
  user:             DB_USER,
  password:         DB_PASSWORD,
  database:         DB_NAME,
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0,
  timezone:         "Z",
  decimalNumbers:   true,
  connectTimeout:   10000,    // ✅ 10s — prevents hanging forever
  enableKeepAlive:  true,     // ✅ keeps idle connections alive on VPS
  keepAliveInitialDelay: 0,
});

// ─── Test connection on startup ───────────────────────────────────────────────

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ MySQL connected → ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    connection.release();
    return true;
  } catch (error) {
    console.error("❌ MySQL connection failed:", error.message);
    // ✅ Return null — do NOT crash the process on DB failure
    return null;
  }
};

export { pool, testConnection };