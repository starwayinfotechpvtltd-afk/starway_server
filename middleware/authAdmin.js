const crypto = require("crypto");

const SECRET_KEY = process.env.JWT_SECRET || process.env.LOGIN_PASS_ADMIN || "starway_admin_secret_key_2026";

/**
 * Generate a secure signed auth token for Admin
 */
function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

/**
 * Verify signed auth token
 */
function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(`${header}.${body}`)
    .digest("base64url");
  if (signature !== expectedSig) return null;

  try {
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (decoded.exp && decoded.exp < Date.now()) return null;
    return decoded;
  } catch (err) {
    return null;
  }
}

/**
 * Express Middleware to protect admin routes
 */
function authAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized: Missing or invalid token format" });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);

  if (!decoded || decoded.role !== "admin") {
    return res.status(401).json({ success: false, message: "Unauthorized or token expired" });
  }

  req.admin = decoded;
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authAdmin,
};
