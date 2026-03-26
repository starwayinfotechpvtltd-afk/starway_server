import app from "./App.js";
import dotenv from "dotenv";

dotenv.config();

// ✅ Always fallback to 3000 if PORT is not set by hosting provider
const PORT = process.env.PORT || 3000;

// ✅ Bind to all interfaces (REQUIRED for Hostinger/VPS reverse proxy)
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});

// ✅ Set keep-alive timeout higher than Hostinger's load balancer (default 60s)
server.keepAliveTimeout = 65000;
server.headersTimeout   = 66000;

// ─── Graceful Shutdown ──────────────────────────────────────────────────────

const shutdown = (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log("✅ Server closed cleanly");
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error("❌ Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// ─── Global Error Safety Net ────────────────────────────────────────────────

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  // Do NOT crash — just log
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  console.error(err.stack);
  // Crash only on truly unrecoverable errors
  process.exit(1);
});

export default server;