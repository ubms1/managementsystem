const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class User {
    // Get all users
    static async getAllUsers() {
        const [rows] = await pool.query('SELECT * FROM users WHERE isSuperAdmin = FALSE');
        return rows.map(user => ({
            ...user,
            companies: JSON.parse(user.companies || '[]'),
            modules: JSON.parse(user.modules || '[]')
        }));
    }

    // Get user by ID
    static async getUserById(userId) {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) return null;
        const user = rows[0];
        return {
            ...user,
            companies: JSON.parse(user.companies || '[]'),
            modules: JSON.parse(user.modules || '[]')
        };
    }

    // Get user by username
    static async getUserByUsername(username) {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return null;
        const user = rows[0];
        return {
            ...user,
            companies: JSON.parse(user.companies || '[]'),
            modules: JSON.parse(user.modules || '[]')
        };
    }

    // Get user by email
    static async getUserByEmail(email) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) return null;
        const user = rows[0];
        return {
            ...user,
            companies: JSON.parse(user.companies || '[]'),
            modules: JSON.parse(user.modules || '[]')
        };
    }

    // Create new user
    static async createUser(userData) {
        const userId = 'USR-' + uuidv4().substring(0, 8).toUpperCase();
        const companies = JSON.stringify(userData.companies || []);
        const modules = JSON.stringify(userData.modules || []);
        const avatar = userData.name ? userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

        const [result] = await pool.query(
            `INSERT INTO users (id, name, username, email, password, role, companies, modules, status, avatar, mustChangePassword)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, userData.name, userData.username, userData.email, userData.password, userData.role || 'staff', companies, modules, 'active', avatar, userData.mustChangePassword !== undefined ? userData.mustChangePassword : 1]
        );

        return await User.getUserById(userId);
    }

    // Update user
    static async updateUser(userId, updates) {
        const allowedFields = ['name', 'email', 'password', 'role', 'companies', 'modules', 'status', 'avatar', 'mustChangePassword'];
        const validUpdates = {};

        for (const field of allowedFields) {
            if (updates.hasOwnProperty(field)) {
                if (field === 'companies' || field === 'modules') {
                    validUpdates[field] = JSON.stringify(updates[field]);
                } else {
                    validUpdates[field] = updates[field];
                }
            }
        }

        if (Object.keys(validUpdates).length === 0) {
            return await User.getUserById(userId);
        }

        const setClause = Object.keys(validUpdates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(validUpdates);
        values.push(userId);

        await pool.query(`UPDATE users SET ${setClause} WHERE id = ?`, values);

        return await User.getUserById(userId);
    }

    // Delete user
    static async deleteUser(userId) {
        const user = await User.getUserById(userId);
        if (!user) return { success: false, error: 'User not found' };
        if (user.isSuperAdmin) return { success: false, error: 'Cannot delete Super Admin' };

        await pool.query('DELETE FROM users WHERE id = ?', [userId]);
        return { success: true };
    }

    // Deactivate user
    static async deactivateUser(userId) {
        return await User.updateUser(userId, { status: 'inactive' });
    }

    // Activate user
    static async activateUser(userId) {
        return await User.updateUser(userId, { status: 'active' });
    }

    // Update last login
    static async updateLastLogin(userId) {
        await pool.query('UPDATE users SET lastLogin = NOW() WHERE id = ?', [userId]);
    }
}

module.exports = User;
