const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const config = require('../../../config');

function getJwtSecret() {
    return (
        config.horseRace?.jwtSecret ||
        process.env.JWT_SECRET ||
        process.env.HORSE_JWT_SECRET ||
        "veronova_default_jwt_secret"
    );
}

function getSessionIdleTimeoutMinutes() {
    const configuredMinutes = Number.parseInt(process.env.SESSION_IDLE_TIMEOUT_MINUTES, 10);
    return Number.isInteger(configuredMinutes) && configuredMinutes > 0 ? configuredMinutes : 15;
}

function createToken(userId) {
    return jwt.sign({ userId }, getJwtSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

async function createUserSession(userId) {
    const token = createToken(userId);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const idleTimeoutMinutes = getSessionIdleTimeoutMinutes();
    await pool.execute(`INSERT INTO user_sessions (user_id, token_hash, last_activity_at, expires_at)
        VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ${idleTimeoutMinutes} MINUTE))`, [userId, tokenHash]);
    return token;
}

function publicUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
    };
}

module.exports = { createToken, createUserSession, getJwtSecret, getSessionIdleTimeoutMinutes, publicUser };
