const {
  createServiceLead,
} = require("./serviceLead.model");

const {
  sendServiceLeadConfirmation,
  sendServiceLeadAdminNotification,
} = require("../../utils/mailer");

// ─── POST /api/service-lead ──────────────────────────────────────

const submitServiceLead = async (req, res, next) => {
  try {
    const { business_name, email, challenge } = req.body;

    // 🌐 Get user IP
    const ip_address =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      null;

    // ✅ Save to DB
    const insertId = await createServiceLead({
      business_name,
      email,
      challenge,
      ip_address,
    });

    // 📧 Send emails (non-blocking)
    Promise.allSettled([
      sendServiceLeadConfirmation({ business_name, email, challenge }),
      sendServiceLeadAdminNotification({ business_name, email, challenge }),
    ]).then((results) => {
      const labels = ["User email", "Admin email"];

      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`${labels[i]} failed:`, r.reason?.message);
        } else {
          console.log(`✅ ${labels[i]} sent`);
        }
      });
    });

    // ✅ Response
    res.status(201).json({
      success: true,
      message: "Lead submitted successfully",
      data: { id: insertId },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitServiceLead,
};