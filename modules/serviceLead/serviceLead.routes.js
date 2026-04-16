const { Router } = require("express");
const { submitServiceLead } = require("./serviceLead.controller");
const verifyRecaptcha = require("../../middleware/verifyRecaptcha");

const router = Router();

// ─── Public Route ───────────────────────────────────────────────

// Submit lead (with captcha protection)
router.post("/", verifyRecaptcha, submitServiceLead);

module.exports = router;