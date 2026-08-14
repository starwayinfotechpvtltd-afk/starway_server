const axios = require("axios");

const verifyRecaptcha = async (req, res, next) => {
  try {
    const { token } = req.body;

    // If reCAPTCHA secret key is not configured in env, allow request gracefully
    if (!process.env.RECAPTCHA_SECRET_KEY) {
      return next();
    }

    // In dev / test environments allow fallback if token is not provided
    if (!token) {
      if (process.env.NODE_ENV !== "production") {
        return next();
      }
      return res.status(400).json({
        success: false,
        message: "Captcha token missing",
      });
    }

    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token,
        },
      }
    );

    if (!response.data.success && process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "Captcha verification failed",
      });
    }

    next();
  } catch (error) {
    console.error("Recaptcha error:", error.message);
    // In case of external network issues reaching google recaptcha, don't drop legitimate user leads
    next();
  }
};

module.exports = verifyRecaptcha;