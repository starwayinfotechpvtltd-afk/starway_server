require("dotenv").config();
const nodemailer = require("nodemailer");

// ─── Transporter ──────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || "smtp.gmail.com",
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.warn("⚠️  Mailer config error:", error.message);
  } else {
    console.log("✅ Mailer ready →", process.env.SMTP_USER);
  }
});

// ─── Helper ───────────────────────────────────────────────────────────────────

const sendMail = async ({ to, subject, html }) => {
  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text: html.replace(/<[^>]*>/g, ""),
  });
};

// ─── Template: User Confirmation ─────────────────────────────────────────────

const sendContactConfirmation = async ({ full_name, email, project_overview, services }) => {
  const html = `
    <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f4f8;padding:40px 16px;color:#1a1a2e}
      .wrap{max-width:580px;margin:0 auto}
      .card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
      .header{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:36px 40px}
      .header h1{color:#fff;font-size:22px;font-weight:700;margin-bottom:6px}
      .header p{color:rgba(255,255,255,.6);font-size:13px}
      .body{padding:36px 40px}
      .body p{font-size:14px;line-height:1.7;color:#444;margin-bottom:16px}
      .highlight{background:#f7f9fc;border-left:4px solid #4f46e5;border-radius:8px;padding:16px 20px;margin:20px 0}
      .badge{display:inline-block;background:#ede9fe;color:#4f46e5;border-radius:20px;padding:4px 14px;font-size:12px;font-weight:600;margin:2px 4px 2px 0}
      .footer{background:#f7f9fc;padding:20px 40px;text-align:center;font-size:11px;color:#999}
      .divider{border:none;border-top:1px solid #eee;margin:20px 0}
    </style></head>
    <body><div class="wrap"><div class="card">
      <div class="header">
        <h1>We've received your message, ${full_name}!</h1>
        <p>Our team will be in touch within 24–48 hours.</p>
      </div>
      <div class="body">
        <p>Thanks for reaching out! Here's a summary of what you shared:</p>
        <div class="highlight">
          <p><strong>Your overview:</strong></p>
          <p style="margin-top:8px">${project_overview || "Not provided"}</p>
        </div>
        ${services?.length ? `
        <p><strong>Services you're interested in:</strong></p>
        <div style="margin:10px 0 20px">${services.map(s => `<span class="badge">${s}</span>`).join("")}</div>
        ` : ""}
        <hr class="divider"/>
        <p style="font-size:13px;color:#666">If your query is urgent, simply reply to this email.</p>
        <p>Best regards,<br/><strong>The Team</strong></p>
      </div>
      <div class="footer">You're receiving this because you submitted our contact form.<br/>© ${new Date().getFullYear()} All rights reserved.</div>
    </div></div></body></html>
  `;
  return sendMail({ to: email, subject: `Thanks for reaching out, ${full_name}! 👋`, html });
};

// ─── Template: Admin Notification ────────────────────────────────────────────

const sendAdminNotification = async ({
  full_name, email, phone, designation,
  project_overview, website_url, services,
}) => {
  const servicesList = services?.length
    ? services.map(s => `<span style="display:inline-block;background:#ede9fe;color:#4f46e5;border-radius:20px;padding:3px 12px;font-size:12px;font-weight:600;margin:2px 4px 2px 0">${s}</span>`).join("")
    : `<span style="color:#999">None selected</span>`;

  const html = `
    <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f4f8;padding:40px 16px;color:#1a1a2e}
      .wrap{max-width:580px;margin:0 auto}
      .card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
      .header{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:28px 40px}
      .header h2{color:#fff;font-size:18px;font-weight:700}
      .body{padding:32px 40px}
      table{width:100%;border-collapse:collapse}
      td{padding:12px 0;border-bottom:1px solid #f0f0f0;font-size:14px;vertical-align:top}
      td.label{color:#888;font-weight:600;width:140px;text-transform:uppercase;font-size:11px;letter-spacing:.5px}
      td.value{color:#1a1a2e}
      .overview{background:#f7f9fc;border-left:4px solid #0f172a;border-radius:8px;padding:14px 18px;margin-top:8px;font-size:13px;line-height:1.7;color:#333;white-space:pre-wrap}
      .footer{background:#f7f9fc;padding:16px 40px;text-align:center;font-size:11px;color:#aaa}
      a{color:#4f46e5;text-decoration:none}
    </style></head>
    <body><div class="wrap"><div class="card">
      <div class="header"><h2>📬 New Lead Submission</h2></div>
      <div class="body">
        <table>
          <tr><td class="label">Name</td><td class="value">${full_name}</td></tr>
          <tr><td class="label">Email</td><td class="value"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td class="label">Phone</td><td class="value">${phone || "—"}</td></tr>
          <tr><td class="label">Designation</td><td class="value">${designation || "—"}</td></tr>
          <tr><td class="label">Website</td><td class="value">${website_url ? `<a href="${website_url}" target="_blank">${website_url}</a>` : "—"}</td></tr>
          <tr><td class="label">Services</td><td class="value">${servicesList}</td></tr>
          <tr><td class="label">Overview</td><td class="value"><div class="overview">${project_overview || "Not provided"}</div></td></tr>
        </table>
      </div>
      <div class="footer">Submitted via contact form &middot; ${new Date().toUTCString()}</div>
    </div></div></body></html>
  `;
  return sendMail({
    to:      process.env.ADMIN_EMAIL || process.env.SMTP_USER,
    subject: `📬 New Lead: ${full_name} — ${services?.join(", ") || "No services selected"}`,
    html,
  });
};


// ─── Service Lead: User Confirmation ─────────────────────────────

const sendServiceLeadConfirmation = async ({ business_name, email, challenge }) => {
  const html = `
    <h2>Thanks ${business_name}!</h2>
    <p>We've received your request regarding:</p>
    <p><strong>${challenge || "General Inquiry"}</strong></p>
    <p>Our team will contact you soon 🚀</p>
  `;

  return sendMail({
    to: email,
    subject: `Thanks for contacting us, ${business_name}!`,
    html,
  });
};

// ─── Service Lead: Admin Notification ────────────────────────────

const sendServiceLeadAdminNotification = async ({
  business_name,
  email,
  challenge,
}) => {
  const html = `
    <h2>🚀 New Service Lead</h2>
    <p><strong>Business:</strong> ${business_name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Challenge:</strong> ${challenge || "—"}</p>
  `;

  return sendMail({
    to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
    subject: `New Service Lead: ${business_name}`,
    html,
  });
};

module.exports = {
  sendMail,
  sendContactConfirmation,
  sendAdminNotification,
  sendServiceLeadConfirmation,
  sendServiceLeadAdminNotification,
};