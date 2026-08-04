const { body, validationResult } = require("express-validator");

const contactRules = [

  body("full_name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[+\d\s\-().]{7,20}$/)
    .withMessage("Please provide a valid phone number"),

  body("designation")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Designation must be under 100 characters"),

  body("project_overview")
    .trim()
    .notEmpty()
    .withMessage("Project overview is required")
    .isLength({ max: 3000 })
    .withMessage("Message must be under 3000 characters"),

  body("website_url")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL({ require_protocol: false })
    .withMessage("Please provide a valid URL"),

  body("services")
    .custom((value) => {
      if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === "string" && !value.trim())) {
        throw new Error("Please select at least one service");
      }
      return true;
    }),
];

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

module.exports = validateContact;