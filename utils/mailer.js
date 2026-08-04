require("dotenv").config();
const nodemailer = require("nodemailer");

// ─── Transporter ────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.warn("⚠️ Mailer config error:", error.message);
  } else {
    console.log("✅ Mailer ready →", process.env.SMTP_USER);
  }
});

// ─── Helper ─────────────────────────────────────────────────────

const sendMail = async ({ to, subject, html }) => {
  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text: html.replace(/<[^>]*>/g, ""),
  });
};

const formatServicesBadges = (services) => {
  let list = [];
  if (Array.isArray(services)) {
    list = services.filter(Boolean);
  } else if (typeof services === "string" && services.trim()) {
    list = services.split(",").map((s) => s.trim()).filter(Boolean);
  }

  if (list.length === 0) {
    return `<span style="color: #6b7280; font-style: italic;">None selected</span>`;
  }

  return list
    .map(
      (s) =>
        `<span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-right: 6px; margin-bottom: 6px;">${s}</span>`
    )
    .join("");
};

// ─── CONTACT: USER EMAIL CONFIRMATION ────────────────────────────

const sendContactConfirmation = async ({
  full_name,
  email,
  phone,
  designation,
  project_overview,
  website_url,
  services = [],
}) => {
  const servicesHtml = formatServicesBadges(services);
  const formattedWebsite = website_url
    ? website_url.startsWith("http")
      ? website_url
      : `https://${website_url}`
    : null;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Contacting Starway Web Digital</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background-color: #0A2458; padding: 32px 40px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Starway Web Digital</h1>
            <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 14px;">Elevating Your Digital Growth</p>
          </td>
        </tr>

        <!-- Hero Greeting -->
        <tr>
          <td style="padding: 40px 40px 20px 40px;">
            <h2 style="margin: 0 0 12px 0; color: #0A2458; font-size: 20px;">Hello ${full_name || "Valued Client"},</h2>
            <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #475569;">
              Thank you for reaching out to <strong>Starway Web Digital</strong>. We've received your request and our digital growth team is reviewing your project details. We will be in touch with you within <strong>24–48 hours</strong>.
            </p>
          </td>
        </tr>

        <!-- Submission Details Card -->
        <tr>
          <td style="padding: 10px 40px 30px 40px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
              <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #0A2458; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                📋 Summary of Your Submitted Details
              </h3>
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #334155;">
                <tr>
                  <td style="padding: 6px 0; width: 35%; font-weight: 600; color: #64748b;">Full Name:</td>
                  <td style="padding: 6px 0; font-weight: 500;">${full_name || "—"}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Email Address:</td>
                  <td style="padding: 6px 0; font-weight: 500;">${email || "—"}</td>
                </tr>
                ${
                  phone
                    ? `<tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Phone Number:</td>
                  <td style="padding: 6px 0; font-weight: 500;">${phone}</td>
                </tr>`
                    : ""
                }
                ${
                  designation
                    ? `<tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Designation:</td>
                  <td style="padding: 6px 0; font-weight: 500;">${designation}</td>
                </tr>`
                    : ""
                }
                ${
                  formattedWebsite
                    ? `<tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Website URL:</td>
                  <td style="padding: 6px 0;"><a href="${formattedWebsite}" target="_blank" style="color: #2563eb; text-decoration: underline;">${website_url}</a></td>
                </tr>`
                    : ""
                }
                <tr>
                  <td style="padding: 10px 0 6px 0; font-weight: 600; color: #64748b; vertical-align: top;">Interested Services:</td>
                  <td style="padding: 10px 0 6px 0;">${servicesHtml}</td>
                </tr>
              </table>

              ${
                project_overview
                  ? `
                <div style="margin-top: 16px; pt-3; border-top: 1px dashed #cbd5e1;">
                  <p style="margin: 8px 0 4px 0; font-weight: 600; color: #64748b; font-size: 14px;">Project Overview / Message:</p>
                  <div style="background: #ffffff; border-left: 4px solid #0A2458; padding: 12px 16px; border-radius: 4px; font-size: 14px; color: #334155; line-height: 1.5;">
                    ${project_overview}
                  </div>
                </div>
              `
                  : ""
              }
            </div>
          </td>
        </tr>

        <!-- Next Steps Callout -->
        <tr>
          <td style="padding: 0 40px 30px 40px;">
            <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; text-align: center;">
              <h4 style="margin: 0 0 6px 0; color: #1e40af; font-size: 15px;">Need Immediate Assistance?</h4>
              <p style="margin: 0; font-size: 14px; color: #3b82f6;">
                Feel free to call us at <a href="tel:+918240669415" style="font-weight: 700; color: #1d4ed8; text-decoration: none;">+91 8240669415</a> or reply directly to this email.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #f1f5f9; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #475569;">Starway Web Digital</p>
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
              59C/ Tiljala Road, JBS Haldane Ave, Gobra, Kolkata, West Bengal 700046
            </p>
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
              © ${new Date().getFullYear()} Starway Web Digital. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </body>
    </html>
  `;

  return sendMail({
    to: email,
    subject: `Thanks for contacting Starway Web Digital, ${full_name || "Valued Client"}!`,
    html,
  });
};

// ─── CONTACT: ADMIN NOTIFICATION EMAIL ──────────────────────────

const sendAdminNotification = async ({
  full_name,
  email,
  phone,
  designation,
  project_overview,
  website_url,
  services = [],
}) => {
  const servicesHtml = formatServicesBadges(services);
  const formattedWebsite = website_url
    ? website_url.startsWith("http")
      ? website_url
      : `https://${website_url}`
    : null;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Lead Notification - Starway Web Digital</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.25);">
        
        <!-- Header Banner -->
        <tr>
          <td style="background-color: #0A2458; padding: 32px 40px; text-align: center;">
            <span style="background-color: #22c55e; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-bottom: 8px;">New Lead Submitted</span>
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Hero / Contact Lead Received</h1>
            <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">Starway Web Digital Lead Capture System</p>
          </td>
        </tr>

        <!-- Main Content Table -->
        <tr>
          <td style="padding: 30px 40px;">
            
            <!-- Lead Primary Contact Card -->
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 14px 0; font-size: 15px; color: #0A2458; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
                👤 Contact Information
              </h3>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; width: 35%; font-weight: 600; color: #64748b;">Full Name:</td>
                  <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${full_name || "—"}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Email Address:</td>
                  <td style="padding: 6px 0;"><a href="mailto:${email}" style="color: #2563eb; font-weight: 600; text-decoration: none;">${email || "—"}</a></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Phone Number:</td>
                  <td style="padding: 6px 0;"><a href="tel:${phone}" style="color: #0f172a; font-weight: 600; text-decoration: none;">${phone || "Not provided"}</a></td>
                </tr>
                ${
                  designation
                    ? `<tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Designation:</td>
                  <td style="padding: 6px 0; font-weight: 500;">${designation}</td>
                </tr>`
                    : ""
                }
                <tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Website URL:</td>
                  <td style="padding: 6px 0;">
                    ${
                      formattedWebsite
                        ? `<a href="${formattedWebsite}" target="_blank" style="color: #2563eb; font-weight: 600; text-decoration: underline;">${website_url}</a>`
                        : `<span style="color: #94a3b8; font-style: italic;">Not provided</span>`
                    }
                  </td>
                </tr>
              </table>
            </div>

            <!-- Services Requested -->
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0A2458; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
                🛠️ Requested Services
              </h3>
              <div>
                ${servicesHtml}
              </div>
            </div>

            <!-- Project Overview Message -->
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0A2458; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
                📝 Project Overview / Message
              </h3>
              <div style="background-color: #ffffff; border-left: 4px solid #2563eb; padding: 14px 18px; border-radius: 6px; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">
                ${project_overview || "<em style='color:#94a3b8;'>No additional details provided by the lead.</em>"}
              </div>
            </div>

            <!-- Action CTA Button -->
            <div style="text-align: center; margin-top: 28px;">
              <a href="mailto:${email}" style="display: inline-block; background-color: #0A2458; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px;">
                ✉️ Reply directly to ${full_name || "Lead"}
              </a>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #f1f5f9; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <p style="margin: 0 0 4px 0;">Received at: <strong>${new Date().toLocaleString()}</strong></p>
            <p style="margin: 0;">Starway Web Digital Automated Lead Routing System</p>
          </td>
        </tr>

      </table>
    </body>
    </html>
  `;

  return sendMail({
    to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
    subject: `🚨 New Lead: ${full_name || "Inquiry"} - Starway Web Digital`,
    html,
  });
};

// ─── SERVICE LEAD: USER EMAIL ───────────────────────────────────

const sendServiceLeadConfirmation = async ({
  business_name,
  email,
  challenge,
}) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Thank You for Requesting a Consultation</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
        <tr>
          <td style="background-color: #0A2458; padding: 28px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px;">Starway Web Digital</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px;">
            <h2 style="color: #0A2458; margin-top: 0;">Thanks ${business_name || "there"}!</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #475569;">
              We've received your service request regarding:
            </p>
            <div style="background-color: #f8fafc; border-left: 4px solid #0A2458; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-weight: 600; color: #1e293b;">
              ${challenge || "General Consultation Request"}
            </div>
            <p style="font-size: 15px; line-height: 1.6; color: #475569;">
              Our expert team will evaluate your project requirement and reach out shortly! 🚀
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
            © ${new Date().getFullYear()} Starway Web Digital. All rights reserved.
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendMail({
    to: email,
    subject: `Thanks for contacting us, ${business_name || "Valued Client"}`,
    html,
  });
};

// ─── SERVICE LEAD: ADMIN EMAIL ──────────────────────────────────

const sendServiceLeadAdminNotification = async ({
  business_name,
  email,
  challenge,
}) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Service Lead Received</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.25);">
        <tr>
          <td style="background-color: #0A2458; padding: 28px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px;">🚀 New Service Lead</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #334155;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; width: 35%;">Business / Name:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${business_name || "—"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600;">Email:</td>
                <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #2563eb; font-weight: 600;">${email || "—"}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; vertical-align: top;">Challenge / Goal:</td>
                <td style="padding: 8px 0;">${challenge || "—"}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
            Received at ${new Date().toLocaleString()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendMail({
    to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
    subject: `🚀 New Service Lead: ${business_name || "Inquiry"}`,
    html,
  });
};

// ─── EXPORTS ────────────────────────────────────────────────────

module.exports = {
  sendMail,
  sendContactConfirmation,
  sendAdminNotification,
  sendServiceLeadConfirmation,
  sendServiceLeadAdminNotification,
};