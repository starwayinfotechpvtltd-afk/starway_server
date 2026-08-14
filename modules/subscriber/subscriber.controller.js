const {
  addSubscriber,
  getAllActiveSubscribers,
  getAllSubscribers,
  unsubscribe,
} = require("./subscriber.model");
const {
  sendSubscriberWelcomeEmail,
  sendAdminNewSubscriberNotification,
} = require("../../utils/mailer");

// ─── POST /api/subscribe ────────────────────────────────────────────────────
const subscribe = async (req, res, next) => {
  try {
    const { email, source } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email format.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await addSubscriber(cleanEmail, source || "ServiceCTA");

    // Asynchronously send confirmation welcome email to subscriber and admin alert
    Promise.allSettled([
      sendSubscriberWelcomeEmail({ email: cleanEmail }),
      sendAdminNewSubscriberNotification({ email: cleanEmail, source: source || "ServiceCTA" }),
    ]).catch((err) => {
      console.warn("Subscriber email alert error:", err.message);
    });

    res.status(200).json({
      success: true,
      message: "Subscription confirmed! We have sent a confirmation email to your inbox with updates on new articles & case studies.",
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/subscribers (Admin) ───────────────────────────────────────────
const getSubscribers = async (req, res, next) => {
  try {
    const subscribers = await getAllSubscribers();
    res.status(200).json({
      success: true,
      count: subscribers.length,
      data: subscribers,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/subscribe/unsubscribe ────────────────────────────────────────
const handleUnsubscribe = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    const success = await unsubscribe(email);
    res.status(200).json({
      success: true,
      message: success ? "Unsubscribed successfully." : "Email not found.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  subscribe,
  getSubscribers,
  handleUnsubscribe,
};
