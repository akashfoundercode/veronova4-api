const express = require('express');
const { register, login, me, logout, activity } = require('../controllers/auth.controller');
const requireAuth = require('../middleware/auth.middleware');
const { API_ROUTES } = require('../../../config/apiRoutes');
const routes = API_ROUTES.horseRace.auth;

const router = express.Router();
router.post(routes.register, register);
router.post(routes.login, login);
router.get(routes.me, requireAuth, me);
router.post(routes.activity, requireAuth, activity);
router.post(routes.logout, requireAuth, logout);
router.get(routes.logout, requireAuth, logout);

module.exports = router;