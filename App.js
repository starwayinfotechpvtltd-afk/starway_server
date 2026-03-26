import express from "express";
import cors    from "cors";
import helmet  from "helmet";
import morgan  from "morgan";
import dotenv  from "dotenv";

import { testConnection } from "./config/db.js";
import errorHandler       from "./middleware/errorHandler.js";
import contactRoutes      from "./modules/contact/contact.routes.js";

// import razorpayRoutes from "./modules/razorpay/razorpay.routes.js";
// import paypalRoutes   from "./modules/paypal/paypal.routes.js";
// import promoRoutes    from "./modules/promo/promo.routes.js";

dotenv.config();

const app = express();

// ─── Security ───────────────────────────────────────────────────────────────

app.use(helmet());

// ─── CORS ───────────────────────────────────────────────────────────────────
// ✅ FIX: credentials:true cannot be combined with origin:"*"
//    Use specific origin in production via ALLOWED_ORIGIN env var

const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

app.use(
  cors({
    origin:         allowedOrigin,
    methods:        ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials:    allowedOrigin !== "*", // ✅ only true when origin is specific
  })
);

// ✅ Handle preflight requests explicitly
app.options("*", cors());

// ─── Body Parsing ────────────────────────────────────────────────────────────
// Raw body for webhooks, JSON for everything else

app.use((req, res, next) => {
  if (req.originalUrl.includes("/webhook")) {
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    express.json({ limit: "10mb" })(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true }));

// ─── Logging ─────────────────────────────────────────────────────────────────
// Use "combined" in production for more complete logs

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ─── DB Connection (NON-BLOCKING) ────────────────────────────────────────────

testConnection()
  .then(() => console.log("✅ DB connected"))
  .catch((err) => console.error("❌ DB connection error:", err.message));

// ─── Silent Browser Asset Requests ───────────────────────────────────────────

app.get("/favicon.ico",      (req, res) => res.status(204).end());
app.get("/favicon.png",      (req, res) => res.status(204).end());
app.get("/apple-touch-icon*",(req, res) => res.status(204).end());
app.get("/robots.txt",       (req, res) => res.status(204).end());

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

export default app;