const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ============================================
// SSE Client Registry
// ============================================
const sseClients = new Map();

function broadcastChange(change, senderUserId) {
    for (const [clientId, client] of sseClients) {
        if (client.userId === senderUserId) continue;
        if (client.business === 'all' || client.business === change.business || change.business === 'all') {
            try {
                client.res.write(`data: ${JSON.stringify({ type: 'change', change })}\n\n`);
            } catch {
                sseClients.delete(clientId);
            }
        }
    }
}

// ============================================
// SSE Stream Endpoint
// ============================================
exports.stream = (req, res) => {
    const clientId = uuidv4();
    const userId = req.query.userId || 'anonymous';
    const business = req.query.business || 'all';

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

    sseClients.set(clientId, { res, userId, business });

    const heartbeat = setInterval(() => {
        try { res.write(`: heartbeat\n\n`); } catch { clearInterval(heartbeat); }
    }, 30000);

    req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(clientId);
    });
};

// ============================================
// Submit a Single Change
// ============================================
exports.submitChange = async (req, res) => {
    try {
        const { entityType, operation, entityId, data, business, userId, id, timestamp } = req.body;

        if (!entityType || !operation) {
            return res.status(400).json({ success: false, error: 'entityType and operation are required' });
        }

        const changeId = id || ('CHG-' + uuidv4());
        const ts = timestamp || new Date().toISOString();

        const connection = await pool.getConnection();
        try {
            await connection.query(
                `INSERT IGNORE INTO data_changes (id, entityType, operation, entityId, data, business, userId, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [changeId, entityType, operation, entityId || null, JSON.stringify(data), business || 'all', userId || 'system', ts]
            );
        } finally {
            connection.release();
        }

        const change = { id: changeId, entityType, operation, entityId, data, business: business || 'all', userId: userId || 'system', timestamp: ts };
        broadcastChange(change, userId);

        res.json({ success: true, change });
    } catch (error) {
        console.error('Submit change error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// Submit Multiple Changes (Offline Sync)
// ============================================
exports.submitBulk = async (req, res) => {
    try {
        const { changes, userId } = req.body;

        if (!Array.isArray(changes) || changes.length === 0) {
            return res.status(400).json({ success: false, error: 'changes array is required' });
        }

        const results = [];
        const connection = await pool.getConnection();
        try {
            for (const change of changes) {
                const changeId = change.id || ('CHG-' + uuidv4());
                const ts = change.timestamp || new Date().toISOString();
                await connection.query(
                    `INSERT IGNORE INTO data_changes (id, entityType, operation, entityId, data, business, userId, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [changeId, change.entityType, change.operation, change.entityId || null, JSON.stringify(change.data), change.business || 'all', change.userId || userId || 'system', ts]
                );
                const fullChange = { id: changeId, ...change, timestamp: ts };
                broadcastChange(fullChange, change.userId || userId);
                results.push({ id: changeId, success: true });
            }
        } finally {
            connection.release();
        }

        res.json({ success: true, results, synced: results.length });
    } catch (error) {
        console.error('Bulk sync error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// Get Changes Since Timestamp
// ============================================
exports.getChangesSince = async (req, res) => {
    try {
        const since = req.params.since || '1970-01-01T00:00:00.000Z';
        const business = req.query.business || 'all';

        const connection = await pool.getConnection();
        try {
            let query = `SELECT * FROM data_changes WHERE timestamp > ?`;
            const params = [since];
            if (business !== 'all') {
                query += ` AND (business = ? OR business = 'all')`;
                params.push(business);
            }
            query += ` ORDER BY timestamp ASC LIMIT 1000`;

            const [rows] = await connection.query(query, params);
            const changes = rows.map(r => ({
                ...r,
                data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data
            }));
            res.json({ success: true, changes, count: changes.length });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Get changes error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// Get Sync Status
// ============================================
exports.status = (req, res) => {
    res.json({
        success: true,
        connectedClients: sseClients.size,
        serverTime: new Date().toISOString()
    });
};
