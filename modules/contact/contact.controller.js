const {
  createContact, getAllContacts,
  getContactById, updateContactStatus, deleteContact,
} = require("./contact.model");

const {
  sendContactConfirmation,
  sendAdminNotification,
} = require("../../utils/mailer");

// ─── POST /api/contact ────────────────────────────────────────────────────────

const submitContact = async (req, res, next) => {
  try {
    const { full_name, email, phone, designation, project_overview, website_url, services } = req.body;

    const ip_address =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      null;

    const insertId = await createContact({
      full_name, email, phone, designation,
      project_overview, website_url, ip_address,
    });

    const emailPayload = {
      full_name,
      email,
      phone,
      designation,
      project_overview,
      website_url,
      services: services || [],
    };

    Promise.allSettled([
      sendContactConfirmation(emailPayload),
      sendAdminNotification(emailPayload),
    ]).then((results) => {
      const labels = ["User confirmation", "Admin notification"];
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`⚠️  ${labels[i]} email failed:`, r.reason?.message);
        } else {
          console.log(`✅ ${labels[i]} email sent`);
        }
      });
    });

    res.status(201).json({
      success: true,
      message: "Your message has been received. We'll get back to you soon!",
      data:    { id: insertId },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/contact ─────────────────────────────────────────────────────────

const getContacts = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const status = req.query.status || undefined;

    const validStatuses = ["new", "read", "replied"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const { rows, total } = await getAllContacts({ page, limit, status });

    res.status(200).json({
      success: true,
      data:    rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/contact/:id ─────────────────────────────────────────────────────

const getContact = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid contact ID" });
    }
    const contact = await getContactById(id);
    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }
    res.status(200).json({ success: true, data: contact });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/contact/:id/status ───────────────────────────────────────────

const patchContactStatus = async (req, res, next) => {
  try {
    const id     = Number(req.params.id);
    const { status } = req.body;

    const validStatuses = ["new", "read", "replied"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const updated = await updateContactStatus(id, status);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }
    res.status(200).json({ success: true, message: "Status updated successfully" });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/contact/:id ──────────────────────────────────────────────────

const removeContact = async (req, res, next) => {
  try {
    const id      = Number(req.params.id);
    const deleted = await deleteContact(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }
    res.status(200).json({ success: true, message: "Contact deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitContact, getContacts, getContact,
  patchContactStatus, removeContact,
};