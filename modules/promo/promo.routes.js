const { Router } = require("express");
const { validate, apply, create, list, toggle, remove } = require("./promo.controller");

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────

// POST /api/promo/validate  — { code, amount, email? }  — live validation, no side effects
router.post("/validate", validate);

// POST /api/promo/apply     — { code, amount, email, gateway, order_ref, currency }
router.post("/apply",    apply);

// ─── Admin (add auth middleware before going live) ────────────────────────────

// POST   /api/promo              — create promo code
router.post("/",             create);

// GET    /api/promo              — list all with usage stats
router.get("/",              list);

// PATCH  /api/promo/:id/toggle   — enable / disable
router.patch("/:id/toggle",  toggle);

// DELETE /api/promo/:id          — delete
router.delete("/:id",        remove);

module.exports = router;