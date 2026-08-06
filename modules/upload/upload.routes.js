const express = require("express");
const router = express.Router();
const multer = require("multer");
const { uploadImage } = require("./upload.controller");

// Memory storage for file buffer processing
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// POST /api/upload
router.post("/", upload.single("image"), uploadImage);

module.exports = router;
