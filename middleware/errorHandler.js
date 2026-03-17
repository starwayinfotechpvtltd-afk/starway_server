/**
 * Global Error Handler Middleware
 * Always the LAST middleware registered in App.js
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // MySQL duplicate entry
  if (err.code === "ER_DUP_ENTRY") {
    statusCode = 409;
    message = "Duplicate entry — resource already exists";
  }

  // MySQL bad field / table
  if (err.code === "ER_NO_SUCH_TABLE" || err.code === "ER_BAD_FIELD_ERROR") {
    statusCode = 500;
    message = "Database schema error";
  }

  // JSON parse error
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON in request body";
  }

  // Log full error in development
  if (process.env.NODE_ENV === "development") {
    console.error("🔴 Error:", err);
  } else {
    console.error(`🔴 [${statusCode}] ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;