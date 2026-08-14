const { Router } = require("express");
const {
  subscribe,
  getSubscribers,
  handleUnsubscribe,
} = require("./subscriber.controller");
const { authAdmin } = require("../../middleware/authAdmin");

const router = Router();

// Public subscription endpoint
router.post("/", subscribe);
router.post("/unsubscribe", handleUnsubscribe);

// Admin view subscriber list
router.get("/", authAdmin, getSubscribers);

module.exports = router;
