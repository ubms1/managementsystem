const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const attendanceController = {
    async getAll(req, res) {
        try {
            const [rows] = await pool.query('SELECT * FROM attendance_records ORDER BY date DESC, created DESC');
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async getByCompany(req, res) {
        try {
            const { company } = req.params;
            const [rows] = await pool.query('SELECT * FROM attendance_records WHERE company = ? ORDER BY date DESC', [company]);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async getByEmployee(req, res) {
        try {
            const { employeeId } = req.params;
            const [rows] = await pool.query('SELECT * FROM attendance_records WHERE employeeId = ? ORDER BY date DESC', [employeeId]);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async create(req, res) {
        try {
            const { employeeId, company, date, timeIn, timeInTimestamp, status, lateMinutes, notes, location, source, faceVerified } = req.body;
            if (!employeeId || !date) return res.status(400).json({ success: false, error: 'employeeId and date are required' });

            const id = 'ATT-' + uuidv4().substring(0, 8).toUpperCase();
            await pool.query(
                `INSERT INTO attendance_records (id, employeeId, company, date, timeIn, timeInTimestamp, status, lateMinutes, notes, location, source, faceVerified)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, employeeId, company || null, date, timeIn || null, timeInTimestamp || null, status || 'present', lateMinutes || 0, notes || '', location ? JSON.stringify(location) : null, source || 'manual', faceVerified || false]
            );

            const [rows] = await pool.query('SELECT * FROM attendance_records WHERE id = ?', [id]);
            res.json({ success: true, data: rows[0] });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async clockOut(req, res) {
        try {
            const { id } = req.params;
            const { timeOut, timeOutTimestamp, locationOut, undertimeMinutes } = req.body;

            await pool.query(
                `UPDATE attendance_records SET timeOut = ?, timeOutTimestamp = ?, locationOut = ?, undertimeMinutes = ? WHERE id = ?`,
                [timeOut, timeOutTimestamp || null, locationOut ? JSON.stringify(locationOut) : null, undertimeMinutes || 0, id]
            );

            const [rows] = await pool.query('SELECT * FROM attendance_records WHERE id = ?', [id]);
            res.json({ success: true, data: rows[0] });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async getFaceDescriptor(req, res) {
        try {
            const { employeeId } = req.params;
            const [rows] = await pool.query('SELECT * FROM face_descriptors WHERE employeeId = ?', [employeeId]);
            if (rows.length === 0) return res.json({ success: true, data: null });
            res.json({ success: true, data: rows[0] });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async enrollFace(req, res) {
        try {
            const { employeeId, descriptor } = req.body;
            if (!employeeId || !descriptor) return res.status(400).json({ success: false, error: 'employeeId and descriptor are required' });

            await pool.query(
                `INSERT INTO face_descriptors (employeeId, descriptor) VALUES (?, ?) ON DUPLICATE KEY UPDATE descriptor = VALUES(descriptor), updatedAt = CURRENT_TIMESTAMP`,
                [employeeId, JSON.stringify(descriptor)]
            );

            res.json({ success: true, message: 'Face enrolled successfully' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};

module.exports = attendanceController;
