const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { initDatabase, seedInitialData } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const documentRoutes = require('./routes/documentRoutes');
const milestoneRoutes = require('./routes/milestoneRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/milestones', milestoneRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
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
        
        const server = app.listen(PORT, () => {
            console.log(`\n✅ UBMS Backend running on http://localhost:${PORT}`);
            console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
            console.log(`\n📚 Available Endpoints:`);
            console.log(`   Auth:`);
            console.log(`   - POST /api/auth/login`);
            console.log(`   - POST /api/auth/superadmin`);
            console.log(`   - POST /api/auth/reset-password`);
            console.log(`   Users:`);
            console.log(`   - GET  /api/users`);
            console.log(`   - GET  /api/users/:userId`);
            console.log(`   - GET  /api/users/username/:username`);
            console.log(`   - GET  /api/users/email/:email`);
            console.log(`   - POST /api/users`);
            console.log(`   - PUT  /api/users/:userId`);
            console.log(`   - DELETE /api/users/:userId`);
            console.log(`\n💡 Test credentials:`);
            console.log(`   Username: superadmin`);
            console.log(`   Password: DK-SA-7829-UBMS`);
            console.log(`   OR use Super Admin code at /api/auth/superadmin\n`);
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
