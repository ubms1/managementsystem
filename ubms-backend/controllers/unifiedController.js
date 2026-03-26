const { pool } = require('../config/db');

const unifiedController = {
    // Get unified dashboard stats across all businesses
    async getDashboard(req, res) {
        try {
            const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users WHERE status = "active"');
            const [attendanceToday] = await pool.query('SELECT COUNT(*) as count FROM attendance_records WHERE date = CURDATE()');
            const [totalDocs] = await pool.query('SELECT COUNT(*) as count FROM project_documents');
            const [totalFiles] = await pool.query('SELECT COUNT(*) as count FROM uploaded_files');
            const [invoiceStats] = await pool.query('SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as totalAmount, COALESCE(SUM(paid),0) as totalPaid FROM invoices');
            const [customerCount] = await pool.query('SELECT COUNT(*) as count FROM customers');

            // Per-business stats
            const businesses = ['dheekay', 'kdchavit', 'nuatthai', 'autocasa'];
            const businessStats = {};
            for (const biz of businesses) {
                const [users] = await pool.query('SELECT COUNT(*) as count FROM users WHERE JSON_CONTAINS(companies, ?) OR JSON_CONTAINS(companies, \'"all"\')', [JSON.stringify(biz)]);
                const [attendance] = await pool.query('SELECT COUNT(*) as count FROM attendance_records WHERE company = ? AND date = CURDATE()', [biz]);
                const [docs] = await pool.query('SELECT COUNT(*) as count FROM project_documents WHERE company = ?', [biz]);
                const [files] = await pool.query('SELECT COUNT(*) as count FROM uploaded_files WHERE business = ?', [biz]);
                businessStats[biz] = {
                    users: users[0].count,
                    attendanceToday: attendance[0].count,
                    documents: docs[0].count,
                    files: files[0].count
                };
            }

            res.json({
                success: true,
                data: {
                    overview: {
                        activeUsers: userCount[0].count,
                        attendanceToday: attendanceToday[0].count,
                        totalDocuments: totalDocs[0].count,
                        totalFiles: totalFiles[0].count,
                        invoices: invoiceStats[0],
                        customers: customerCount[0].count
                    },
                    businesses: businessStats
                }
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // Get all businesses info
    async getBusinesses(req, res) {
        try {
            const businesses = [
                {
                    id: 'dheekay',
                    name: 'Dheekay Builders OPC',
                    type: 'Construction / Contracting',
                    color: '#16a085',
                    icon: 'fa-hard-hat',
                    portal: '/dheekay/',
                    modules: ['dashboard', 'crm', 'financial', 'construction', 'reports', 'invoicing', 'payroll', 'inventory', 'iso', 'settings']
                },
                {
                    id: 'kdchavit',
                    name: 'KDChavit Construction',
                    type: 'Construction / Contracting',
                    color: '#2c3e50',
                    icon: 'fa-building',
                    portal: '/kdchavit/',
                    modules: ['dashboard', 'crm', 'financial', 'construction', 'reports', 'invoicing', 'payroll', 'inventory', 'iso', 'settings']
                },
                {
                    id: 'nuatthai',
                    name: 'Nuat Thai Foot & Body Massage',
                    type: 'Wellness / Spa Services',
                    color: '#b8860b',
                    icon: 'fa-spa',
                    portal: '/nuatthai/',
                    modules: ['dashboard', 'crm', 'financial', 'wellness', 'pos', 'reports', 'invoicing', 'payroll', 'inventory', 'settings']
                },
                {
                    id: 'autocasa',
                    name: 'AutoCasa Auto Expert & Repair',
                    type: 'Automotive Repair',
                    color: '#e74c3c',
                    icon: 'fa-car',
                    portal: '/autocasa/',
                    modules: ['dashboard', 'crm', 'financial', 'automotive', 'reports', 'invoicing', 'payroll', 'inventory', 'settings']
                }
            ];
            res.json({ success: true, data: businesses });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // Get audit log
    async getAuditLog(req, res) {
        try {
            const { limit = 100, offset = 0, level, user } = req.query;
            let query = 'SELECT * FROM audit_logs';
            const params = [];
            const conditions = [];

            if (level) { conditions.push('level = ?'); params.push(level); }
            if (user) { conditions.push('user LIKE ?'); params.push(`%${user}%`); }

            if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
            query += ' ORDER BY time DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [rows] = await pool.query(query, params);
            const [countResult] = await pool.query('SELECT COUNT(*) as total FROM audit_logs');
            res.json({ success: true, data: rows, total: countResult[0].total });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // Add audit log entry
    async addAuditLog(req, res) {
        try {
            const { user, action, detail, level } = req.body;
            if (!action) return res.status(400).json({ success: false, error: 'action is required' });

            await pool.query(
                'INSERT INTO audit_logs (user, action, detail, level) VALUES (?, ?, ?, ?)',
                [user || 'System', action, detail || '', level || 'info']
            );
            res.json({ success: true, message: 'Audit log entry added' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // Get system configuration
    async getConfig(req, res) {
        try {
            const config = {
                system: {
                    name: 'Unified Business Management System',
                    version: '2.0.0',
                    currency: 'PHP',
                    locale: 'en-PH',
                    vatRate: 0.12,
                    fiscalYearStart: 'January',
                    dateFormat: 'MMM DD, YYYY'
                },
                businesses: ['dheekay', 'kdchavit', 'nuatthai', 'autocasa'],
                features: {
                    fileUploads: true,
                    maxFileSize: '50MB',
                    facialRecognition: true,
                    geoLocation: true,
                    multiCompany: true
                },
                storage: {
                    type: 'filesystem',
                    root: 'storage/',
                    categories: ['docs', 'xls', 'images', 'employees', 'reports', 'invoices', 'contracts', 'misc']
                }
            };
            res.json({ success: true, data: config });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};

module.exports = unifiedController;
