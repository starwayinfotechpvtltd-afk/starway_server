const fs = require("fs");
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;

function cleanEnv(val) {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "");
}

async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file uploaded",
      });
    }

    const cloud_name = cleanEnv(process.env.CLOUDINARY_CLOUD_NAME);
    const api_key = cleanEnv(process.env.CLOUDINARY_API_KEY);
    const api_secret = cleanEnv(process.env.CLOUDINARY_API_SECRET);
    const upload_preset = cleanEnv(process.env.CLOUDINARY_UPLOAD_PRESET);

    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // 1. Try Unsigned Upload if CLOUDINARY_UPLOAD_PRESET is defined
    if (cloud_name && upload_preset) {
      try {
        const response = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
          {
            file: dataURI,
            upload_preset: upload_preset,
            folder: "starway_blogs",
          }
        );
        if (response.data && response.data.secure_url) {
          console.log("✅ Cloudinary Unsigned Upload Success:", response.data.secure_url);
          return res.status(200).json({
            success: true,
            message: "Image uploaded to Cloudinary successfully",
            url: response.data.secure_url,
          });
        }
      } catch (presetErr) {
        console.error("⚠️ Unsigned preset error:", presetErr.response?.data || presetErr.message);
      }
    }

    // 2. Try Signed Upload via Cloudinary SDK if credentials exist
    if (cloud_name && api_key && api_secret) {
      cloudinary.config({
        cloud_name,
        api_key,
        api_secret,
        secure: true,
      });

      try {
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: "starway_blogs",
          resource_type: "auto",
        });

        console.log("✅ Uploaded to Cloudinary successfully:", result.secure_url);

        return res.status(200).json({
          success: true,
          message: "Image uploaded to Cloudinary successfully",
          url: result.secure_url,
          public_id: result.public_id,
        });
      } catch (cloudErr) {
        console.error("⚠️ Cloudinary signed upload error:", cloudErr.message || cloudErr);
      }
    }

    // 3. Local Storage Fallback if Cloudinary credentials restricted or missing
    const uploadsDir = path.join(__dirname, "../../uploads/blogs");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(req.file.originalname) || ".jpg";
    const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, req.file.buffer);

    const protocol = req.protocol || "http";
    const host = req.get("host") || "localhost:5002";
    const localUrl = `${protocol}://${host}/uploads/blogs/${filename}`;

    console.log("📁 Saved image locally:", localUrl);

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully (Saved locally)",
      url: localUrl,
    });
  } catch (error) {
    console.error("Upload handler error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload image",
    });
  }
}

module.exports = {
  uploadImage,
};
