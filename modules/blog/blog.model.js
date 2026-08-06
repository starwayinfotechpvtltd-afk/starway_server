const mongoose = require("mongoose");
const dns = require("dns");

// Configure Node.js DNS resolver to Google/Cloudflare DNS to resolve MongoDB Atlas SRV records
try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {
  // Ignore if unsupported
}

const mongoUri = process.env.MONGO_DB || "mongodb+srv://starwayinfotechpvtltd_db_user:Uasxa81dh1UOMU4I@blogdata.1nfjmvv.mongodb.net";

// MongoDB Connection Instance
let isConnected = false;

async function connectMongo() {
  if (isConnected) return;
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log("✅ MongoDB connected successfully for Blogs");
  } catch (err) {
    console.warn("⚠️ MongoDB connection error:", err.message);
  }
}

connectMongo();

// Define Blog Schema
const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, default: "General" },
    meta_title: { type: String, default: "" },
    meta_description: { type: String, default: "" },
    author_name: { type: String, default: "Starway Team" },
    featured_image: { type: String, default: "" }, // URL path to server uploads
    content: { type: String, default: "" },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
  },
  { timestamps: true }
);

const BlogModel = mongoose.models.Blog || mongoose.model("Blog", blogSchema);

// In-memory fallback if MongoDB connection is pending
const memoryBlogs = [];
let memoryIdCounter = 1;

/**
 * Create a new blog post
 */
async function createPost(data) {
  const { title, slug, category, meta_title, meta_description, author_name, featured_image, content, status } = data;
  try {
    await connectMongo();
    const doc = await BlogModel.create({
      title,
      slug,
      category: category || "General",
      meta_title: meta_title || title,
      meta_description: meta_description || "",
      author_name: author_name || "Starway Team",
      featured_image: featured_image || "",
      content: content || "",
      status: status || "draft",
    });
    return doc._id.toString();
  } catch (err) {
    console.warn("Using in-memory blog store due to Mongo error:", err.message);
    const newPost = {
      id: String(memoryIdCounter++),
      title,
      slug,
      category: category || "General",
      meta_title: meta_title || title,
      meta_description: meta_description || "",
      author_name: author_name || "Starway Team",
      featured_image: featured_image || "",
      content: content || "",
      status: status || "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryBlogs.unshift(newPost);
    return newPost.id;
  }
}

/**
 * Update an existing blog post
 */
async function updatePost(id, data) {
  const { title, slug, category, meta_title, meta_description, author_name, featured_image, content, status } = data;
  try {
    await connectMongo();
    let result = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      result = await BlogModel.findByIdAndUpdate(
        id,
        {
          title,
          slug,
          category,
          meta_title,
          meta_description,
          author_name,
          featured_image,
          content,
          status,
        },
        { new: true }
      );
    } else {
      result = await BlogModel.findOneAndUpdate({ slug: id }, data, { new: true });
    }
    return !!result;
  } catch (err) {
    const idx = memoryBlogs.findIndex((b) => String(b.id) === String(id));
    if (idx !== -1) {
      memoryBlogs[idx] = {
        ...memoryBlogs[idx],
        title,
        slug,
        meta_title,
        meta_description,
        author_name,
        featured_image,
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
 * Get all blog posts
 */
async function getAllPosts(onlyPublished = false) {
  try {
    await connectMongo();
    const query = onlyPublished ? { status: "published" } : {};
    const docs = await BlogModel.find(query).sort({ createdAt: -1 }).lean();
    return docs.map((doc) => ({
      ...doc,
      id: doc._id.toString(),
    }));
  } catch (err) {
    if (onlyPublished) {
      return memoryBlogs.filter((b) => b.status === "published");
    }
    return memoryBlogs;
  }
}

/**
 * Get post by ID
 */
async function getPostById(id) {
  try {
    await connectMongo();
    if (mongoose.Types.ObjectId.isValid(id)) {
      const doc = await BlogModel.findById(id).lean();
      if (doc) return { ...doc, id: doc._id.toString() };
    }
    const docBySlug = await BlogModel.findOne({ slug: id }).lean();
    if (docBySlug) return { ...docBySlug, id: docBySlug._id.toString() };
    return null;
  } catch (err) {
    return memoryBlogs.find((b) => String(b.id) === String(id)) || null;
  }
}

/**
 * Get post by slug
 */
async function getPostBySlug(slug) {
  try {
    await connectMongo();
    const doc = await BlogModel.findOne({ slug }).lean();
    if (doc) return { ...doc, id: doc._id.toString() };
    return null;
  } catch (err) {
    return memoryBlogs.find((b) => b.slug === slug) || null;
  }
}

/**
 * Delete post by ID
 */
async function deletePost(id) {
  try {
    await connectMongo();
    let result = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      result = await BlogModel.findByIdAndDelete(id);
    } else {
      result = await BlogModel.findOneAndDelete({ slug: id });
    }
    return !!result;
  } catch (err) {
    const idx = memoryBlogs.findIndex((b) => String(b.id) === String(id));
    if (idx !== -1) {
      memoryBlogs.splice(idx, 1);
      return true;
    }
    return false;
  }
}

module.exports = {
  createPost,
  updatePost,
  getAllPosts,
  getPostById,
  getPostBySlug,
  deletePost,
};
