import { body, validationResult } from "express-validator";
import { VALID_SERVICES } from "../modules/contact/contact.model.js";

// ─── Validation Rules — mirrors HeroLeadForm fields exactly ──────────────────

const contactRules = [
  // Full Name
  body("full_name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),

  // Work Email
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  // Phone Number (optional)
  body("phone")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[+\d\s\-().]{7,20}$/)
    .withMessage("Please provide a valid phone number"),

  // Project Overview
  body("project_overview")
    .trim()
    .notEmpty()
    .withMessage("Project overview is required")
    .isLength({ min: 10, max: 3000 })
    .withMessage("Project overview must be between 10 and 3000 characters"),

  // Website URL (optional)
  body("website_url")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL({ require_protocol: true })
    .withMessage("Please provide a valid URL including http:// or https://"),

  // Services — array of checkbox values (optional, but each must be a valid option)
  body("services")
    .optional({ nullable: true })
    .isArray({ max: VALID_SERVICES.length })
    .withMessage("Services must be an array"),

  body("services.*")
    .optional()
    .trim()
    .isIn(VALID_SERVICES)
    .withMessage(
      `Each service must be one of: ${VALID_SERVICES.join(", ")}`
    ),
];

// ─── Validation Result Handler ────────────────────────────────────────────────

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formatted = errors.array().map(({ path, msg }) => ({
      field:   path,
      message: msg,
    }));

    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors:  formatted,
    });
  }

  next();
};

// Export as a middleware array — spread directly into route definition
const validateContact = [...contactRules, handleValidationErrors];

export default validateContact;