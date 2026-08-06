const mongoose = require("mongoose");
const dns = require("dns");

try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {}

const mongoUri = process.env.MONGO_DB;

let isConnected = false;
async function connectMongo() {
  if (isConnected) return;
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
  } catch (err) {
    console.warn("⚠️ Mongo category connect warn:", err.message);
  }
}
connectMongo();

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const CategoryModel = mongoose.models.Category || mongoose.model("Category", categorySchema);

// In-memory fallback categories if DB is offline
const memoryCategories = [
  { id: "1", name: "Digital Marketing", slug: "digital-marketing" },
  { id: "2", name: "AI & Technology", slug: "ai-technology" },
  { id: "3", name: "Web Development", slug: "web-development" },
  { id: "4", name: "Mobile Apps", slug: "mobile-apps" },
  { id: "5", name: "Growth Strategy", slug: "growth-strategy" },
  { id: "6", name: "General", slug: "general" },
];
let memoryIdCounter = 10;

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

/**
 * Seed initial default categories if empty
 */
async function seedDefaultCategories() {
  try {
    await connectMongo();
    const count = await CategoryModel.countDocuments();
    if (count === 0) {
      for (const item of memoryCategories) {
        await CategoryModel.create({ name: item.name, slug: item.slug });
      }
    }
  } catch (e) {}
}
seedDefaultCategories();

async function getAllCategories() {
  try {
    await connectMongo();
    const docs = await CategoryModel.find().sort({ name: 1 }).lean();
    if (docs.length === 0) return memoryCategories;
    return docs.map((d) => ({ id: d._id.toString(), name: d.name, slug: d.slug }));
  } catch (e) {
    return memoryCategories;
  }
}

async function createCategory(name) {
  const slug = slugify(name);
  try {
    await connectMongo();
    const doc = await CategoryModel.create({ name, slug });
    return { id: doc._id.toString(), name: doc.name, slug: doc.slug };
  } catch (e) {
    const newCat = { id: String(memoryIdCounter++), name, slug };
    memoryCategories.push(newCat);
    return newCat;
  }
}

async function deleteCategory(id) {
  try {
    await connectMongo();
    let res = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      res = await CategoryModel.findByIdAndDelete(id);
    } else {
      res = await CategoryModel.findOneAndDelete({ slug: id });
    }
    return !!res;
  } catch (e) {
    const idx = memoryCategories.findIndex((c) => String(c.id) === String(id) || c.slug === id);
    if (idx !== -1) {
      memoryCategories.splice(idx, 1);
      return true;
    }
    return false;
  }
}

module.exports = {
  getAllCategories,
  createCategory,
  deleteCategory,
};
