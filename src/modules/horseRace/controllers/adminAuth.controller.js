const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { getJwtSecret } = require('../utils/auth');

const SESSION_DAYS = Number(process.env.ADMIN_SESSION_DAYS || 7);
const RESET_MINUTES = Number(process.env.ADMIN_RESET_MINUTES || 30);
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const publicAdmin = (user) => ({ id: user.id, username: user.username, email: user.email, role: user.role, createdAt: user.created_at });

async function login(req, res, next) {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
        const [admins] = await pool.execute('SELECT * FROM admins WHERE email = ? LIMIT 1', [String(email).trim().toLowerCase()]);
        const admin = admins[0];
        if (!admin || !(await bcrypt.compare(password, admin.password_hash))) return res.status(401).json({ message: 'Invalid admin email or password' });
        const token = jwt.sign({ adminId: admin.id, adminSession: true }, getJwtSecret(), { expiresIn: `${SESSION_DAYS}d` });
        const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
        await pool.execute('INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?, ?, ?)', [admin.id, hashToken(token), expiresAt]);
        return res.json({ success: true, message: 'Admin login successful', token, expiresAt, admin: publicAdmin(admin) });
    } catch (error) { return next(error); }
}

async function forgotPassword(req, res, next) {
    try {
        const email = req.body?.email;
        if (!email || typeof email !== 'string') return res.status(400).json({ message: 'A valid email is required' });
        const [admins] = await pool.execute('SELECT id FROM admins WHERE email = ? LIMIT 1', [email.trim().toLowerCase()]);
        const response = { success: true, message: 'If the admin account exists, password reset instructions have been created' };
        if (!admins.length) return res.json(response);
        const rawToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + RESET_MINUTES * 60000);
        await pool.execute('UPDATE admin_password_resets SET used_at = NOW() WHERE admin_id = ? AND used_at IS NULL', [admins[0].id]);
        await pool.execute('INSERT INTO admin_password_resets (admin_id, token_hash, expires_at) VALUES (?, ?, ?)', [admins[0].id, hashToken(rawToken), expiresAt]);
        // Password reset token is strictly sent via internal/mail channels and never exposed in HTTP responses.
        return res.json(response);
    } catch (error) { return next(error); }
}

async function resetPassword(req, res, next) {
    const connection = await pool.getConnection();
    try {
        const { token, password } = req.body || {};
        if (!token || typeof token !== 'string') return res.status(400).json({ message: 'Reset token is required' });
        if (!password || typeof password !== 'string' || password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
        await connection.beginTransaction();
        const [resets] = await connection.execute("SELECT id, admin_id FROM admin_password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1 FOR UPDATE", [hashToken(token)]);
        if (!resets.length) { await connection.rollback(); return res.status(400).json({ message: 'Reset token is invalid or expired' }); }
        const reset = resets[0];
        const passwordHash = await bcrypt.hash(password, 12);
        await connection.execute('UPDATE admins SET password_hash = ? WHERE id = ?', [passwordHash, reset.admin_id]);
        await connection.execute('UPDATE admin_password_resets SET used_at = NOW() WHERE admin_id = ? AND used_at IS NULL', [reset.admin_id]);
        await connection.execute('DELETE FROM admin_sessions WHERE admin_id = ?', [reset.admin_id]);
        await connection.commit();
        return res.json({ success: true, message: 'Admin password reset successful. Please log in again.' });
    } catch (error) { try { await connection.rollback(); } catch (_) {} return next(error); }
    finally { connection.release(); }
}

async function logout(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) await pool.execute('DELETE FROM admin_sessions WHERE token_hash = ?', [hashToken(token)]);
        return res.json({ success: true, message: 'Admin session ended' });
    } catch (error) { return next(error); }
}

async function me(req, res) { return res.json({ success: true, admin: publicAdmin(req.admin) }); }

module.exports = { login, forgotPassword, resetPassword, logout, me };
