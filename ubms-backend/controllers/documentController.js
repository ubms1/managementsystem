const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Max upload size: 16MB
const MAX_FILE_SIZE = 16 * 1024 * 1024;

const documentController = {
    async getAll(req, res) {
        try {
            const [rows] = await pool.query('SELECT id, company, projectId, title, category, fileName, fileType, fileSize, revision, status, author, assignedTo, description, notes, uploadDate, created FROM project_documents ORDER BY created DESC');
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async getByCompany(req, res) {
        try {
            const { company } = req.params;
            const [rows] = await pool.query('SELECT id, company, projectId, title, category, fileName, fileType, fileSize, revision, status, author, assignedTo, description, notes, uploadDate, created FROM project_documents WHERE company = ? ORDER BY created DESC', [company]);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async getByProject(req, res) {
        try {
            const { projectId } = req.params;
            const [rows] = await pool.query('SELECT id, company, projectId, title, category, fileName, fileType, fileSize, revision, status, author, assignedTo, description, notes, uploadDate, created FROM project_documents WHERE projectId = ? ORDER BY created DESC', [projectId]);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;
            const [rows] = await pool.query('SELECT id, company, projectId, title, category, fileName, fileType, fileSize, revision, status, author, assignedTo, description, notes, uploadDate, created FROM project_documents WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ success: false, error: 'Document not found' });
            res.json({ success: true, data: rows[0] });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async download(req, res) {
        try {
            const { id } = req.params;
            const [rows] = await pool.query('SELECT fileName, fileType, fileData FROM project_documents WHERE id = ?', [id]);
            if (rows.length === 0 || !rows[0].fileData) return res.status(404).json({ success: false, error: 'File not found' });

            const doc = rows[0];
            res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
            res.setHeader('Content-Type', doc.fileType || 'application/octet-stream');
            res.send(doc.fileData);
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async upload(req, res) {
        try {
            const { company, projectId, title, category, fileName, fileType, fileSize, fileData, revision, status, author, assignedTo, description, notes } = req.body;
            if (!company || !title) return res.status(400).json({ success: false, error: 'company and title are required' });

            // Validate file size if file data is provided
            let fileBuffer = null;
            if (fileData) {
                fileBuffer = Buffer.from(fileData, 'base64');
                if (fileBuffer.length > MAX_FILE_SIZE) {
                    return res.status(400).json({ success: false, error: 'File size exceeds 16MB limit' });
                }
            }

            const id = 'DOC-' + uuidv4().substring(0, 8).toUpperCase();
            const uploadDate = new Date().toISOString().split('T')[0];

            await pool.query(
                `INSERT INTO project_documents (id, company, projectId, title, category, fileName, fileType, fileSize, fileData, revision, status, author, assignedTo, description, notes, uploadDate)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, company, projectId || null, title, category || 'Other', fileName || null, fileType || null, fileSize || 0, fileBuffer, revision || '0', status || 'pending', author || null, assignedTo || null, description || '', notes || '', uploadDate]
            );

            const [rows] = await pool.query('SELECT id, company, projectId, title, category, fileName, fileType, fileSize, revision, status, author, assignedTo, description, notes, uploadDate, created FROM project_documents WHERE id = ?', [id]);
            res.json({ success: true, data: rows[0] });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const { title, category, revision, status, author, assignedTo, description, notes } = req.body;

            const updates = [];
            const values = [];
            if (title !== undefined) { updates.push('title = ?'); values.push(title); }
            if (category !== undefined) { updates.push('category = ?'); values.push(category); }
            if (revision !== undefined) { updates.push('revision = ?'); values.push(revision); }
            if (status !== undefined) { updates.push('status = ?'); values.push(status); }
            if (author !== undefined) { updates.push('author = ?'); values.push(author); }
            if (assignedTo !== undefined) { updates.push('assignedTo = ?'); values.push(assignedTo); }
            if (description !== undefined) { updates.push('description = ?'); values.push(description); }
            if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }

            if (updates.length === 0) return res.json({ success: true, message: 'No updates provided' });

            values.push(id);
            await pool.query(`UPDATE project_documents SET ${updates.join(', ')} WHERE id = ?`, values);

            const [rows] = await pool.query('SELECT id, company, projectId, title, category, fileName, fileType, fileSize, revision, status, author, assignedTo, description, notes, uploadDate, created FROM project_documents WHERE id = ?', [id]);
            res.json({ success: true, data: rows[0] });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async remove(req, res) {
        try {
            const { id } = req.params;
            const [check] = await pool.query('SELECT id FROM project_documents WHERE id = ?', [id]);
            if (check.length === 0) return res.status(404).json({ success: false, error: 'Document not found' });

            await pool.query('DELETE FROM project_documents WHERE id = ?', [id]);
            res.json({ success: true, message: 'Document deleted' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};

module.exports = documentController;
