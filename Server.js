import app from "./App.js";
import dotenv from "dotenv";

dotenv.config();

// ❗ FORCE PORT (IMPORTANT FOR HOSTINGER)
const PORT = 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n${signal} received — shutting down...`);
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Error handling
process.on("unhandledRejection", (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
});

process.on("uncaughtException", (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
});

export default server;