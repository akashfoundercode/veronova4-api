"use strict";

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(process.cwd(), "uploads", "sliders");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdir(uploadDir, { recursive: true }, (error) => cb(error, uploadDir));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    cb(null, `slider-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!file) return cb(null, true);
  const allowed = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ];
  if (allowed.includes(file.mimetype) || (file.mimetype && file.mimetype.startsWith("image/"))) {
    cb(null, true);
  } else {
    cb(null, true); // Permissive to allow files
  }
};

const uploadInstance = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});

const uploadBannerImage = (req, res, next) => {
  uploadInstance.any()(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        status: 400,
        message: err.message || "File upload error",
      });
    }
    next();
  });
};

module.exports = {
  uploadBannerImage,
};
