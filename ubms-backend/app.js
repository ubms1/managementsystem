const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { initDatabase, seedInitialData } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const documentRoutes = require('./routes/documentRoutes');
const milestoneRoutes = require('./routes/milestoneRoutes');
const fileRoutes = require('./routes/fileRoutes');
const unifiedRoutes = require('./routes/unifiedRoutes');
const syncRoutes = require('./routes/syncRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - Allow all origins for multi-device access
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============================================
// API Routes
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/unified', unifiedRoutes);
app.use('/api/sync', syncRoutes);

// Health check with server info
app.get('/api/health', (req, res) => {
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];
    for (const iface of Object.values(networkInterfaces)) {
        for (const config of iface) {
            if (config.family === 'IPv4' && !config.internal) {
                addresses.push(config.address);
            }
        }
    }
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        server: {
            hostname: os.hostname(),
            ip: addresses,
            port: PORT,
            uptime: process.uptime()
        }
    });
});

// ============================================
// Serve Frontend Static Files
// ============================================
const FRONTEND_ROOT = path.join(__dirname, '..');

// Serve individual business portals
app.use('/dheekay', express.static(path.join(FRONTEND_ROOT, 'dheekay')));
app.use('/kdchavit', express.static(path.join(FRONTEND_ROOT, 'kdchavit')));
app.use('/nuatthai', express.static(path.join(FRONTEND_ROOT, 'nuatthai')));
app.use('/autocasa', express.static(path.join(FRONTEND_ROOT, 'autocasa')));

// Serve shared assets
app.use('/css', express.static(path.join(FRONTEND_ROOT, 'css')));
app.use('/js', express.static(path.join(FRONTEND_ROOT, 'js')));
app.use('/images', express.static(path.join(FRONTEND_ROOT, 'images')));
app.use('/assets', express.static(path.join(FRONTEND_ROOT, 'assets')));

// Serve Service Worker at root scope
app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Service-Worker-Allowed', '/');
    res.sendFile(path.join(FRONTEND_ROOT, 'sw.js'));
});

// Serve Time In/Out kiosk
app.get('/timeinout', (req, res) => {
    res.sendFile(path.join(FRONTEND_ROOT, 'timeinout.html'));
});
app.get('/timeinout.html', (req, res) => {
    res.sendFile(path.join(FRONTEND_ROOT, 'timeinout.html'));
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(FRONTEND_ROOT, 'login.html'));
});
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(FRONTEND_ROOT, 'login.html'));
});

// Serve unified main app (index.html) at root
app.get('/', (req, res) => {
    res.sendFile(path.join(FRONTEND_ROOT, 'index.html'));
});
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(FRONTEND_ROOT, 'index.html'));
});

// 404 handler for unmatched routes
app.use((req, res) => {
    // If requesting an API route, return JSON 404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, error: 'API route not found' });
    }
    // For all other routes, serve the main app (SPA routing)
    res.sendFile(path.join(FRONTEND_ROOT, 'index.html'));
});

// Global error handler
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
    try {
        console.log('🔧 Initializing database...');
        await initDatabase();
        
        console.log('🌱 Seeding initial data...');
        await seedInitialData();
        
        // Listen on all network interfaces (0.0.0.0) so other devices can connect
        const server = app.listen(PORT, '0.0.0.0', () => {
            const networkInterfaces = os.networkInterfaces();
            const addresses = [];
            for (const [name, iface] of Object.entries(networkInterfaces)) {
                for (const config of iface) {
                    if (config.family === 'IPv4' && !config.internal) {
                        addresses.push({ name, address: config.address });
                    }
                }
            }

            console.log(`\n${'='.repeat(60)}`);
            console.log(`  UBMS - Unified Business Management System`);
            console.log(`  Server is ONLINE and ready for connections`);
            console.log(`${'='.repeat(60)}`);
            console.log(`\n🌐 Access URLs:`);
            console.log(`   Local:    http://localhost:${PORT}`);
            addresses.forEach(a => {
                console.log(`   Network:  http://${a.address}:${PORT}  (${a.name})`);
            });
            console.log(`\n📚 API Endpoints:`);
            console.log(`   Auth:       POST /api/auth/login, /api/auth/superadmin, /api/auth/reset-password`);
            console.log(`   Users:      GET|POST /api/users, GET|PUT|DELETE /api/users/:id`);
            console.log(`   Attendance: GET|POST /api/attendance, PUT /api/attendance/:id/clockout`);
            console.log(`   Documents:  GET|POST /api/documents, GET /api/documents/:id/download`);
            console.log(`   Files:      POST /api/files/upload, GET /api/files/business/:biz`);
            console.log(`   Milestones: GET|POST /api/milestones`);
            console.log(`   Unified:    GET /api/unified/dashboard, /api/unified/businesses, /api/unified/config`);
            console.log(`   Sync:       GET /api/sync/stream (SSE), POST /api/sync/changes, /api/sync/bulk`);
            console.log(`\n🏢 Business Portals:`);
            console.log(`   Unified:    http://localhost:${PORT}/`);
            console.log(`   Dheekay:    http://localhost:${PORT}/dheekay/`);
            console.log(`   KDChavit:   http://localhost:${PORT}/kdchavit/`);
            console.log(`   NuatThai:   http://localhost:${PORT}/nuatthai/`);
            console.log(`   AutoCasa:   http://localhost:${PORT}/autocasa/`);
            console.log(`   Time Clock: http://localhost:${PORT}/timeinout`);
            addresses.forEach(a => {
                console.log(`\n   📱 Share this URL for online access:`);
                console.log(`      http://${a.address}:${PORT}`);
            });
            console.log(`\n💡 Default Super Admin: superadmin / DK-SA-7829-UBMS`);
            console.log(`${'='.repeat(60)}\n`);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use.`);
                console.error(`   Kill the existing process or set a different PORT in .env`);
                process.exit(1);
            } else {
                throw err;
            }
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    process.exit(0);
});
