const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');

const STORAGE_ROOT = path.join(__dirname, '..', 'storage');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Valid business keys
const VALID_BUSINESSES = ['unified', 'dheekay', 'kdchavit', 'nuatthai', 'autocasa'];

// Map file extensions to subfolder categories
function getCategoryFolder(originalName, category) {
    if (category) return category.toLowerCase();
    const ext = path.extname(originalName || '').toLowerCase();
    const docExts = ['.doc', '.docx', '.pdf', '.txt', '.rtf', '.odt'];
    const xlsExts = ['.xls', '.xlsx', '.csv', '.ods'];
    const imgExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico'];
    if (docExts.includes(ext)) return 'docs';
    if (xlsExts.includes(ext)) return 'xls';
    if (imgExts.includes(ext)) return 'images';
    return 'misc';
}

// Sanitize filename to prevent path traversal
function sanitizeFilename(filename) {
    return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Ensure directory exists
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

const fileController = {
    // Upload a file to the appropriate business folder
    async upload(req, res) {
        try {
            const { business, category, fileName, fileData, fileType, context, employeeId, projectId, description } = req.body;

            if (!business || !VALID_BUSINESSES.includes(business)) {
                return res.status(400).json({ success: false, error: `Invalid business. Must be one of: ${VALID_BUSINESSES.join(', ')}` });
            }
            if (!fileName || !fileData) {
                return res.status(400).json({ success: false, error: 'fileName and fileData (base64) are required' });
            }

            // Decode base64 file
            const buffer = Buffer.from(fileData, 'base64');
            if (buffer.length > MAX_FILE_SIZE) {
                return res.status(400).json({ success: false, error: 'File exceeds 50MB limit' });
            }

            // Determine target folder
            let subFolder = getCategoryFolder(fileName, category);

            // Special routing for employee files
            if (context === 'attendance') subFolder = path.join('employees', 'attendance');
            else if (context === 'employee-log') subFolder = path.join('employees', 'logs');
            else if (context === 'employee-photo') subFolder = path.join('employees', 'photos');

            const targetDir = path.join(STORAGE_ROOT, business, subFolder);
            ensureDir(targetDir);

            // Generate unique safe filename
            const safeName = sanitizeFilename(fileName);
            const uniqueName = `${Date.now()}-${uuidv4().substring(0, 8)}-${safeName}`;
            const filePath = path.join(targetDir, uniqueName);

            // Write file to disk
            fs.writeFileSync(filePath, buffer);

            // Store metadata in database
            const id = 'FILE-' + uuidv4().substring(0, 8).toUpperCase();
            const relativePath = path.relative(STORAGE_ROOT, filePath).replace(/\\/g, '/');

            await pool.query(
                `INSERT INTO uploaded_files (id, business, category, originalName, storedName, filePath, fileType, fileSize, context, employeeId, projectId, description, uploadDate)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [id, business, subFolder, fileName, uniqueName, relativePath, fileType || 'application/octet-stream', buffer.length, context || null, employeeId || null, projectId || null, description || '']
            );

            res.json({
                success: true,
                data: {
                    id,
                    business,
                    category: subFolder,
                    originalName: fileName,
                    storedName: uniqueName,
                    filePath: relativePath,
                    fileType: fileType || 'application/octet-stream',
                    fileSize: buffer.length,
                    context: context || null,
                    downloadUrl: `/api/files/${id}/download`
                }
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // List files for a business (optional category filter)
    async listByBusiness(req, res) {
        try {
            const { business } = req.params;
            const { category, context } = req.query;

            let query = 'SELECT id, business, category, originalName, storedName, filePath, fileType, fileSize, context, employeeId, projectId, description, uploadDate FROM uploaded_files WHERE business = ?';
            const params = [business];

            if (category) {
                query += ' AND category = ?';
                params.push(category);
            }
            if (context) {
                query += ' AND context = ?';
                params.push(context);
            }

            query += ' ORDER BY uploadDate DESC';
            const [rows] = await pool.query(query, params);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // List files for a specific employee
    async listByEmployee(req, res) {
        try {
            const { employeeId } = req.params;
            const [rows] = await pool.query(
                'SELECT id, business, category, originalName, storedName, filePath, fileType, fileSize, context, employeeId, projectId, description, uploadDate FROM uploaded_files WHERE employeeId = ? ORDER BY uploadDate DESC',
                [employeeId]
            );
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // List files for a specific project
    async listByProject(req, res) {
        try {
            const { projectId } = req.params;
            const [rows] = await pool.query(
                'SELECT id, business, category, originalName, storedName, filePath, fileType, fileSize, context, employeeId, projectId, description, uploadDate FROM uploaded_files WHERE projectId = ? ORDER BY uploadDate DESC',
                [projectId]
            );
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // Download a file by ID
    async download(req, res) {
        try {
            const { id } = req.params;
            const [rows] = await pool.query('SELECT originalName, storedName, filePath, fileType FROM uploaded_files WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ success: false, error: 'File not found' });

            const file = rows[0];
            const fullPath = path.resolve(STORAGE_ROOT, file.filePath);

            if (!fullPath.startsWith(path.resolve(STORAGE_ROOT))) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            if (!fs.existsSync(fullPath)) {
                return res.status(404).json({ success: false, error: 'File not found on disk' });
            }

            const safeName = encodeURIComponent(file.originalName).replace(/%20/g, ' ');
            res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
            res.setHeader('Content-Type', file.fileType || 'application/octet-stream');
            const stream = fs.createReadStream(fullPath);
            stream.pipe(res);
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // Delete a file
    async remove(req, res) {
        try {
            const { id } = req.params;
            const [rows] = await pool.query('SELECT filePath FROM uploaded_files WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ success: false, error: 'File not found' });

            const fullPath = path.resolve(STORAGE_ROOT, rows[0].filePath);
            if (!fullPath.startsWith(path.resolve(STORAGE_ROOT))) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }

            await pool.query('DELETE FROM uploaded_files WHERE id = ?', [id]);
            res.json({ success: true, message: 'File deleted' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // Get storage statistics
    async stats(req, res) {
        try {
            const [totalFiles] = await pool.query('SELECT COUNT(*) as count, COALESCE(SUM(fileSize), 0) as totalSize FROM uploaded_files');
            const [byBusiness] = await pool.query('SELECT business, COUNT(*) as count, COALESCE(SUM(fileSize), 0) as totalSize FROM uploaded_files GROUP BY business');
            const [byCategory] = await pool.query('SELECT category, COUNT(*) as count, COALESCE(SUM(fileSize), 0) as totalSize FROM uploaded_files GROUP BY category');

            res.json({
                success: true,
                data: {
                    total: totalFiles[0],
                    byBusiness,
                    byCategory
                }
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};

module.exports = fileController;
