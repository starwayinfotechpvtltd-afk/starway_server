const { Router } = require("express");
const { login, verify, getStats } = require("./admin.controller");
const { authAdmin } = require("../../middleware/authAdmin");

const router = Router();

// Public login route
router.post("/login", login);

// Protected routes
router.get("/verify", authAdmin, verify);
router.get("/stats", authAdmin, getStats);

module.exports = router;
