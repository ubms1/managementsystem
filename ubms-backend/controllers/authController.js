const User = require('../models/User');
const { pool } = require('../config/db');
require('dotenv').config();

// Regular user login
exports.login = async (req, res) => {
    try {
        const { username, password, company } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password required' });
        }

        const user = await User.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }

        if (user.password !== password) {
            return res.status(401).json({ success: false, error: 'Invalid password' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ success: false, error: 'Account is deactivated' });
        }

        // Check company access
        if (!user.companies.includes('all') && company !== 'all' && !user.companies.includes(company)) {
            return res.status(403).json({ success: false, error: 'No access to this company' });
        }

        // Update last login
        await User.updateLastLogin(user.id);

        // Log audit entry
        await logAuditEntry(user.username, 'Login', `User logged in from company: ${company || 'all'}`, 'info');

        return res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                companies: user.companies,
                modules: user.modules,
                company: user.companies.includes('all') ? (company || 'all') : user.companies[0],
                isSuperAdmin: user.isSuperAdmin,
                avatar: user.avatar,
                mustChangePassword: user.mustChangePassword ? true : false
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
};

// Super Admin authentication by code
exports.superAdminLogin = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ success: false, error: 'Super Admin code required' });
        }

        // Fetch Super Admin account (if present) to allow fallback matching
        const user = await User.getUserByUsername('superadmin');

        // Primary: match against configured SA_CODE environment value
        const configuredCode = (process.env.SA_CODE || '').trim();
        const matchesConfigured = configuredCode && code === configuredCode;

        // Fallback: if no configured code or mismatch, allow using the seeded superadmin password
        const matchesSeedPassword = user && user.password && code === user.password;

        if (!matchesConfigured && !matchesSeedPassword) {
            return res.status(401).json({ success: false, error: 'Invalid Super Admin code' });
        }

        if (!user) {
            return res.status(401).json({ success: false, error: 'Super Admin account not found' });
        }

        // Update last login
        await User.updateLastLogin(user.id);

        // Log audit entry
        await logAuditEntry(user.username, 'Super Admin Login', 'Super Admin accessed system', 'warning');

        return res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: 'superadmin',
                companies: ['all'],
                modules: ['all'],
                company: 'all',
                isSuperAdmin: true,
                avatar: user.avatar
            }
        });
    } catch (err) {
        console.error('Super Admin login error:', err);
        res.status(500).json({ success: false, error: 'Super Admin authentication failed' });
    }
};

// Password reset via forgot-password
exports.resetPassword = async (req, res) => {
    try {
        const { username, email, newPassword } = req.body;

        if (!username || !email || !newPassword) {
            return res.status(400).json({ success: false, error: 'Username, email, and new password required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
        }

        const user = await User.getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (user.email !== email) {
            return res.status(400).json({ success: false, error: 'Username and email do not match' });
        }

        if (user.isSuperAdmin) {
            return res.status(403).json({ success: false, error: 'Super Admin password cannot be reset here' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ success: false, error: 'Account is deactivated' });
        }

        await User.updateUser(user.id, { password: newPassword, mustChangePassword: false });

        await logAuditEntry(username, 'Password Reset', `Password reset via forgot-password`, 'warning');

        return res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(500).json({ success: false, error: 'Password reset failed' });
    }
};

// Update Super Admin code
exports.updateSuperAdminCode = async (req, res) => {
    try {
        const { currentCode, newCode } = req.body;

        if (!currentCode || !newCode) {
            return res.status(400).json({ success: false, error: 'Current and new codes required' });
        }

        if (currentCode !== process.env.SA_CODE) {
            return res.status(401).json({ success: false, error: 'Current access code is incorrect' });
        }

        if (newCode.length < 6) {
            return res.status(400).json({ success: false, error: 'New code must be at least 6 characters' });
        }

        // Note: In production, save this to database or environment securely
        process.env.SA_CODE = newCode;

        await logAuditEntry('system', 'SA Code Changed', 'Super Admin access code was updated', 'warning');

        return res.json({ success: true, message: 'Super Admin code updated successfully' });
    } catch (err) {
        console.error('SA code update error:', err);
        res.status(500).json({ success: false, error: 'SA code update failed' });
    }
};

// Helper function to log audit entries
async function logAuditEntry(username, action, detail, level = 'info') {
    try {
        await pool.query(
            'INSERT INTO audit_logs (user, action, detail, level) VALUES (?, ?, ?, ?)',
            [username, action, detail, level]
        );
    } catch (err) {
        console.error('Audit log error:', err);
    }
}

module.exports = exports;
