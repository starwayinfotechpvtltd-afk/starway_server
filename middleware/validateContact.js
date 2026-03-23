import { body, validationResult } from "express-validator";

// ─── Rules ────────────────────────────────────────────────────────────────────
// Mandatory : full_name, email, phone
// Optional  : designation, project_overview, website_url

const contactRules = [

  // Full Name — mandatory
  body("full_name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),

  // Email — mandatory
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  // Phone — mandatory
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[+\d\s\-().]{7,20}$/)
    .withMessage("Please provide a valid phone number"),

  // Designation — optional, save as-is
  body("designation")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Designation must be under 100 characters"),

  // Project Overview — optional
  body("project_overview")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 3000 })
    .withMessage("Message must be under 3000 characters"),

  // Website URL — optional
  body("website_url")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL({ require_protocol: true })
    .withMessage("Please provide a valid URL including http:// or https://"),
];

// ─── Result handler ───────────────────────────────────────────────────────────

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors:  errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
    });
  }

  next();
};

const validateContact = [...contactRules, handleValidationErrors];

export default validateContact;