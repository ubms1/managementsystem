const { pool } = require('../config/db');

// All supported entity types from the frontend DataStore
const ENTITY_TYPES = [
    'customers', 'invoices', 'expenses', 'projects', 'bookings',
    'jobCards', 'vehicles', 'autoParts', 'memberships', 'employees',
    'payslips', 'inventoryItems', 'inventoryTransactions', 'estimates',
    'birInvoices', 'equipment', 'safetyRecords', 'documents',
    'spaInventory', 'performanceReviews', 'timesheets', 'incidentReports',
    'subcontractors', 'inspections', 'therapists', 'posTransactions',
    'attendanceRecords', 'journalEntries', 'isoDocuments', 'isoAudits',
    'isoNcrs', 'isoCpars', 'bankReconciliations', 'biometricLogs',
    'collectionReceipts', 'workSchedules', 'activityLog', 'notifications'
];

// ============================================================
// POST /api/data/:entityType  — upsert a single entity
// ============================================================
exports.upsertEntity = async (req, res) => {
    try {
        const { entityType } = req.params;
        const body = req.body;
        const { _meta, ...entityData } = body;
        const meta = _meta || {};

        const id = entityData.id;
        if (!id) return res.status(400).json({ success: false, error: 'Entity id is required' });

        const business = meta.business || entityData.company || 'all';
        const createdBy = meta.createdBy || 'system';

        const connection = await pool.getConnection();
        try {
            await connection.query(
                `INSERT INTO entities (id, entityType, business, createdBy, data)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   data = VALUES(data),
                   business = VALUES(business),
                   updatedAt = CURRENT_TIMESTAMP(3)`,
                [id, entityType, business, createdBy, JSON.stringify(entityData)]
            );
        } finally {
            connection.release();
        }

        res.json({ success: true, id, entityType });
    } catch (error) {
        console.error('upsertEntity error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================================
// GET /api/data/:entityType  — list all entities of a type
// ============================================================
exports.getEntities = async (req, res) => {
    try {
        const { entityType } = req.params;
        const { business, createdBy } = req.query;

        const connection = await pool.getConnection();
        try {
            let query = `SELECT id, entityType, business, createdBy, data, createdAt, updatedAt
                         FROM entities WHERE entityType = ? AND isDeleted = FALSE`;
            const params = [entityType];

            if (business && business !== 'all') {
                query += ` AND (business = ? OR business = 'all')`;
                params.push(business);
            }
            if (createdBy) {
                query += ` AND createdBy = ?`;
                params.push(createdBy);
            }
            query += ` ORDER BY createdAt ASC`;

            const [rows] = await connection.query(query, params);
            const entities = rows.map(r => ({
                ...(typeof r.data === 'string' ? JSON.parse(r.data) : r.data),
                _createdBy: r.createdBy,
                _business: r.business,
                _createdAt: r.createdAt,
                _updatedAt: r.updatedAt
            }));

            res.json({ success: true, entities, count: entities.length });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('getEntities error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================================
// DELETE /api/data/:entityType/:id  — soft delete
// ============================================================
exports.deleteEntity = async (req, res) => {
    try {
        const { entityType, id } = req.params;

        const connection = await pool.getConnection();
        try {
            await connection.query(
                `UPDATE entities SET isDeleted = TRUE, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ? AND entityType = ?`,
                [id, entityType]
            );
        } finally {
            connection.release();
        }

        res.json({ success: true, id, entityType });
    } catch (error) {
        console.error('deleteEntity error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================================
// GET /api/data/user/:userId  — get all data entered by a user
// ============================================================
exports.getByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { entityType } = req.query;

        const connection = await pool.getConnection();
        try {
            let query = `SELECT id, entityType, business, createdBy, data, createdAt
                         FROM entities WHERE createdBy = ? AND isDeleted = FALSE`;
            const params = [userId];
            if (entityType) {
                query += ` AND entityType = ?`;
                params.push(entityType);
            }
            query += ` ORDER BY createdAt ASC`;

            const [rows] = await connection.query(query, params);

            // Group by entityType
            const grouped = {};
            for (const r of rows) {
                if (!grouped[r.entityType]) grouped[r.entityType] = [];
                const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
                grouped[r.entityType].push({ ...d, _createdAt: r.createdAt });
            }

            res.json({ success: true, data: grouped, userId, totalCount: rows.length });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('getByUser error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================================
// GET /api/data/users/all  — list all users including offline-registered
// ============================================================
exports.getAllUsers = async (req, res) => {
    try {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT id, username, name, email, role, companies, modules, status, avatar, isSuperAdmin, mustChangePassword, lastLogin, created FROM users ORDER BY created ASC`
            );
            const users = rows.map(u => ({
                ...u,
                companies: typeof u.companies === 'string' ? JSON.parse(u.companies) : (u.companies || []),
                modules: typeof u.modules === 'string' ? JSON.parse(u.modules) : (u.modules || []),
                isSuperAdmin: Boolean(u.isSuperAdmin),
                mustChangePassword: Boolean(u.mustChangePassword)
            }));
            res.json({ success: true, users, count: users.length });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('getAllUsers error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================================
// POST /api/data/import  — bulk import all localStorage data from a client
// ============================================================
exports.bulkImport = async (req, res) => {
    try {
        const { data, userId, business } = req.body;
        if (!data || typeof data !== 'object') {
            return res.status(400).json({ success: false, error: 'data object is required' });
        }

        const connection = await pool.getConnection();
        let totalImported = 0;
        let usersSynced = 0;

        try {
            // --- Sync users from localStorage (registered on other PCs) ---
            if (data._users && Array.isArray(data._users)) {
                for (const user of data._users) {
                    if (!user.id || !user.username) continue;
                    // Only insert — never overwrite existing user passwords
                    await connection.query(
                        `INSERT IGNORE INTO users
                            (id, name, username, email, password, role, companies, modules, status, avatar, isSuperAdmin, mustChangePassword)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            user.id,
                            user.name || user.username,
                            user.username,
                            user.email || (user.username + '@ubms.ph'),
                            user.password || '',
                            user.role || 'staff',
                            JSON.stringify(Array.isArray(user.companies) ? user.companies : (user.companies ? [user.companies] : [])),
                            JSON.stringify(Array.isArray(user.modules) ? user.modules : (user.modules ? [user.modules] : [])),
                            user.status || 'active',
                            user.avatar || (user.name ? user.name.substring(0, 2).toUpperCase() : 'U'),
                            user.isSuperAdmin ? 1 : 0,
                            user.mustChangePassword ? 1 : 0
                        ]
                    );
                    usersSynced++;
                }
            }

            // --- Import all entity types ---
            for (const entityType of ENTITY_TYPES) {
                if (!data[entityType] || !Array.isArray(data[entityType])) continue;

                for (const entity of data[entityType]) {
                    if (!entity.id) continue;
                    const entityBusiness = entity.company || business || 'all';
                    // Strip internal meta fields before saving
                    const { _createdBy, _business, _createdAt, _updatedAt, ...cleanEntity } = entity;

                    await connection.query(
                        `INSERT INTO entities (id, entityType, business, createdBy, data)
                         VALUES (?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE
                           data = VALUES(data),
                           business = VALUES(business),
                           updatedAt = CURRENT_TIMESTAMP(3)`,
                        [entity.id, entityType, entityBusiness, userId || 'system', JSON.stringify(cleanEntity)]
                    );
                    totalImported++;
                }
            }

            // --- Log import to audit_logs ---
            await connection.query(
                `INSERT INTO audit_logs (user, action, detail, level) VALUES (?, ?, ?, ?)`,
                [userId || 'system', 'Data Import', `Bulk import: ${totalImported} records, ${usersSynced} users from client`, 'info']
            );
        } finally {
            connection.release();
        }

        console.log(`✓ Bulk import: ${totalImported} records, ${usersSynced} users from ${userId}`);
        res.json({ success: true, totalImported, usersSynced, message: `Imported ${totalImported} records and ${usersSynced} users` });
    } catch (error) {
        console.error('bulkImport error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================================
// GET /api/data/export  — export all server-side data for a business
// ============================================================
exports.exportAll = async (req, res) => {
    try {
        const { business } = req.query;

        const connection = await pool.getConnection();
        try {
            let query = `SELECT id, entityType, business, createdBy, data, createdAt FROM entities WHERE isDeleted = FALSE`;
            const params = [];
            if (business && business !== 'all') {
                query += ` AND (business = ? OR business = 'all')`;
                params.push(business);
            }
            query += ` ORDER BY createdAt ASC`;

            const [rows] = await connection.query(query, params);

            // Group by entityType
            const grouped = {};
            for (const r of rows) {
                if (!grouped[r.entityType]) grouped[r.entityType] = [];
                const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
                grouped[r.entityType].push({ ...d, _createdBy: r.createdBy });
            }

            // Include all users (with passwords for cross-PC auth sync)
            const [users] = await connection.query(
                `SELECT id, username, name, email, password, role, companies, modules, status, avatar, isSuperAdmin, mustChangePassword, lastLogin FROM users ORDER BY username`
            );
            grouped._users = users.map(u => ({
                ...u,
                companies: typeof u.companies === 'string' ? JSON.parse(u.companies) : (u.companies || []),
                modules: typeof u.modules === 'string' ? JSON.parse(u.modules) : (u.modules || []),
                isSuperAdmin: Boolean(u.isSuperAdmin),
                mustChangePassword: Boolean(u.mustChangePassword)
            }));

            const totalEntities = rows.length;
            res.json({ success: true, data: grouped, business: business || 'all', totalEntities });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('exportAll error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================================
// GET /api/data/logins  — get all login events from audit_logs
// ============================================================
exports.getLogins = async (req, res) => {
    try {
        const { username, limit = 100 } = req.query;

        const connection = await pool.getConnection();
        try {
            let query = `SELECT * FROM audit_logs WHERE action LIKE '%Login%' OR action LIKE '%login%'`;
            const params = [];
            if (username) {
                query += ` AND user = ?`;
                params.push(username);
            }
            query += ` ORDER BY time DESC LIMIT ?`;
            params.push(parseInt(limit));

            const [rows] = await connection.query(query, params);
            res.json({ success: true, logins: rows, count: rows.length });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('getLogins error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};
