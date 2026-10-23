const express = require('express');
const uploadHorseImage = require('../middleware/upload.middleware');
const {
    getAllHorses,
    getHorseById,
    createHorse,
    updateHorse,
    deleteHorse,
    uploadImage,
    updateHorseImage,
} = require('../controllers/horse.controller');

const router = express.Router();
const requireAuth = require('../middleware/auth.middleware');
const requireAdmin = requireAuth.requireAdmin;
const { API_ROUTES } = require('../../../config/apiRoutes');
const routes = API_ROUTES.horseRace.horse;

// Dedicated Image Upload Endpoints
router.post(routes.upload, requireAdmin, uploadHorseImage.single('image'), uploadImage);
router.post(routes.image, requireAdmin, uploadHorseImage.single('image'), updateHorseImage);

// Horse Management (Supports both JSON & multipart/form-data file upload)
router.get(API_ROUTES.horseRace.root, getAllHorses);
router.get(routes.id, getHorseById);
router.post(API_ROUTES.horseRace.root, requireAdmin, uploadHorseImage.single('image'), createHorse);
router.put(routes.id, requireAdmin, uploadHorseImage.single('image'), updateHorse);
router.patch(routes.id, requireAdmin, uploadHorseImage.single('image'), updateHorse);
router.delete(routes.id, requireAdmin, deleteHorse);

module.exports = router;
