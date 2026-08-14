const mongoose = require("mongoose");
const dns = require("dns");

try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {
  // Ignore if unsupported
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
    console.log("✅ MongoDB connected successfully for Service Leads");
  } catch (err) {
    console.warn("⚠️ MongoDB connection error:", err.message);
  }
}

connectMongo();

// Define Service Lead Schema
const serviceLeadSchema = new mongoose.Schema(
  {
    business_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    challenge: { type: String, default: "" },
    service_name: { type: String, default: "General Service" },
    ip_address: { type: String, default: null },
  },
  { timestamps: true }
);

const ServiceLeadModel =
  mongoose.models.ServiceLead || mongoose.model("ServiceLead", serviceLeadSchema);

// In-memory fallback
const memoryLeads = [];
let memoryIdCounter = 1;

/**
 * Create a new Service Lead
 */
async function createServiceLead({
  business_name,
  email,
  challenge,
  service_name,
  ip_address,
}) {
  try {
    await connectMongo();
    const doc = await ServiceLeadModel.create({
      business_name: business_name.trim(),
      email: email.toLowerCase().trim(),
      challenge: challenge || "",
      service_name: service_name || "General Service",
      ip_address: ip_address || null,
    });
    return doc._id.toString();
  } catch (err) {
    console.warn("Using in-memory store for service lead due to Mongo error:", err.message);
    const newLead = {
      id: String(memoryIdCounter++),
      business_name: business_name.trim(),
      email: email.toLowerCase().trim(),
      challenge: challenge || "",
      service_name: service_name || "General Service",
      ip_address: ip_address || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryLeads.push(newLead);
    return newLead.id;
  }
}

/**
 * Get all Service Leads
 */
async function getAllServiceLeads() {
  try {
    await connectMongo();
    const docs = await ServiceLeadModel.find().sort({ createdAt: -1 }).lean();
    return docs.map((doc) => ({
      id: doc._id.toString(),
      business_name: doc.business_name,
      email: doc.email,
      challenge: doc.challenge,
      service_name: doc.service_name,
      ip_address: doc.ip_address,
      createdAt: doc.createdAt,
    }));
  } catch (err) {
    return memoryLeads;
  }
}

/**
 * Get single Service Lead
 */
async function getServiceLeadById(id) {
  try {
    await connectMongo();
    const doc = await ServiceLeadModel.findById(id).lean();
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      business_name: doc.business_name,
      email: doc.email,
      challenge: doc.challenge,
      service_name: doc.service_name,
      ip_address: doc.ip_address,
      createdAt: doc.createdAt,
    };
  } catch (err) {
    return memoryLeads.find((l) => l.id === id) || null;
  }
}

/**
 * Delete a Service Lead
 */
async function deleteServiceLead(id) {
  try {
    await connectMongo();
    const res = await ServiceLeadModel.findByIdAndDelete(id);
    return !!res;
  } catch (err) {
    const idx = memoryLeads.findIndex((l) => l.id === id);
    if (idx !== -1) {
      memoryLeads.splice(idx, 1);
      return true;
    }
    return false;
  }
}

module.exports = {
  createServiceLead,
  getAllServiceLeads,
  getServiceLeadById,
  deleteServiceLead,
};