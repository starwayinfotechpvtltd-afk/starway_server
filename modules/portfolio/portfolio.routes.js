const { Router } = require("express");
const {
  submitPortfolio,
  getPortfolios,
  getPortfolio,
  updatePortfolioItem,
  removePortfolio,
} = require("./portfolio.controller");
const { authAdmin } = require("../../middleware/authAdmin");

const router = Router();

// Public / Fetch Routes
router.get("/", getPortfolios);
router.get("/:id", getPortfolio);

// Admin Authorized Routes
router.post("/", authAdmin, submitPortfolio);
router.put("/:id", authAdmin, updatePortfolioItem);
router.delete("/:id", authAdmin, removePortfolio);

module.exports = router;
