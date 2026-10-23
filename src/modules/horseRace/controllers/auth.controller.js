const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createUserSession, getJwtSecret, getSessionIdleTimeoutMinutes, publicUser } = require('../utils/auth');
const WalletService = require('../services/wallet.service');

function validateCredentials(username, email, password, registration) {
    if (registration && (!username || typeof username !== 'string' || username.trim().length < 3)) return 'Username must be at least 3 characters';
    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) return 'A valid email is required';
    if (!password || typeof password !== 'string' || (registration && password.length < 6)) return 'Password is required and must be at least 6 characters';
    return null;
}

async function register(request, response, next) {
    try {
        const body = request.body || {};
        const username = body.username || body.userName || body.name;
        const { email, password } = body;
        const validationError = validateCredentials(username, email, password, true);
        if (validationError) return response.status(400).json({ message: validationError });
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedUsername = username.trim();
        const [existingUsers] = await pool.execute('SELECT id, email, username FROM users WHERE email = ? OR username = ?', [normalizedEmail, normalizedUsername]);
        if (existingUsers.some((user) => user.email === normalizedEmail)) return response.status(409).json({ message: 'Email is already registered' });
        if (existingUsers.some((user) => user.username === normalizedUsername)) return response.status(409).json({ message: 'Username is already taken' });
        const passwordHash = await bcrypt.hash(password, 12);
        const [result] = await pool.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [normalizedUsername, normalizedEmail, passwordHash]);
        const [users] = await pool.execute('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [result.insertId]);
        if (!users || !users.length) {
            return response.status(500).json({ message: 'Registration succeeded but failed to fetch user profile' });
        }
        const user = publicUser(users[0]);
        // Auto-create & link user wallet
        const wallet = await WalletService.getWalletByUserId(user.id);
        return response.status(201).json({
            message: 'Registration successful',
            token: await createUserSession(user.id),
            sessionTimeoutMs: getSessionIdleTimeoutMinutes() * 60 * 1000,
            user,
            wallet,
            balance: wallet.balance,
            coins: wallet.balance,
            displayBalance: wallet.displayBalance,
            totalWon: wallet.totalWon,
            displayTotalWon: wallet.displayTotalWon,
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return response.status(409).json({ message: 'Email or username is already registered' });
        return next(error);
    }
}

async function login(request, response, next) {
    try {
        const { email, password } = request.body || {};
        const validationError = validateCredentials(null, email, password, false);
        if (validationError) return response.status(400).json({ message: validationError });
        const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        const user = users[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) return response.status(401).json({ message: 'Invalid email or password' });

        // Serialize logins per user so two devices cannot create sessions at once.
        const connection = await pool.getConnection();
        let token;
        try {
            await connection.beginTransaction();
            await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [user.id]);
            const [activeSessions] = await connection.execute(
                'SELECT id FROM user_sessions WHERE user_id = ? AND expires_at > NOW() LIMIT 1',
                [user.id]
            );
            if (activeSessions.length) {
                await connection.rollback();
                return response.status(409).json({
                    message: 'This account is already logged in on another device. Please log out there or wait for the session to expire.',
                    code: 'ACCOUNT_ALREADY_LOGGED_IN',
                });
            }

            token = jwt.sign({ userId: user.id }, getJwtSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            const idleTimeoutMinutes = getSessionIdleTimeoutMinutes();
            await connection.execute(`INSERT INTO user_sessions (user_id, token_hash, last_activity_at, expires_at)
                VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ${idleTimeoutMinutes} MINUTE))`, [user.id, tokenHash]);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

        const wallet = await WalletService.getWalletByUserId(user.id);
        return response.json({
            message: 'Login successful',
            token,
            sessionTimeoutMs: getSessionIdleTimeoutMinutes() * 60 * 1000,
            user: publicUser(user),
            wallet,
            balance: wallet.balance,
            coins: wallet.balance,
            displayBalance: wallet.displayBalance,
            totalWon: wallet.totalWon,
            displayTotalWon: wallet.displayTotalWon,
        });
    } catch (error) {
        return next(error);
    }
}

async function me(request, response) {
    try {
        const user = publicUser(request.user);
        const wallet = await WalletService.getWalletByUserId(user.id);
        return response.json({
            success: true,
            user,
            wallet,
            balance: wallet.balance,
            coins: wallet.balance,
            displayBalance: wallet.displayBalance,
            totalWon: wallet.totalWon,
            displayTotalWon: wallet.displayTotalWon,
        });
    } catch (err) {
        return response.json({ success: true, user: publicUser(request.user) });
    }
}

async function logout(request, response) {
    await pool.execute('DELETE FROM user_sessions WHERE token_hash = ?', [request.sessionTokenHash]);
    return response.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
}

function activity(request, response) {
    return response.json({
        success: true,
        sessionTimeoutMs: getSessionIdleTimeoutMinutes() * 60 * 1000,
    });
}

module.exports = { register, login, me, logout, activity };
