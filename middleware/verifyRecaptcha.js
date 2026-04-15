const axios = require("axios");

const verifyRecaptcha = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
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

    if (!response.data.success) {
      return res.status(403).json({
        success: false,
        message: "Captcha verification failed",
      });
    }

    next();
  } catch (error) {
    console.error("Recaptcha error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Captcha verification error",
    });
  }
};

module.exports = verifyRecaptcha;