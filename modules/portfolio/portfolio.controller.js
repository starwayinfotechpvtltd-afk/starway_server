const {
  createPortfolio,
  updatePortfolio,
  getAllPortfolios,
  getPortfolioById,
  deletePortfolio,
} = require("./portfolio.model");
const subscriberModel = require("../subscriber/subscriber.model");
const { notifySubscribersNewPortfolio } = require("../../utils/mailer");

// ─── POST /api/portfolios ───────────────────────────────────────────────────
const submitPortfolio = async (req, res, next) => {
  try {
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
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(422).json({
        success: false,
        message: "Title is required",
      });
    }

    const generatedSlug = (slug || title)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "");

    const portfolioData = {
      title: title.trim(),
      slug: generatedSlug,
      category,
      client,
      industry,
      outcome,
      featured_image,
      services,
      results,
      content,
      status: status || "published",
    };

    const id = await createPortfolio(portfolioData);

    // If published, broadcast to all active subscribers in background
    if (portfolioData.status === "published") {
      subscriberModel
        .getAllActiveSubscribers()
        .then((subs) => {
          if (subs && subs.length > 0) {
            notifySubscribersNewPortfolio({ portfolio: portfolioData, subscribers: subs });
          }
        })
        .catch((err) => {
          console.warn("Subscriber portfolio broadcast error:", err.message);
        });
    }

    res.status(201).json({
      success: true,
      message: "Portfolio project created successfully",
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/portfolios ────────────────────────────────────────────────────
const getPortfolios = async (req, res, next) => {
  try {
    const isAdmin = req.query.admin === "true";
    const portfolios = await getAllPortfolios(!isAdmin);
    res.status(200).json({
      success: true,
      data: portfolios,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/portfolios/:id ────────────────────────────────────────────────
const getPortfolio = async (req, res, next) => {
  try {
    const id = req.params.id;
    const item = await getPortfolioById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Portfolio project not found",
      });
    }
    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/portfolios/:id ────────────────────────────────────────────────
const updatePortfolioItem = async (req, res, next) => {
  try {
    const id = req.params.id;
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
    } = req.body;

    const generatedSlug = (slug || title)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "");

    const success = await updatePortfolio(id, {
      title,
      slug: generatedSlug,
      category,
      client,
      industry,
      outcome,
      featured_image,
      services,
      results,
      content,
      status,
    });

    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Portfolio project not found or update failed",
      });
    }

    res.status(200).json({
      success: true,
      message: "Portfolio project updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/portfolios/:id ─────────────────────────────────────────────
const removePortfolio = async (req, res, next) => {
  try {
    const id = req.params.id;
    const success = await deletePortfolio(id);
    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Portfolio project not found or delete failed",
      });
    }
    res.status(200).json({
      success: true,
      message: "Portfolio project deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitPortfolio,
  getPortfolios,
  getPortfolio,
  updatePortfolioItem,
  removePortfolio,
};
