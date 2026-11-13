const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;
const requestsByIp = new Map();

// Lightweight per-process limit for the public newsletter endpoint.
const subscriberRateLimit = (req, res, next) => {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const record = requestsByIp.get(ip);

  if (!record || record.resetAt <= now) {
    requestsByIp.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (record.count >= MAX_REQUESTS) {
    res.set("Retry-After", String(Math.ceil((record.resetAt - now) / 1000)));
    return res.status(429).json({
      success: false,
      message: "Too many subscription attempts. Please try again later.",
    });
  }

  record.count += 1;
  return next();
};

// Drop expired keys periodically so the map does not grow indefinitely.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestsByIp) {
    if (record.resetAt <= now) requestsByIp.delete(ip);
  }
}, WINDOW_MS);
if (cleanupTimer.unref) cleanupTimer.unref();

module.exports = subscriberRateLimit;
