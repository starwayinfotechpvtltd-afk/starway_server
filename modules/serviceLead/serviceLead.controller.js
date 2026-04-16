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

    console.log("📥 Incoming Lead:", { business_name, email, challenge });

    const ip_address =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      null;

    const insertId = await createServiceLead({
      business_name,
      email,
      challenge,
      ip_address,
    });

    // 🔥 SAFE EMAIL CALL
    if (email && business_name) {
      Promise.allSettled([
        sendServiceLeadConfirmation({
          business_name,
          email,
          challenge,
        }),
        sendServiceLeadAdminNotification({
          business_name,
          email,
          challenge,
        }),
      ]).then((results) => {
        console.log("📧 Mail Results:", results);
      });
    } else {
      console.warn("Skipping email — missing data");
    }

    res.status(201).json({
      success: true,
      message: "Lead submitted successfully",
      data: { id: insertId },
    });
  } catch (error) {
    console.error("❌ Controller Error:", error);
    next(error);
  }
};

module.exports = {
  submitServiceLead,
};