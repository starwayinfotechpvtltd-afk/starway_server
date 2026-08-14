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
    const { business_name, email, challenge, service_name } = req.body;

    if (!business_name || !business_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Business name is required.",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanBusiness = business_name.trim();
    const cleanChallenge = challenge ? challenge.trim() : "";
    const cleanService = service_name ? service_name.trim() : "General Consultation";

    const ip_address =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      null;

    const insertId = await createServiceLead({
      business_name: cleanBusiness,
      email: cleanEmail,
      challenge: cleanChallenge,
      service_name: cleanService,
      ip_address,
    });

    // ─── DUAL-SIDED EMAIL NOTIFICATIONS (User confirmation & Admin notification) ───
    Promise.allSettled([
      sendServiceLeadConfirmation({
        business_name: cleanBusiness,
        email: cleanEmail,
        challenge: cleanChallenge,
        service_name: cleanService,
      }),
      sendServiceLeadAdminNotification({
        business_name: cleanBusiness,
        email: cleanEmail,
        challenge: cleanChallenge,
        service_name: cleanService,
      }),
    ]).catch((err) => {
      console.warn("Service lead email notification error:", err.message);
    });

    res.status(201).json({
      success: true,
      message: "Lead submitted successfully. Confirmation email sent!",
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