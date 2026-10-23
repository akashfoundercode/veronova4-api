const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(process.cwd(), 'uploads', 'horses');

// Storage engine configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.mkdir(uploadDir, { recursive: true }, (error) => cb(error, uploadDir));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        cb(null, `horse-${uniqueSuffix}${ext}`);
    },
});

// File filter (Allow all image formats including GIF, WEBP, SVG, PNG, JPG, JPEG)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
    ];

    if (allowedMimeTypes.includes(file.mimetype) || (file.mimetype && file.mimetype.startsWith('image/'))) {
        cb(null, true);
    } else {
        const error = new Error('Only image files (PNG, JPG, JPEG, WEBP, GIF, SVG) are allowed');
        error.statusCode = 400;
        cb(error, false);
    }
};

const uploadInstance = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15MB limit (supports animated GIFs and high-res images)
    },
});

// Universal Multer middleware that accepts ANY field name (image, image_url, file, photo, avatar, etc.)
const uploadHorseImage = (req, res, next) => {
    uploadInstance.any()(req, res, (err) => {
        if (err) {
            return next(err);
        }
        // Normalize: If any file was uploaded under any field name, set req.file to the first image file
        if (req.files && req.files.length > 0) {
            req.file = req.files[0];
        }
        next();
    });
};

uploadHorseImage.single = () => uploadHorseImage;
uploadHorseImage.any = () => uploadHorseImage;

module.exports = uploadHorseImage;
