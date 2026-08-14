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
    console.log("✅ MongoDB connected successfully for Portfolios");
  } catch (err) {
    console.warn("⚠️ MongoDB connection error:", err.message);
  }
}

connectMongo();

// Define Portfolio Schema
const portfolioSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, default: "UI/UX Design" },
    client: { type: String, default: "" },
    industry: { type: String, default: "" },
    outcome: { type: String, default: "" },
    featured_image: { type: String, default: "" },
    services: { type: [String], default: [] },
    results: { type: [String], default: [] },
    content: { type: String, default: "" },
    status: { type: String, enum: ["draft", "published"], default: "published" },
  },
  { timestamps: true }
);

const PortfolioModel = mongoose.models.Portfolio || mongoose.model("Portfolio", portfolioSchema);

// In-memory fallback if MongoDB connection is pending or offline
const memoryPortfolios = [];
let memoryIdCounter = 1;

/**
 * Create a new portfolio project
 */
async function createPortfolio(data) {
  const {
    title,
    slug,
    category,
    client,
    industry,
    outcome,
    featured_image,
    services,
    results,
    content,
    status,
  } = data;

  try {
    await connectMongo();
    const doc = await PortfolioModel.create({
      title,
      slug,
      category: category || "UI/UX Design",
      client: client || "",
      industry: industry || "",
      outcome: outcome || "",
      featured_image: featured_image || "",
      services: Array.isArray(services) ? services : [],
      results: Array.isArray(results) ? results : [],
      content: content || "",
      status: status || "published",
    });
    return doc._id.toString();
  } catch (err) {
    console.warn("Using in-memory portfolio store due to Mongo error:", err.message);
    const newProject = {
      id: String(memoryIdCounter++),
      title,
      slug,
      category: category || "UI/UX Design",
      client: client || "",
      industry: industry || "",
      outcome: outcome || "",
      featured_image: featured_image || "",
      services: Array.isArray(services) ? services : [],
      results: Array.isArray(results) ? results : [],
      content: content || "",
      status: status || "published",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryPortfolios.unshift(newProject);
    return newProject.id;
  }
}

/**
 * Update an existing portfolio project
 */
async function updatePortfolio(id, data) {
  const {
    title,
    slug,
    category,
    client,
    industry,
    outcome,
    featured_image,
    services,
    results,
    content,
    status,
  } = data;

  try {
    await connectMongo();
    let updatedDoc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      updatedDoc = await PortfolioModel.findByIdAndUpdate(
        id,
        {
          title,
          slug,
          category,
          client,
          industry,
          outcome,
          featured_image,
          services: Array.isArray(services) ? services : [],
          results: Array.isArray(results) ? results : [],
          content,
          status,
        },
        { new: true }
      );
    } else {
      updatedDoc = await PortfolioModel.findOneAndUpdate({ slug: id }, data, { new: true });
    }
    return !!updatedDoc;
  } catch (err) {
    const idx = memoryPortfolios.findIndex((p) => String(p.id) === String(id));
    if (idx !== -1) {
      memoryPortfolios[idx] = {
        ...memoryPortfolios[idx],
        title,
        slug,
        category,
        client,
        industry,
        outcome,
        featured_image,
        services: Array.isArray(services) ? services : [],
        results: Array.isArray(results) ? results : [],
        content,
        status,
        updatedAt: new Date(),
      };
      return true;
    }
    return false;
  }
}

/**
 * Get all portfolio items
 */
async function getAllPortfolios(onlyPublished = false) {
  try {
    await connectMongo();
    const query = onlyPublished ? { status: "published" } : {};
    const docs = await PortfolioModel.find(query).sort({ createdAt: -1 }).lean();
    return docs.map((doc) => ({
      ...doc,
      id: doc._id.toString(),
    }));
  } catch (err) {
    if (onlyPublished) {
      return memoryPortfolios.filter((p) => p.status === "published");
    }
    return memoryPortfolios;
  }
}

/**
 * Get portfolio by ID or Slug
 */
async function getPortfolioById(id) {
  try {
    await connectMongo();
    if (mongoose.Types.ObjectId.isValid(id)) {
      const doc = await PortfolioModel.findById(id).lean();
      if (doc) return { ...doc, id: doc._id.toString() };
    }
    const docBySlug = await PortfolioModel.findOne({ slug: id }).lean();
    if (docBySlug) return { ...docBySlug, id: docBySlug._id.toString() };
    return null;
  } catch (err) {
    return memoryPortfolios.find((p) => String(p.id) === String(id) || p.slug === id) || null;
  }
}

/**
 * Delete portfolio by ID or Slug
 */
async function deletePortfolio(id) {
  try {
    await connectMongo();
    let result = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      result = await PortfolioModel.findByIdAndDelete(id);
    } else {
      result = await PortfolioModel.findOneAndDelete({ slug: id });
    }
    return !!result;
  } catch (err) {
    const idx = memoryPortfolios.findIndex((p) => String(p.id) === String(id));
    if (idx !== -1) {
      memoryPortfolios.splice(idx, 1);
      return true;
    }
    return false;
  }
}

module.exports = {
  createPortfolio,
  updatePortfolio,
  getAllPortfolios,
  getPortfolioById,
  deletePortfolio,
};
