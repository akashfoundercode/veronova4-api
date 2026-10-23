const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const crypto = require('crypto');
const { getJwtSecret, getSessionIdleTimeoutMinutes } = require('../utils/auth');

async function requireAuth(request, response, next) {
    try {
        const [scheme, token] = (request.headers.authorization || '').split(' ');
        if (scheme !== 'Bearer' || !token) return response.status(401).json({ message: 'Authentication token is required' });
        const payload = jwt.verify(token, getJwtSecret());
        const userId = payload.userId || payload.id || payload.sub;
        if (!userId) return response.status(401).json({ message: 'Invalid token payload' });
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const idleTimeoutMinutes = getSessionIdleTimeoutMinutes();
        const [sessionResult] = await pool.execute(`UPDATE user_sessions
            SET last_activity_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL ${idleTimeoutMinutes} MINUTE)
            WHERE user_id = ? AND token_hash = ? AND expires_at > NOW()
              AND NOT EXISTS (
                SELECT 1 FROM (SELECT id, user_id, created_at, expires_at FROM user_sessions) newer
                WHERE newer.user_id = user_sessions.user_id
                  AND (newer.created_at > user_sessions.created_at OR (newer.created_at = user_sessions.created_at AND newer.id > user_sessions.id))
                  AND newer.id <> user_sessions.id AND newer.expires_at > NOW()
              )`, [userId, tokenHash]);
        if (!sessionResult.affectedRows) {
            const [sessions] = await pool.execute(`SELECT id FROM user_sessions s WHERE user_id = ? AND token_hash = ? AND expires_at > NOW()
                AND NOT EXISTS (SELECT 1 FROM user_sessions newer WHERE newer.user_id = s.user_id AND newer.expires_at > NOW()
                    AND (newer.created_at > s.created_at OR (newer.created_at = s.created_at AND newer.id > s.id))) LIMIT 1`, [userId, tokenHash]);
            if (!sessions.length) {
                return response.status(401).json({ message: 'Session expired due to inactivity. Please log in again.' });
            }
        }
        request.sessionTokenHash = tokenHash;
        const [users] = await pool.execute('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [userId]);
        if (!users.length) return response.status(401).json({ message: 'User no longer exists' });
        request.user = users[0];
        return next();
    } catch (error) {
        return response.status(401).json({ message: 'Invalid or expired authentication token' });
    }
}

async function optionalAuth(request, response, next) {
    try {
        const [scheme, token] = (request.headers.authorization || '').split(' ');
        if (scheme === 'Bearer' && token) {
            const payload = jwt.verify(token, getJwtSecret());
            const userId = payload?.userId || payload?.id || payload?.sub;
            if (userId) {
                const [users] = await pool.execute('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [userId]);
                if (users.length) {
                    request.user = users[0];
                }
            }
        }
    } catch (error) {
        // Ignore token errors for optional auth
    }
    return next();
}

async function requireAdmin(request, response, next) {
    try {
        const [scheme, token] = (request.headers.authorization || '').split(' ');
        if (scheme !== 'Bearer' || !token) return response.status(401).json({ message: 'Admin session is required' });
        const payload = jwt.verify(token, getJwtSecret());
        const adminId = payload.adminId;
        if (!adminId || !payload.adminSession) return response.status(401).json({ message: 'Invalid admin session' });
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const [rows] = await pool.execute(`SELECT a.id, a.username, a.email, a.created_at
            FROM admin_sessions s JOIN admins a ON a.id = s.admin_id
            WHERE s.admin_id = ? AND s.token_hash = ? AND s.expires_at > NOW() LIMIT 1`, [adminId, tokenHash]);
        if (!rows.length) return response.status(401).json({ message: 'Admin session has expired or been revoked' });
        request.admin = rows[0];
        return next();
    } catch (error) {
        return response.status(401).json({ message: 'Invalid or expired admin session' });
    }
}

requireAuth.requireAuth = requireAuth;
requireAuth.authenticateToken = requireAuth;
requireAuth.authenticate = requireAuth;
requireAuth.optionalAuth = optionalAuth;
requireAuth.requireAdmin = requireAdmin;

module.exports = requireAuth;
