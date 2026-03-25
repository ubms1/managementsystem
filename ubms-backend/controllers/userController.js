const User = require('../models/User');
const { pool } = require('../config/db');

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.getAllUsers();
        res.json(users);
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
};

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.getUserById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
};

// Get user by username
exports.getUserByUsername = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
};

// Get user by email
exports.getUserByEmail = async (req, res) => {
    try {
        const { email } = req.params;
        const user = await User.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
};

// Create new user
exports.createUser = async (req, res) => {
    try {
        const { name, username, email, password, role, companies, modules, mustChangePassword } = req.body;

        if (!name || !username || !email || !password) {
            return res.status(400).json({ success: false, error: 'Name, username, email, and password required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }

        // Check if username exists
        const existingUsername = await User.getUserByUsername(username);
        if (existingUsername) {
            return res.status(409).json({ success: false, error: 'Username already exists' });
        }

        // Check if email exists
        const existingEmail = await User.getUserByEmail(email);
        if (existingEmail) {
            return res.status(409).json({ success: false, error: 'Email already registered' });
        }

        const newUser = await User.createUser({
            name,
            username,
            email,
            password,
            role,
            companies,
            modules,
            mustChangePassword
        });

        await logAuditEntry('system', 'User Created', `Created user ${name} (${email}) with role: ${role}`, 'info');

        res.status(201).json({ success: true, user: newUser });
    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ success: false, error: 'Failed to create user' });
    }
};

// Update user
exports.updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        const user = await User.getUserById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Don't allow changing Super Admin's core properties
        if (user.isSuperAdmin && (updates.role || updates.status === 'inactive')) {
            return res.status(403).json({ success: false, error: 'Cannot modify Super Admin core settings' });
        }

        const updatedUser = await User.updateUser(userId, updates);

        await logAuditEntry('system', 'User Updated', `Updated user ${user.name}: ${Object.keys(updates).join(', ')}`, 'info');

        res.json({ success: true, user: updatedUser });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ success: false, error: 'Failed to update user' });
    }
};

// Deactivate user
exports.deactivateUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.getUserById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (user.isSuperAdmin) {
            return res.status(403).json({ success: false, error: 'Cannot deactivate Super Admin' });
        }

        const updatedUser = await User.deactivateUser(userId);

        await logAuditEntry('system', 'User Deactivated', `Deactivated user ${user.name}`, 'warning');

        res.json({ success: true, user: updatedUser });
    } catch (err) {
        console.error('Deactivate user error:', err);
        res.status(500).json({ success: false, error: 'Failed to deactivate user' });
    }
};

// Activate user
exports.activateUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.getUserById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const updatedUser = await User.activateUser(userId);

        await logAuditEntry('system', 'User Activated', `Activated user ${user.name}`, 'info');

        res.json({ success: true, user: updatedUser });
    } catch (err) {
        console.error('Activate user error:', err);
        res.status(500).json({ success: false, error: 'Failed to activate user' });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.getUserById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (user.isSuperAdmin) {
            return res.status(403).json({ success: false, error: 'Cannot delete Super Admin' });
        }

        await User.deleteUser(userId);

        await logAuditEntry('system', 'User Deleted', `Deleted user ${user.name} (${user.email})`, 'warning');

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete user' });
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
