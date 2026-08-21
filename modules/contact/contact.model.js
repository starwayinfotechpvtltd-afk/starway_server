const mongoose = require("mongoose");
const dns = require("dns");

try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {
  // Ignore
}

const mongoUri = process.env.MONGO_DB;
let isConnected = false;

async function connectMongo() {
  if (isConnected) return;
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log("✅ MongoDB connected successfully for Contacts");
  } catch (err) {
    console.warn("⚠️ MongoDB connection error:", err.message);
  }
}

connectMongo();

// Define Contact Schema
const contactSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    designation: { type: String, default: null },
    project_overview: { type: String, default: null },
    website_url: { type: String, default: null },
    services: { type: [String], default: [] },
    status: { type: String, enum: ["new", "read", "replied"], default: "new" },
    ip_address: { type: String, default: null },
  },
  { timestamps: true }
);

const ContactModel =
  mongoose.models.Contact || mongoose.model("Contact", contactSchema);

// In-memory store fallback
const memoryContacts = [];
let memoryIdCounter = 1;

/**
 * Create a new Contact lead
 */
const createContact = async ({
  full_name,
  email,
  phone,
  designation,
  project_overview,
  website_url,
  services,
  ip_address,
}) => {
  try {
    await connectMongo();
    const doc = await ContactModel.create({
      full_name: full_name ? full_name.trim() : "",
      email: email ? email.toLowerCase().trim() : "",
      phone: phone ? phone.trim() : "",
      designation: designation || null,
      project_overview: project_overview || null,
      website_url: website_url || null,
      services: Array.isArray(services) ? services : [],
      ip_address: ip_address || null,
      status: "new",
    });
    return doc._id.toString();
  } catch (err) {
    console.warn("Using in-memory contact store:", err.message);
    const newContact = {
      id: String(memoryIdCounter++),
      full_name: full_name ? full_name.trim() : "",
      email: email ? email.toLowerCase().trim() : "",
      phone: phone ? phone.trim() : "",
      designation: designation || null,
      project_overview: project_overview || null,
      website_url: website_url || null,
      services: Array.isArray(services) ? services : [],
      ip_address: ip_address || null,
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryContacts.push(newContact);
    return newContact.id;
  }
};

/**
 * Get all Contacts (paginated + filtered)
 */
const getAllContacts = async ({ page = 1, limit = 20, status } = {}) => {
  const query = {};
  if (status) query.status = status;
  const skip = (page - 1) * limit;

  try {
    await connectMongo();
    const [docs, total] = await Promise.all([
      ContactModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ContactModel.countDocuments(query),
    ]);

    const rows = docs.map((d) => ({
      id: d._id.toString(),
      full_name: d.full_name,
      email: d.email,
      phone: d.phone,
      designation: d.designation,
      project_overview: d.project_overview,
      website_url: d.website_url,
      services: d.services,
      status: d.status,
      ip_address: d.ip_address,
      created_at: d.createdAt,
      updated_at: d.updatedAt,
    }));

    return { rows, total };
  } catch (err) {
    let filtered = memoryContacts;
    if (status) {
      filtered = filtered.filter((c) => c.status === status);
    }
    const total = filtered.length;
    const rows = filtered.slice(skip, skip + limit);
    return { rows, total };
  }
};

/**
 * Get Contact by ID
 */
const getContactById = async (id) => {
  try {
    await connectMongo();
    const doc = await ContactModel.findById(id).lean();
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      full_name: doc.full_name,
      email: doc.email,
      phone: doc.phone,
      designation: doc.designation,
      project_overview: doc.project_overview,
      website_url: doc.website_url,
      services: doc.services,
      status: doc.status,
      ip_address: doc.ip_address,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
    };
  } catch (err) {
    return memoryContacts.find((c) => c.id === String(id)) || null;
  }
};

/**
 * Update Contact Status
 */
const updateContactStatus = async (id, status) => {
  try {
    await connectMongo();
    const res = await ContactModel.findByIdAndUpdate(id, { status }, { new: true });
    return !!res;
  } catch (err) {
    const contact = memoryContacts.find((c) => c.id === String(id));
    if (contact) {
      contact.status = status;
      contact.updatedAt = new Date();
      return true;
    }
    return false;
  }
};

/**
 * Delete Contact
 */
const deleteContact = async (id) => {
  try {
    await connectMongo();
    const res = await ContactModel.findByIdAndDelete(id);
    return !!res;
  } catch (err) {
    const idx = memoryContacts.findIndex((c) => c.id === String(id));
    if (idx !== -1) {
      memoryContacts.splice(idx, 1);
      return true;
    }
    return false;
  }
};

module.exports = {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
};