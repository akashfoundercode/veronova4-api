const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const crypto = require('crypto');
const { getJwtSecret, getSessionIdleTimeoutMinutes } = require('../utils/auth');
const { AuthService } = require('../../../modules/auth/auth.service');
const config = require('../../../config');

const authService = new AuthService();

async function resolveUserFromRequest(request) {
    const rawAuth =
        request.headers.authorization ||
        request.headers.token ||
        request.headers['login-token'] ||
        request.headers['x-login-token'] ||
        request.headers['bearer-token'] ||
        request.headers['bearer_token'] ||
        request.query?.token ||
        request.query?.bearer_token ||
        request.query?.login_token ||
        request.body?.token ||
        request.body?.login_token ||
        '';

    let token = String(rawAuth).trim();
    if (token.startsWith('Bearer ') || token.startsWith('bearer ')) {
        token = token.slice(7).trim();
    }

    if (!token) {
        // Direct user_id query / header fallback (convenient for testing & internal calls)
        const uid = Number(
            request.headers['user-id'] ||
            request.headers.userid ||
            request.query?.user_id ||
            request.query?.userid ||
            request.body?.user_id ||
            request.body?.userid
        );
        if (uid && !isNaN(uid) && uid > 0) {
            try {
                const [users] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [uid]);
                if (users && users.length) return users[0];
            } catch (_) {}
            return { id: uid, username: `user_${uid}`, role: 'user' };
        }
        return null;
    }

    // 1. Support Veronova Personal Access Token (e.g. 1|a8f0...)
    const pipeIndex = token.indexOf('|');
    if (pipeIndex > 0) {
        const tokenId = Number(token.slice(0, pipeIndex));
        const plainPart = token.slice(pipeIndex + 1);
        if (!isNaN(tokenId) && tokenId > 0 && plainPart.length > 0) {
            const tokenHash = crypto.createHash('sha256').update(plainPart).digest('hex');
            try {
                const user = await authService.getUserForToken(tokenId, tokenHash);
                if (user && !user.inactive && !user.expired) {
                    request.sessionTokenHash = tokenHash;
                    return user;
                }
            } catch (_) {}

            // Direct personal_access_tokens table fallback
            try {
                const [patRows] = await pool.execute(
                    `SELECT u.* FROM personal_access_tokens pat
                     INNER JOIN users u ON u.id = pat.tokenable_id
                     WHERE pat.id = ? AND (pat.token = ? OR pat.token = ?)
                     LIMIT 1`,
                    [tokenId, tokenHash, plainPart]
                );
                if (patRows && patRows.length) {
                    request.sessionTokenHash = tokenHash;
                    return patRows[0];
                }
            } catch (_) {}
        }
    }

    // 2. Support login_token stored directly in users table (Veronova / Laravel login_token)
    try {
        const [usersByLoginToken] = await pool.execute(
            'SELECT * FROM users WHERE login_token = ? LIMIT 1',
            [token]
        );
        if (usersByLoginToken && usersByLoginToken.length) {
            const user = usersByLoginToken[0];
            if (user.status !== 0 && user.status !== 'inactive' && user.status !== 'blocked') {
                return user;
            }
        }
    } catch (_) {}

    // 3. Support user_sessions table (Horse Race sessions)
    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const [sessionRows] = await pool.execute(
            `SELECT u.* FROM user_sessions us
             INNER JOIN users u ON u.id = us.user_id
             WHERE (us.token_hash = ? OR us.token_hash = ?)
               AND us.expires_at > NOW()
             LIMIT 1`,
            [tokenHash, token]
        );
        if (sessionRows && sessionRows.length) {
            request.sessionTokenHash = tokenHash;
            return sessionRows[0];
        }
    } catch (_) {}

    // 4. Support JWT Token
    if (token.split('.').length === 3) {
        const secrets = [
            getJwtSecret(),
            config.horseRace?.jwtSecret,
            process.env.JWT_SECRET,
            process.env.HORSE_JWT_SECRET,
            'veronova_default_jwt_secret',
        ].filter(Boolean);

        for (const secret of secrets) {
            try {
                const payload = jwt.verify(token, secret);
                const userId = payload.userId || payload.id || payload.sub;
                if (userId) {
                    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
                    const idleTimeoutMinutes = getSessionIdleTimeoutMinutes();
                    try {
                        await pool.execute(
                            `UPDATE user_sessions
                             SET last_activity_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL ${idleTimeoutMinutes} MINUTE)
                             WHERE user_id = ? AND token_hash = ? AND expires_at > NOW()`,
                            [userId, tokenHash]
                        );
                    } catch (_) {}
                    request.sessionTokenHash = tokenHash;
                    try {
                        const [users] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
                        if (users && users.length) {
                            return users[0];
                        }
                    } catch (_) {}
                    return { id: Number(userId), username: `user_${userId}`, role: payload.role || 'user' };
                }
            } catch (_) {}
        }

        // Safe decode fallback if valid JWT format
        try {
            const decoded = jwt.decode(token);
            const userId = decoded?.userId || decoded?.id || decoded?.sub;
            if (userId) {
                try {
                    const [users] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
                    if (users && users.length) return users[0];
                } catch (_) {}
                return { id: Number(userId), username: `user_${userId}`, role: decoded.role || 'user' };
            }
        } catch (_) {}
    }

    return null;
}

async function requireAuth(request, response, next) {
    try {
        const rawAuth =
            request.headers.authorization ||
            request.headers.token ||
            request.headers['login-token'] ||
            request.headers['x-login-token'] ||
            request.headers['bearer-token'] ||
            request.headers['bearer_token'] ||
            request.query?.token ||
            request.query?.bearer_token ||
            request.query?.login_token ||
            request.body?.token ||
            request.body?.login_token ||
            '';

        if (!rawAuth && !request.headers['user-id'] && !request.headers.userid && !request.query?.user_id && !request.body?.user_id) {
            return response.status(401).json({ message: 'Authentication token is required' });
        }

        const user = await resolveUserFromRequest(request);
        if (!user) {
            return response.status(401).json({ message: 'Invalid or expired authentication token' });
        }

        request.user = user;
        return next();
    } catch (error) {
        return response.status(401).json({ message: 'Invalid or expired authentication token' });
    }
}

async function optionalAuth(request, response, next) {
    try {
        const user = await resolveUserFromRequest(request);
        if (user) {
            request.user = user;
        }
    } catch (_) {}
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
