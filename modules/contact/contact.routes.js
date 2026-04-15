const { Router } = require("express");
const {
  submitContact, getContacts, getContact,
  patchContactStatus, removeContact,
} = require("./contact.controller");
const validateContact = require("../../middleware/validateContact");
const verifyRecaptcha = require("../../middleware/verifyRecaptcha");

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.post("/", validateContact, verifyRecaptcha, submitContact);

// ─── Admin (add auth middleware before going live) ────────────────────────────
router.get("/",              getContacts);
router.get("/:id",           getContact);
router.patch("/:id/status",  patchContactStatus);
router.delete("/:id",        removeContact);

module.exports = router;