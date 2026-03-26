require("dotenv").config();
const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const morgan       = require("morgan");
const { testConnection } = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const contactRoutes = require("./modules/contact/contact.routes");

// const razorpayRoutes = require("./modules/razorpay/razorpay.routes");
// const paypalRoutes   = require("./modules/paypal/paypal.routes");
// const promoRoutes    = require("./modules/promo/promo.routes");

const app = express();

// ─── Security ───────────────────────────────────────────────────────────────

app.use(helmet());

// ─── CORS ───────────────────────────────────────────────────────────────────

const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

app.use(cors({
  origin:         allowedOrigin,
  methods:        ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials:    allowedOrigin !== "*",
}));

app.options("*", cors());

// ─── Body Parsing ────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  if (req.originalUrl.includes("/webhook")) {
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    express.json({ limit: "10mb" })(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true }));

// ─── Logging ─────────────────────────────────────────────────────────────────

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ─── DB Connection ───────────────────────────────────────────────────────────

testConnection()
  .then(() => console.log("✅ DB connected"))
  .catch((err) => console.error("❌ DB connection error:", err.message));

// ─── Silent Browser Asset Requests ───────────────────────────────────────────

app.get("/favicon.ico",       (req, res) => res.status(204).end());
app.get("/favicon.png",       (req, res) => res.status(204).end());
app.get("/apple-touch-icon*", (req, res) => res.status(204).end());
app.get("/robots.txt",        (req, res) => res.status(204).end());

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.status(200).json({
    success:     true,
    message:     "Starway Web Digital API 🚀",
    version:     "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success:   true,
    message:   "Server is up and running 🟢",
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
  });
});

app.use("/api/contact", contactRoutes);
// app.use("/api/razorpay", razorpayRoutes);
// app.use("/api/paypal",   paypalRoutes);
// app.use("/api/promo",    promoRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────

app.use(errorHandler);

module.exports = app;