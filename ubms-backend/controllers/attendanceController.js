const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const STORAGE_ROOT = path.join(__dirname, '..', 'storage');

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

const attendanceController = {
    // GET /api/attendance  — all records (superadmin); or ?company=x or ?date=YYYY-MM-DD
    async getAll(req, res) {
        try {
            const { company, date, limit } = req.query;
            let query = 'SELECT * FROM attendance_records';
            const params = [];
            const conditions = [];
            if (company && company !== 'all') { conditions.push('company = ?'); params.push(company); }
            if (date) { conditions.push('date = ?'); params.push(date); }
            if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
            query += ' ORDER BY date DESC, created DESC';
            if (limit) { query += ' LIMIT ?'; params.push(parseInt(limit, 10)); }
            const [rows] = await pool.query(query, params);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async getByCompany(req, res) {
        try {
            const { company } = req.params;
            const { date } = req.query;
            let query = 'SELECT * FROM attendance_records WHERE company = ?';
            const params = [company];
            if (date) { query += ' AND date = ?'; params.push(date); }
            query += ' ORDER BY date DESC, created DESC';
            const [rows] = await pool.query(query, params);
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

    // POST /api/attendance — accepts client-generated ID so clock-out can find the same record
    async create(req, res) {
        try {
            const { id: clientId, employeeId, company, date, timeIn, timeInTimestamp, status, lateMinutes, notes, location, source, faceVerified } = req.body;
            if (!employeeId || !date) return res.status(400).json({ success: false, error: 'employeeId and date are required' });

            const id = clientId || ('ATT-' + uuidv4().substring(0, 8).toUpperCase());
            await pool.query(
                `INSERT INTO attendance_records (id, employeeId, company, date, timeIn, timeInTimestamp, status, lateMinutes, notes, location, source, faceVerified)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE timeIn=VALUES(timeIn), timeInTimestamp=VALUES(timeInTimestamp), status=VALUES(status), lateMinutes=VALUES(lateMinutes), location=VALUES(location), source=VALUES(source), faceVerified=VALUES(faceVerified)`,
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

    // ====== Face Descriptor CRUD ======
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
            const { employeeId, descriptor, enrollPhoto } = req.body;
            if (!employeeId || !descriptor) return res.status(400).json({ success: false, error: 'employeeId and descriptor are required' });

            await pool.query(
                `INSERT INTO face_descriptors (employeeId, descriptor) VALUES (?, ?) ON DUPLICATE KEY UPDATE descriptor = VALUES(descriptor), updatedAt = CURRENT_TIMESTAMP`,
                [employeeId, JSON.stringify(descriptor)]
            );

            // Save enrollment photo if provided
            if (enrollPhoto) {
                await saveAttendanceImage({
                    employeeId,
                    company: req.body.company || 'unknown',
                    imageType: 'enrollment',
                    base64Data: enrollPhoto,
                    attendanceId: null,
                    faceVerified: true,
                    matchScore: 100
                });
            }

            res.json({ success: true, message: 'Face enrolled successfully' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // ====== Attendance Image Snapshots ======

    // POST /api/attendance/snapshot — upload a face scan image
    async uploadSnapshot(req, res) {
        try {
            const { attendanceId, employeeId, company, imageType, imageData, faceVerified, matchScore } = req.body;
            if (!employeeId || !imageData) return res.status(400).json({ success: false, error: 'employeeId and imageData (base64) are required' });

            const result = await saveAttendanceImage({
                attendanceId: attendanceId || null,
                employeeId,
                company: company || 'unknown',
                imageType: imageType || 'clockin',
                base64Data: imageData,
                faceVerified: faceVerified || false,
                matchScore: matchScore || 0
            });

            res.json({ success: true, data: result });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // GET /api/attendance/images?company=x&date=YYYY-MM-DD&employeeId=x
    async getImages(req, res) {
        try {
            const { company, date, employeeId, imageType } = req.query;
            let query = 'SELECT * FROM attendance_images';
            const params = [];
            const conditions = [];
            if (company && company !== 'all') { conditions.push('company = ?'); params.push(company); }
            if (date) { conditions.push('DATE(capturedAt) = ?'); params.push(date); }
            if (employeeId) { conditions.push('employeeId = ?'); params.push(employeeId); }
            if (imageType) { conditions.push('imageType = ?'); params.push(imageType); }
            if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
            query += ' ORDER BY capturedAt DESC LIMIT 200';
            const [rows] = await pool.query(query, params);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // GET /api/attendance/images/:id/view — serve the actual image file
    async viewImage(req, res) {
        try {
            const { id } = req.params;
            const [rows] = await pool.query('SELECT imagePath FROM attendance_images WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ success: false, error: 'Image not found' });
            const fullPath = path.resolve(STORAGE_ROOT, rows[0].imagePath);
            if (!fullPath.startsWith(path.resolve(STORAGE_ROOT))) return res.status(403).json({ success: false, error: 'Access denied' });
            if (!fs.existsSync(fullPath)) return res.status(404).json({ success: false, error: 'Image file missing from disk' });
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            fs.createReadStream(fullPath).pipe(res);
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};

// Helper: Save a base64 face-scan image to disk + DB
async function saveAttendanceImage({ attendanceId, employeeId, company, imageType, base64Data, faceVerified, matchScore }) {
    // Validate company to prevent path traversal
    const VALID_COMPANIES = ['dheekay', 'kdchavit', 'nuatthai', 'autocasa', 'unified', 'unknown'];
    const safeCompany = VALID_COMPANIES.includes(company) ? company : 'unknown';
    // Strip data:image/...;base64, prefix if present
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');

    const dateDir = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const targetDir = path.join(STORAGE_ROOT, safeCompany, 'employees', 'attendance', dateDir);
    ensureDir(targetDir);

    const fileName = `${employeeId}_${imageType}_${Date.now()}.jpg`;
    const filePath = path.join(targetDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const relativePath = path.relative(STORAGE_ROOT, filePath).replace(/\\/g, '/');
    const id = 'AIMG-' + uuidv4().substring(0, 8).toUpperCase();

    await pool.query(
        `INSERT INTO attendance_images (id, attendanceId, employeeId, company, imageType, imagePath, fileSize, faceVerified, matchScore)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, attendanceId, employeeId, company, imageType, relativePath, buffer.length, faceVerified || false, matchScore || 0]
    );

    return { id, imagePath: relativePath, downloadUrl: `/api/attendance/images/${id}/view` };
}

module.exports = attendanceController;
