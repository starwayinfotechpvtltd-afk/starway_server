const { Router } = require("express");
const { getCategories, createCategory, deleteCategory } = require("./category.controller");
const { authAdmin } = require("../../middleware/authAdmin");

const router = Router();

// Public routes
router.get("/", getCategories);

// Protected Admin routes
router.post("/", authAdmin, createCategory);
router.delete("/:id", authAdmin, deleteCategory);

module.exports = router;
