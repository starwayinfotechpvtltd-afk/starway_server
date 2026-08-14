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
  service_name = "Digital Marketing & Strategy",
}) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Thank You for Your Consultation Request - Starway Web Digital</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
        <tr>
          <td style="background-color: #0A2458; padding: 28px 36px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Starway Web Digital</h1>
            <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">Service Consultation Request Received</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 36px 36px 24px 36px;">
            <h2 style="color: #0A2458; margin: 0 0 12px 0; font-size: 20px;">Hello ${business_name || "there"},</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
              Thank you for requesting a consultation for <strong>${service_name}</strong>. Our digital strategy specialists are reviewing your request and will reach out with a tailored roadmap within <strong>24 hours</strong>.
            </p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0A2458;">📋 Summary of Your Request</h3>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #334155;">
                <tr>
                  <td style="padding: 6px 0; font-weight: 600; width: 35%; color: #64748b;">Requested Service:</td>
                  <td style="padding: 6px 0; font-weight: 700; color: #2563eb;">${service_name}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Business / Name:</td>
                  <td style="padding: 6px 0; font-weight: 600;">${business_name}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Email Address:</td>
                  <td style="padding: 6px 0;">${email}</td>
                </tr>
                ${
                  challenge
                    ? `<tr>
                        <td style="padding: 6px 0; font-weight: 600; color: #64748b; vertical-align: top;">Key Challenge:</td>
                        <td style="padding: 6px 0; color: #0f172a;">${challenge}</td>
                      </tr>`
                    : ""
                }
              </table>
            </div>

            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 18px; border-radius: 6px;">
              <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
                📞 Need immediate assistance? Call us directly at <strong><a href="tel:+918100595482" style="color: #1e40af; text-decoration: underline;">+91 81005 95482</a></strong> or chat with us on <strong><a href="https://wa.me/918100595482" style="color: #1e40af; text-decoration: underline;">WhatsApp</a></strong>.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f1f5f9; padding: 18px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            © ${new Date().getFullYear()} Starway Web Digital. All rights reserved.
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendMail({
    to: email,
    subject: `Consultation Confirmed: ${service_name} - Starway Web Digital`,
    html,
  });
};

// ─── SERVICE LEAD: ADMIN EMAIL ──────────────────────────────────

const sendServiceLeadAdminNotification = async ({
  business_name,
  email,
  challenge,
  service_name = "Digital Marketing",
}) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Service Consultation Lead</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.25);">
        <tr>
          <td style="background-color: #0A2458; padding: 28px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px;">🚀 New Service Consultation Lead</h1>
            <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">Service: ${service_name}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #334155;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; width: 35%; color: #64748b;">Service Name:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #2563eb;">${service_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Business / Name:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${business_name || "—"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Email Address:</td>
                <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #2563eb; font-weight: 600;">${email || "—"}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #64748b; vertical-align: top;">Key Challenge:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${challenge || "—"}</td>
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

// ─── NEWSLETTER: SUBSCRIBER WELCOME EMAIL ───────────────────────

const sendSubscriberWelcomeEmail = async ({ email }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Starway Web Digital Insights</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background-color: #0A2458; padding: 32px 40px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Starway Web Digital</h1>
            <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 14px;">Growth Strategies, Case Studies & Digital Insights</p>
          </td>
        </tr>

        <!-- Hero Greeting -->
        <tr>
          <td style="padding: 40px 40px 20px 40px;">
            <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px;">
              🎉 SUBSCRIPTION CONFIRMED
            </div>
            <h2 style="margin: 0 0 12px 0; color: #0A2458; font-size: 22px;">You're on the insider list!</h2>
            <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #475569;">
              Thank you for subscribing to <strong>Starway Web Digital</strong>. You are now set up to receive real-time updates whenever we publish new in-depth articles, actionable marketing playbooks, and high-ROI client case studies.
            </p>
          </td>
        </tr>

        <!-- Value Pillars -->
        <tr>
          <td style="padding: 10px 40px 30px 40px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
              <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #0A2458; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                💡 What You Can Expect:
              </h3>
              
              <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.8;">
                <li><strong>Verified Case Studies:</strong> Real-world execution, ROAS benchmarks, and scalable funnel strategies.</li>
                <li><strong>SEO & PPC Breakdowns:</strong> Advanced search algorithm updates, AI search strategies, and paid ads tips.</li>
                <li><strong>Digital Architecture & UI/UX:</strong> Best practices for web design, performance, and conversion optimization.</li>
              </ul>
            </div>
          </td>
        </tr>

        <!-- Call to Action -->
        <tr>
          <td style="padding: 0 40px 40px 40px; text-align: center;">
            <a href="https://starwaywebdigital.com/portfolio" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(37,99,235,0.25);">
              Explore Latest Case Studies →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #f1f5f9; padding: 24px 40px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #334155;">Starway Web Digital</p>
            <p style="margin: 0 0 8px 0;">You received this because you subscribed at starwaywebdigital.com.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendMail({
    to: email,
    subject: "Welcome to Starway Web Digital Insights 🚀",
    html,
  });
};

// ─── NEWSLETTER: ADMIN NEW SUBSCRIBER ALERT ─────────────────────

const sendAdminNewSubscriberNotification = async ({ email, source = "ServiceCTA" }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: sans-serif; background: #f8fafc; padding: 20px; color: #0f172a;">
      <table style="max-width: 550px; margin: auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="background: #0A2458; color: #ffffff; padding: 20px 24px; text-align: center;">
            <h2 style="margin: 0; font-size: 18px;">📬 New Newsletter Subscriber</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px;">
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">A new user has subscribed to Starway Web Digital updates:</p>
            <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 14px;">
              <p style="margin: 0 0 8px 0;"><strong>Subscriber Email:</strong> <a href="mailto:${email}" style="color: #2563eb;">${email}</a></p>
              <p style="margin: 0 0 8px 0;"><strong>Source Component:</strong> ${source}</p>
              <p style="margin: 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendMail({
    to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
    subject: `📬 New Subscriber: ${email}`,
    html,
  });
};

// ─── BROADCAST: NEW BLOG PUBLISHED TO ALL SUBSCRIBERS ────────────

const notifySubscribersNewBlog = async ({ blog, subscribers = [] }) => {
  if (!subscribers || subscribers.length === 0) return;

  const siteUrl = process.env.SITE_URL || "https://starwaywebdigital.com";
  const postUrl = `${siteUrl}/blogs/${blog.slug}`;
  const excerpt =
    blog.meta_description ||
    (blog.content ? blog.content.replace(/<[^>]*>/g, "").slice(0, 200) + "..." : "Read our latest article insights.");

  const emailSubject = `📰 New Article: ${blog.title}`;

  // Broadcast to all active subscribers
  for (const sub of subscribers) {
    const subscriberEmail = typeof sub === "string" ? sub : sub.email;
    if (!subscriberEmail) continue;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0A2458; padding: 28px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Starway Web Digital</h1>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">New Article Notification</p>
            </td>
          </tr>

          ${
            blog.featured_image
              ? `
          <!-- Featured Image -->
          <tr>
            <td style="padding: 0;">
              <img src="${blog.featured_image}" alt="${blog.title}" style="width: 100%; max-height: 280px; object-fit: cover; display: block;" />
            </td>
          </tr>
          `
              : ""
          }

          <!-- Article Content -->
          <tr>
            <td style="padding: 32px 40px 20px 40px;">
              <span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-bottom: 12px;">
                ${blog.category || "Article"}
              </span>
              <h2 style="margin: 0 0 14px 0; color: #0A2458; font-size: 22px; line-height: 1.4;">
                ${blog.title}
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                ${excerpt}
              </p>
              <div style="text-align: left; margin-top: 24px;">
                <a href="${postUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Read Full Article →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 40px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0;">You're receiving this because you subscribed to updates from Starway Web Digital.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    try {
      await sendMail({
        to: subscriberEmail,
        subject: emailSubject,
        html,
      });
    } catch (e) {
      console.warn(`Failed to send blog notification to ${subscriberEmail}:`, e.message);
    }
  }
};

// ─── BROADCAST: NEW PORTFOLIO / CASE STUDY TO ALL SUBSCRIBERS ────

const notifySubscribersNewPortfolio = async ({ portfolio, subscribers = [] }) => {
  if (!subscribers || subscribers.length === 0) return;

  const siteUrl = process.env.SITE_URL || "https://starwaywebdigital.com";
  const caseStudyUrl = `${siteUrl}/portfolio/${portfolio.slug || portfolio.id}`;
  const outcomeText = portfolio.outcome || "Delivered measurable digital growth and high ROI.";

  const emailSubject = `🚀 New Case Study: ${portfolio.title}`;

  for (const sub of subscribers) {
    const subscriberEmail = typeof sub === "string" ? sub : sub.email;
    if (!subscriberEmail) continue;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0A2458; padding: 28px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Starway Web Digital</h1>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">New Client Case Study Released</p>
            </td>
          </tr>

          ${
            portfolio.featured_image
              ? `
          <!-- Featured Image -->
          <tr>
            <td style="padding: 0;">
              <img src="${portfolio.featured_image}" alt="${portfolio.title}" style="width: 100%; max-height: 280px; object-fit: cover; display: block;" />
            </td>
          </tr>
          `
              : ""
          }

          <!-- Case Study Content -->
          <tr>
            <td style="padding: 32px 40px 20px 40px;">
              <span style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-bottom: 12px;">
                ${portfolio.category || "Case Study"}
              </span>
              <h2 style="margin: 0 0 14px 0; color: #0A2458; font-size: 22px; line-height: 1.4;">
                ${portfolio.title}
              </h2>

              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; color: #166534; font-weight: 600;">
                  🎯 Result: ${outcomeText}
                </p>
              </div>

              ${
                portfolio.client
                  ? `<p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b;"><strong>Client:</strong> ${portfolio.client} ${portfolio.industry ? `(${portfolio.industry})` : ""}</p>`
                  : ""
              }

              <div style="text-align: left; margin-top: 24px;">
                <a href="${caseStudyUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  View Full Case Study →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 40px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0;">You're receiving this because you subscribed to updates from Starway Web Digital.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    try {
      await sendMail({
        to: subscriberEmail,
        subject: emailSubject,
        html,
      });
    } catch (e) {
      console.warn(`Failed to send portfolio notification to ${subscriberEmail}:`, e.message);
    }
  }
};

// ─── EXPORTS ────────────────────────────────────────────────────

module.exports = {
  sendMail,
  sendContactConfirmation,
  sendAdminNotification,
  sendServiceLeadConfirmation,
  sendServiceLeadAdminNotification,
  sendSubscriberWelcomeEmail,
  sendAdminNewSubscriberNotification,
  notifySubscribersNewBlog,
  notifySubscribersNewPortfolio,
};