const { Router } = require("express");
const { submitServiceLead } = require("./serviceLead.controller");
const verifyRecaptcha = require("../../middleware/verifyRecaptcha");

const router = Router();

// Public route
router.post("/", verifyRecaptcha, submitServiceLead);

module.exports = router;