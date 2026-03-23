import { Router } from "express";
import { validate, apply, create, list, toggle, remove } from "./promo.controller.js";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────

// POST /api/promo/validate
// Body: { code, amount, email? }
// Live validation — no side effects, safe to call on every keystroke (debounced)
router.post("/validate", validate);

// POST /api/promo/apply
// Body: { code, amount, email, gateway, order_ref, currency }
// Called after order creation to lock usage and record it
router.post("/apply", apply);

// ─── Admin ────────────────────────────────────────────────────────────────────
// TODO: protect with auth middleware before going live

// POST   /api/promo              — create a new promo code
router.post("/", create);

// GET    /api/promo              — list all promo codes with usage stats
router.get("/", list);

// PATCH  /api/promo/:id/toggle   — enable / disable
router.patch("/:id/toggle", toggle);

// DELETE /api/promo/:id          — delete
router.delete("/:id", remove);

export default router;
