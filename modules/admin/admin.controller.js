const { generateToken } = require("../../middleware/authAdmin");
const { pool } = require("../../config/db");
const blogModel = require("../blog/blog.model");

/**
 * POST /api/admin/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const expectedEmail = process.env.LOGIN_MAIL_ADMIN || "asad@gmail.com";
    const expectedPass = process.env.LOGIN_PASS_ADMIN || "asad1234";

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (email.trim().toLowerCase() !== expectedEmail.trim().toLowerCase() || password !== expectedPass) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const payload = {
      role: "admin",
      email: expectedEmail,
      iat: Date.now(),
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    const token = generateToken(payload);

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      data: {
        token,
        admin: {
          email: expectedEmail,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/verify
 */
const verify = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      admin: req.admin,
    },
  });
};

/**
 * GET /api/admin/stats
 */
const getStats = async (req, res, next) => {
  try {
    let contactsCount = 0;
    let serviceLeadsCount = 0;
    let promoCount = 0;
    let blogsCount = 0;

    try {
      const [cRows] = await pool.execute("SELECT COUNT(*) as count FROM contacts");
      contactsCount = cRows[0]?.count || 0;
    } catch (e) {
      // Silent fallback when local MySQL service is offline
    }

    try {
      const [sRows] = await pool.execute("SELECT COUNT(*) as count FROM service_leads");
      serviceLeadsCount = sRows[0]?.count || 0;
    } catch (e) {
      // Silent fallback when local MySQL service is offline
    }

    try {
      const [pRows] = await pool.execute("SELECT COUNT(*) as count FROM promo_codes");
      promoCount = pRows[0]?.count || 0;
    } catch (e) {
      // Silent fallback when local MySQL service is offline
    }

    try {
      const blogs = await blogModel.getAllPosts();
      blogsCount = blogs.length;
    } catch (e) {
      // Silent fallback when local MySQL service is offline
    }

    res.status(200).json({
      success: true,
      data: {
        contactsCount,
        serviceLeadsCount,
        promoCount,
        blogsCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  verify,
  getStats,
};
