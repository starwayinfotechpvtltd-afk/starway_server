const fs = require("fs");
const path = require("path");
const blogModel = require("./blog.model");
const subscriberModel = require("../subscriber/subscriber.model");
const { notifySubscribersNewBlog } = require("../../utils/mailer");

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, "../../uploads/blogs");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Generate clean URL slug from title
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove non-word chars
    .replace(/\-\-+/g, "-"); // Replace multiple - with single -
}

/**
 * POST /api/blogs
 */
const createPost = async (req, res, next) => {
  try {
    const { title, slug, category, meta_title, meta_description, author_name, featured_image, content, status } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const finalSlug = slug ? slugify(slug) : slugify(title);

    // Check if slug exists
    const existing = await blogModel.getPostBySlug(finalSlug);
    if (existing) {
      return res.status(400).json({ success: false, message: `Slug '${finalSlug}' already exists. Please choose a different slug.` });
    }

    const postData = {
      title,
      slug: finalSlug,
      category: category || "General",
      meta_title: meta_title || title,
      meta_description: meta_description || "",
      author_name: author_name || "Starway Team",
      featured_image: featured_image || "",
      content: content || "",
      status: status || "draft",
    };

    const insertId = await blogModel.createPost(postData);

    // If published, broadcast to all active subscribers in background
    if (postData.status === "published") {
      subscriberModel
        .getAllActiveSubscribers()
        .then((subs) => {
          if (subs && subs.length > 0) {
            notifySubscribersNewBlog({ blog: postData, subscribers: subs });
          }
        })
        .catch((err) => {
          console.warn("Subscriber blog broadcast error:", err.message);
        });
    }

    res.status(201).json({
      success: true,
      message: "Blog post created successfully",
      data: { id: insertId, slug: finalSlug },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/blogs/:id
 */
const updatePost = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { title, slug, category, meta_title, meta_description, author_name, featured_image, content, status } = req.body;

    const existingPost = await blogModel.getPostById(id);
    if (!existingPost) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    const finalSlug = slug ? slugify(slug) : existingPost.slug;

    // Check slug collision
    if (finalSlug !== existingPost.slug) {
      const collision = await blogModel.getPostBySlug(finalSlug);
      if (collision && collision.id !== id) {
        return res.status(400).json({ success: false, message: `Slug '${finalSlug}' is already used by another post.` });
      }
    }

    const updated = await blogModel.updatePost(id, {
      title: title || existingPost.title,
      slug: finalSlug,
      category: category ?? existingPost.category ?? "General",
      meta_title: meta_title ?? existingPost.meta_title,
      meta_description: meta_description ?? existingPost.meta_description,
      author_name: author_name ?? existingPost.author_name,
      featured_image: featured_image ?? existingPost.featured_image,
      content: content ?? existingPost.content,
      status: status ?? existingPost.status,
    });

    res.status(200).json({
      success: true,
      message: "Blog post updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/blogs
 */
const getPosts = async (req, res, next) => {
  try {
    const isAdmin = req.query.admin === "true";
    const posts = await blogModel.getAllPosts(!isAdmin);

    res.status(200).json({
      success: true,
      data: posts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/blogs/id/:id
 */
const getPostById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const post = await blogModel.getPostById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }
    res.status(200).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/blogs/:slug
 */
const getPostBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const post = await blogModel.getPostBySlug(slug);
    if (!post) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }
    res.status(200).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/blogs/:id
 */
const deletePost = async (req, res, next) => {
  try {
    const id = req.params.id;
    const deleted = await blogModel.deletePost(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }
    res.status(200).json({ success: true, message: "Blog post deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/blogs/upload-image
 * Supports Base64 data URL upload or raw binary upload
 */
const uploadImage = async (req, res, next) => {
  try {
    const { base64, filename } = req.body;
    if (!base64) {
      return res.status(400).json({ success: false, message: "No image data provided" });
    }

    const matches = base64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ success: false, message: "Invalid image format" });
    }

    const ext = matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const name = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, name);

    fs.writeFileSync(filePath, buffer);

    const protocol = req.protocol;
    const host = req.get("host");
    const imageUrl = `${protocol}://${host}/uploads/blogs/${name}`;

    res.status(200).json({
      success: true,
      url: imageUrl,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPost,
  updatePost,
  getPosts,
  getPostById,
  getPostBySlug,
  deletePost,
  uploadImage,
};
