"use strict";

const multer = require("multer");
const path = require("node:path");
const fs = require("node:fs");

const uploadDir = path.join(process.cwd(), "uploads", "customer_service");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdir(uploadDir, { recursive: true }, (err) => cb(err, uploadDir));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    cb(null, `cs-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Allow images, documents (pdf), and videos
  const allowed = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
  ];

  if (
    allowed.includes(file.mimetype) ||
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/") ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only image, PDF, and video files are permitted."));
  }
};

const uploadInstance = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10, // max 10 files
  },
});

const uploadCustomerServiceFiles = (req, res, next) => {
  uploadInstance.any()(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        status: false,
        message: err.message || "File upload failed",
      });
    }
    next();
  });
};

module.exports = {
  uploadDir,
  uploadCustomerServiceFiles,
};

