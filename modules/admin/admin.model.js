const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dns = require("dns");

try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {}

const mongoUri = process.env.MONGO_DB;

let isConnected = false;

async function connectMongo() {
  if (isConnected) return;
  if (!mongoUri) {
    console.warn("⚠️ MONGO_DB missing in environment. Cannot connect MongoDB Admin model.");
    return;
  }
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    console.log("✅ MongoDB connected for Admin authentication");
    await seedDefaultAdmin();
  } catch (err) {
    console.warn("⚠️ Admin MongoDB connection error:", err.message);
  }
}

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, default: "Admin User" },
    role: { type: String, default: "admin" },
  },
  { timestamps: true }
);

const AdminModel = mongoose.models.Admin || mongoose.model("Admin", adminSchema);

// Auto-seed default admin if database is empty
async function seedDefaultAdmin() {
  try {
    const count = await AdminModel.countDocuments();
    if (count === 0) {
      const defaultEmail = (process.env.LOGIN_MAIL_ADMIN || "asad@gmail.com").trim().toLowerCase();
      const rawPass = (process.env.LOGIN_PASS_ADMIN || "asad#@1234").trim().replace(/^["']|["']$/g, "");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(rawPass, salt);

      await AdminModel.create({
        email: defaultEmail,
        password: hashedPassword,
        name: "Asad Admin",
        role: "admin",
      });
      console.log(`✅ Default admin created in MongoDB: ${defaultEmail}`);
    }
  } catch (e) {
    console.warn("⚠️ Seed admin error:", e.message);
  }
}

connectMongo();

/**
 * Find admin user by email
 */
async function getAdminByEmail(email) {
  try {
    await connectMongo();
    if (!isConnected) return null;
    const cleanEmail = String(email || "").trim().toLowerCase();
    return await AdminModel.findOne({ email: cleanEmail }).lean();
  } catch (err) {
    console.error("Error getting admin by email:", err.message);
    return null;
  }
}

/**
 * Compare plain password with bcrypt hash
 */
async function comparePassword(plainPassword, hashedPassword) {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (err) {
    return false;
  }
}

module.exports = {
  AdminModel,
  getAdminByEmail,
  comparePassword,
};
