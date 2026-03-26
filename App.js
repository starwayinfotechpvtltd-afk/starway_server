import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

import { testConnection } from "./config/db.js";
import errorHandler from "./middleware/errorHandler.js";

import contactRoutes from "./modules/contact/contact.routes.js";
// import razorpayRoutes from "./modules/razorpay/razorpay.routes.js";
// import paypalRoutes from "./modules/paypal/paypal.routes.js";
// import promoRoutes from "./modules/promo/promo.routes.js";

dotenv.config();

const app = express();

// ─── Middleware ─────────────────────────────────────────

app.use(helmet());

app.use(
  cors({
    origin: "*", // ❗ FIXED (avoid CORS issues)
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Raw body for webhook
app.use((req, res, next) => {
  if (req.originalUrl.includes("/webhook")) {
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    express.json({ limit: "10mb" })(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));

// ─── DB Connection (NON-BLOCKING) ───────────────────────

testConnection()
  .then(() => console.log("✅ DB connected"))
  .catch((err) => console.error("❌ DB failed:", err.message));

// ─── Silent browser requests ────────────────────────────

app.get("/favicon.ico", (req, res) => res.status(204).end());
app.get("/favicon.png", (req, res) => res.status(204).end());
app.get("/apple-touch-icon*", (req, res) => res.status(204).end());
app.get("/robots.txt", (req, res) => res.status(204).end());

// ─── Routes ─────────────────────────────────────────────

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Starway Web Digital API 🚀",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api/contact", contactRoutes);
// app.use("/api/razorpay", razorpayRoutes);
// app.use("/api/paypal", paypalRoutes);
// app.use("/api/promo", promoRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is up and running 🟢",
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 ───────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ─── Error Handler ─────────────────────────────────────

app.use(errorHandler);

export default app;