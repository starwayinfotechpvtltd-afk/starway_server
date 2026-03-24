// import express from "express";
// import cors from "cors";
// import helmet from "helmet";
// import morgan from "morgan";
// import dotenv from "dotenv";

// import { testConnection } from "./config/db.js";

// // Route imports
// import contactRoutes from "./modules/contact/contact.routes.js";
// import errorHandler from "./middleware/errorHandler.js";
// // import razorpayRoutes from "./modules/razorpay/razorpay.routes.js";
// // import paypalRoutes from "./modules/paypal/paypal.routes.js";

// dotenv.config();

// const app = express();

// // ─── Middleware ────────────────────────────────────────────────────────────────

// app.use(helmet());

// app.use(
//   cors({
//     origin: process.env.CLIENT_URL || "http://localhost:3000",
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   })
// );

// // Raw body needed for Razorpay/PayPal webhook signature verification
// app.use((req, res, next) => {
//   if (req.originalUrl.includes("/webhook")) {
//     express.raw({ type: "application/json" })(req, res, next);
//   } else {
//     express.json({ limit: "10mb" })(req, res, next);
//   }
// });

// app.use(express.urlencoded({ extended: true }));

// if (process.env.NODE_ENV === "development") {
//   app.use(morgan("dev"));
// }

// // ─── DB Connection Test ────────────────────────────────────────────────────────

// try {
//   await testConnection();
// } catch (err) {
//   console.error("DB connection failed, but server will continue");
// }

// app.get("/", (req, res) => {
//   res.send("Server is running");
// });

// // ─── Routes ───────────────────────────────────────────────────────────────────

// app.use("/api/contact", contactRoutes);
// // app.use("/api/razorpay", razorpayRoutes);
// // app.use("/api/paypal", paypalRoutes);

// // Health check
// app.get("/api/health", (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: "Server is up and running 🟢",
//     timestamp: new Date().toISOString(),
//   });
// });

// // 404 handler — catch unmatched routes
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `Route ${req.originalUrl} not found`,
//   });
// });

// // ─── Global Error Handler ─────────────────────────────────────────────────────

// app.use(errorHandler);

// export default app;



import express   from "express";
import cors      from "cors";
import helmet    from "helmet";
import morgan    from "morgan";
import dotenv    from "dotenv";

import { testConnection } from "./config/db.js";
import errorHandler       from "./middleware/errorHandler.js";

import contactRoutes  from "./modules/contact/contact.routes.js";
import razorpayRoutes from "./modules/razorpay/razorpay.routes.js";
import paypalRoutes   from "./modules/paypal/paypal.routes.js";
import promoRoutes    from "./modules/promo/promo.routes.js";

dotenv.config();

const app = express();

// ─── Core Middleware ───────────────────────────────────────────────────────────

app.use(helmet());

app.use(
  cors({
    origin:         process.env.CLIENT_URL || "http://localhost:3000",
    methods:        ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials:    true,
  })
);

// Raw body for Razorpay / PayPal webhook signature verification
// All other routes get parsed JSON
app.use((req, res, next) => {
  if (req.originalUrl.includes("/webhook")) {
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    express.json({ limit: "10mb" })(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── DB Connection ─────────────────────────────────────────────────────────────

try {
  await testConnection();
} catch (err) {
  console.error("❌ DB connection failed, but server will continue:", err.message);
}

// ─── Silence browser auto-requests ───────────────────────────────────────────
// Browsers request these automatically — return 204 silently
// so they never trigger the 404 handler or cause console errors

app.get("/favicon.ico",       (req, res) => res.status(204).end());
app.get("/favicon.png",       (req, res) => res.status(204).end());
app.get("/apple-touch-icon*", (req, res) => res.status(204).end());
app.get("/robots.txt",        (req, res) => res.status(204).end());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.status(200).json({
    success:     true,
    message:     "Starway Web Digital API 🚀",
    version:     "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api/contact",  contactRoutes);
app.use("/api/razorpay", razorpayRoutes);
app.use("/api/paypal",   paypalRoutes);
app.use("/api/promo",    promoRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success:     true,
    message:     "Server is up and running 🟢",
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use(errorHandler);

export default app;