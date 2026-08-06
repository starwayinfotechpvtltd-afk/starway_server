const categoryModel = require("./category.model");

const getCategories = async (req, res, next) => {
  try {
    const list = await categoryModel.getAllCategories();
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }
    const cat = await categoryModel.createCategory(name.trim());
    res.status(201).json({ success: true, message: "Category created successfully", data: cat });
  } catch (err) {
    next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await categoryModel.deleteCategory(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCategories,
  createCategory,
  deleteCategory,
};
