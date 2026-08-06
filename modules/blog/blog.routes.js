const { Router } = require("express");
const {
  createPost,
  updatePost,
  getPosts,
  getPostById,
  getPostBySlug,
  deletePost,
  uploadImage,
} = require("./blog.controller");
const { authAdmin } = require("../../middleware/authAdmin");

const router = Router();

// Public routes
router.get("/", getPosts);
router.get("/id/:id", getPostById);
router.get("/:slug", getPostBySlug);

// Protected Admin routes
router.post("/", authAdmin, createPost);
router.put("/:id", authAdmin, updatePost);
router.delete("/:id", authAdmin, deletePost);
router.post("/upload-image", authAdmin, uploadImage);

module.exports = router;
