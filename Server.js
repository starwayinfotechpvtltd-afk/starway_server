// import app from "./App.js";
// import dotenv from "dotenv";

// dotenv.config();

// const PORT = process.env.PORT || 5000;

// const server = app.listen(PORT, () => {
//   console.log(
//     `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`
//   );
// });

// // Handle unhandled promise rejections
// process.on("unhandledRejection", (err) => {
//   console.error(`❌ Unhandled Rejection: ${err.message}`);
//   server.close(() => process.exit(1));
// });

// // Handle uncaught exceptions
// process.on("uncaughtException", (err) => {
//   console.error(`❌ Uncaught Exception: ${err.message}`);
//   process.exit(1);
// });

// export default server;



import app   from "./App.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`
  );
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

const shutdown = (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// ─── Unhandled Errors ─────────────────────────────────────────────────────────

process.on("unhandledRejection", (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});

export default server;