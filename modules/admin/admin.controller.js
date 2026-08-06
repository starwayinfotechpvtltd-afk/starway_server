const { generateToken } = require("../../middleware/authAdmin");
const { pool } = require("../../config/db");
const blogModel = require("../blog/blog.model");
const adminModel = require("./admin.model");

function cleanVal(v) {
  if (!v) return "";
  return String(v).replace(/[\r\n]/g, "").trim().replace(/^["']|["']$/g, "").trim();
}

/**
 * POST /api/admin/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const cleanEmail = cleanVal(email).toLowerCase();
    const cleanPassword = cleanVal(password);

    let isAuthenticated = false;
    let adminEmail = cleanEmail;

    // 1. Check MongoDB Atlas Admin collection
    const mongoAdmin = await adminModel.getAdminByEmail(cleanEmail);
    if (mongoAdmin) {
      const isMatch = await adminModel.comparePassword(cleanPassword, mongoAdmin.password);
      if (isMatch) {
        isAuthenticated = true;
        adminEmail = mongoAdmin.email;
      }
    }

    // 2. Fallback check for env / default credentials
    if (!isAuthenticated) {
      const envEmail = cleanVal(process.env.LOGIN_MAIL_ADMIN) || "asad@gmail.com";
      const envPass = cleanVal(process.env.LOGIN_PASS_ADMIN);
      const validPasses = [envPass, "asad#@1234", "asad1234"].filter(Boolean);

      if (cleanEmail === envEmail.toLowerCase() && validPasses.includes(cleanPassword)) {
        isAuthenticated = true;
        adminEmail = envEmail;
      }
    }

    if (!isAuthenticated) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const payload = {
      role: "admin",
      email: adminEmail,
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
          email: adminEmail,
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
