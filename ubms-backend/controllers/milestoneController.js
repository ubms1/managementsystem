const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const milestoneController = {
    async getByProject(req, res) {
        try {
            const { projectId } = req.params;
            const [rows] = await pool.query('SELECT * FROM project_milestones WHERE projectId = ? ORDER BY sortOrder, created', [projectId]);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async create(req, res) {
        try {
            const { projectId, company, milestoneName, category, status, targetDate, completedDate, issues, remarks, sortOrder } = req.body;
            if (!projectId || !milestoneName) return res.status(400).json({ success: false, error: 'projectId and milestoneName are required' });

            const id = 'MS-' + uuidv4().substring(0, 8).toUpperCase();
            let agingDays = 0;
            if (targetDate && !completedDate) {
                agingDays = Math.max(0, Math.floor((Date.now() - new Date(targetDate).getTime()) / (1000 * 60 * 60 * 24)));
            }

            await pool.query(
                `INSERT INTO project_milestones (id, projectId, company, milestoneName, category, status, targetDate, completedDate, agingDays, issues, remarks, sortOrder)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, projectId, company || null, milestoneName, category || 'General', status || 'pending', targetDate || null, completedDate || null, agingDays, issues || '', remarks || '', sortOrder || 0]
            );

            const [rows] = await pool.query('SELECT * FROM project_milestones WHERE id = ?', [id]);
            res.json({ success: true, data: rows[0] });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const { milestoneName, category, status, targetDate, completedDate, issues, remarks, sortOrder } = req.body;

            const updates = [];
            const values = [];
            if (milestoneName !== undefined) { updates.push('milestoneName = ?'); values.push(milestoneName); }
            if (category !== undefined) { updates.push('category = ?'); values.push(category); }
            if (status !== undefined) { updates.push('status = ?'); values.push(status); }
            if (targetDate !== undefined) { updates.push('targetDate = ?'); values.push(targetDate); }
            if (completedDate !== undefined) { updates.push('completedDate = ?'); values.push(completedDate); }
            if (issues !== undefined) { updates.push('issues = ?'); values.push(issues); }
            if (remarks !== undefined) { updates.push('remarks = ?'); values.push(remarks); }
            if (sortOrder !== undefined) { updates.push('sortOrder = ?'); values.push(sortOrder); }

            // Recalc aging days
            if (targetDate !== undefined || completedDate !== undefined || status !== undefined) {
                const [current] = await pool.query('SELECT targetDate, completedDate FROM project_milestones WHERE id = ?', [id]);
                const tgt = targetDate !== undefined ? targetDate : current[0]?.targetDate;
                const comp = completedDate !== undefined ? completedDate : current[0]?.completedDate;
                let aging = 0;
                if (tgt && !comp) {
                    aging = Math.max(0, Math.floor((Date.now() - new Date(tgt).getTime()) / (1000 * 60 * 60 * 24)));
                }
                updates.push('agingDays = ?');
                values.push(aging);
            }

            if (updates.length === 0) return res.json({ success: true, message: 'No updates' });

            values.push(id);
            await pool.query(`UPDATE project_milestones SET ${updates.join(', ')} WHERE id = ?`, values);

            const [rows] = await pool.query('SELECT * FROM project_milestones WHERE id = ?', [id]);
            res.json({ success: true, data: rows[0] });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    async remove(req, res) {
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM project_milestones WHERE id = ?', [id]);
            res.json({ success: true, message: 'Milestone deleted' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};

module.exports = milestoneController;
