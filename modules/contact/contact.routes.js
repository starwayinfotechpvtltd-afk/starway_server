import { Router } from "express";

import {
  submitContact,
  getContacts,
  getContact,
  patchContactStatus,
  removeContact,
} from "./contact.controller.js";

import validateContact from "../../middleware/validateContact.js";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────

// POST /api/contact  — submit lead form
router.post("/", validateContact, submitContact);

// ─── Admin ────────────────────────────────────────────────────────────────────
// TODO: add auth middleware before going live

// GET    /api/contact            — list all (paginated, ?page=1&limit=20&status=new)
router.get("/",         getContacts);

// GET    /api/contact/:id        — single lead
router.get("/:id",      getContact);

// PATCH  /api/contact/:id/status — update status
router.patch("/:id/status", patchContactStatus);

// DELETE /api/contact/:id        — delete lead
router.delete("/:id",   removeContact);

export default router;