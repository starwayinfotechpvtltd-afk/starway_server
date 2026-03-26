const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || "Internal Server Error";

  if (err.code === "ER_DUP_ENTRY") {
    statusCode = 409;
    message    = "Duplicate entry — resource already exists";
  }

  if (err.code === "ER_NO_SUCH_TABLE" || err.code === "ER_BAD_FIELD_ERROR") {
    statusCode = 500;
    message    = "Database schema error";
  }

  if (
    err.code === "ECONNREFUSED" ||
    err.code === "ETIMEDOUT"    ||
    err.code === "PROTOCOL_CONNECTION_LOST" ||
    err.code === "ER_CON_COUNT_ERROR"
  ) {
    statusCode = 503;
    message    = "Database temporarily unavailable. Please try again.";
  }

  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message    = "Invalid JSON in request body";
  }

  if (err.type === "entity.too.large") {
    statusCode = 413;
    message    = "Request body too large";
  }

  if (process.env.NODE_ENV === "development") {
    console.error("🔴 Error:", err);
  } else {
    console.error(`🔴 [${statusCode}] ${req.method} ${req.originalUrl} → ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;