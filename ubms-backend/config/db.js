const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbName = process.env.DB_NAME || 'ubms_database';

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Initialize database and tables on startup
async function initDatabase() {
    // First create the database using a connection without a database selected
    const tempConn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 3306,
    });
    try {
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    } finally {
        await tempConn.end();
    }

    // Now the pool can connect to the existing database
    const connection = await pool.getConnection();
    try {

        // Create users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                companies JSON,
                modules JSON,
                status VARCHAR(50),
                created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                lastLogin TIMESTAMP NULL,
                avatar VARCHAR(10),
                isSuperAdmin BOOLEAN DEFAULT FALSE,
                mustChangePassword BOOLEAN DEFAULT FALSE
            )
        `);

        // Create audit_logs table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user VARCHAR(255),
                action VARCHAR(255),
                detail TEXT,
                level VARCHAR(50)
            )
        `);

        // Create customers table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(20),
                company VARCHAR(100),
                totalSpent DECIMAL(10, 2),
                created DATE
            )
        `);

        // Create invoices table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id VARCHAR(50) PRIMARY KEY,
                customerId VARCHAR(50),
                company VARCHAR(100),
                amount DECIMAL(10, 2),
                paid DECIMAL(10, 2) DEFAULT 0,
                status VARCHAR(50),
                description TEXT,
                issueDate DATE,
                dueDate DATE,
                paymentMethod VARCHAR(50),
                created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create attendance_records table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS attendance_records (
                id VARCHAR(50) PRIMARY KEY,
                employeeId VARCHAR(100) NOT NULL,
                company VARCHAR(100),
                date DATE NOT NULL,
                timeIn VARCHAR(20),
                timeInTimestamp TIMESTAMP NULL,
                timeOut VARCHAR(20),
                timeOutTimestamp TIMESTAMP NULL,
                status VARCHAR(50) DEFAULT 'present',
                lateMinutes INT DEFAULT 0,
                undertimeMinutes INT DEFAULT 0,
                overtimeHours DECIMAL(5,2) DEFAULT 0,
                notes TEXT,
                location JSON,
                locationOut JSON,
                source VARCHAR(50) DEFAULT 'manual',
                faceVerified BOOLEAN DEFAULT FALSE,
                created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create face_descriptors table for facial recognition data
        await connection.query(`
            CREATE TABLE IF NOT EXISTS face_descriptors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employeeId VARCHAR(100) NOT NULL UNIQUE,
                descriptor JSON NOT NULL,
                enrolledAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create project_documents table for uploaded files (contracts, etc.)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS project_documents (
                id VARCHAR(50) PRIMARY KEY,
                company VARCHAR(100) NOT NULL,
                projectId VARCHAR(50),
                title VARCHAR(255) NOT NULL,
                category VARCHAR(100),
                fileName VARCHAR(255),
                fileType VARCHAR(50),
                fileSize INT,
                fileData LONGBLOB,
                revision VARCHAR(20) DEFAULT '0',
                status VARCHAR(50) DEFAULT 'pending',
                author VARCHAR(255),
                assignedTo VARCHAR(255),
                description TEXT,
                notes TEXT,
                uploadDate DATE,
                created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create uploaded_files table for filesystem-based file storage
        await connection.query(`
            CREATE TABLE IF NOT EXISTS uploaded_files (
                id VARCHAR(50) PRIMARY KEY,
                business VARCHAR(100) NOT NULL,
                category VARCHAR(100),
                originalName VARCHAR(255) NOT NULL,
                storedName VARCHAR(255) NOT NULL,
                filePath VARCHAR(500) NOT NULL,
                fileType VARCHAR(100),
                fileSize BIGINT DEFAULT 0,
                context VARCHAR(100),
                employeeId VARCHAR(100),
                projectId VARCHAR(50),
                description TEXT,
                uploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create project_milestones table for project monitoring
        await connection.query(`
            CREATE TABLE IF NOT EXISTS project_milestones (
                id VARCHAR(50) PRIMARY KEY,
                projectId VARCHAR(50) NOT NULL,
                company VARCHAR(100),
                milestoneName VARCHAR(255) NOT NULL,
                category VARCHAR(100),
                status VARCHAR(50) DEFAULT 'pending',
                targetDate DATE,
                completedDate DATE,
                agingDays INT DEFAULT 0,
                issues TEXT,
                remarks TEXT,
                sortOrder INT DEFAULT 0,
                created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create entities table — generic server-side persistence for all business data
        await connection.query(`
            CREATE TABLE IF NOT EXISTS entities (
                id VARCHAR(100) NOT NULL,
                entityType VARCHAR(100) NOT NULL,
                business VARCHAR(100) DEFAULT 'all',
                createdBy VARCHAR(100) DEFAULT 'system',
                data JSON NOT NULL,
                isDeleted BOOLEAN DEFAULT FALSE,
                createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                PRIMARY KEY (id, entityType),
                INDEX idx_type (entityType),
                INDEX idx_business (business),
                INDEX idx_createdBy (createdBy),
                INDEX idx_deleted (isDeleted)
            )
        `);

        // Create data_changes table for cross-user sync
        await connection.query(`
            CREATE TABLE IF NOT EXISTS data_changes (
                id VARCHAR(100) PRIMARY KEY,
                entityType VARCHAR(100) NOT NULL,
                operation VARCHAR(20) NOT NULL,
                entityId VARCHAR(100),
                data JSON,
                business VARCHAR(100) DEFAULT 'all',
                userId VARCHAR(100) DEFAULT 'system',
                timestamp TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
                INDEX idx_timestamp (timestamp),
                INDEX idx_business (business),
                INDEX idx_entityType (entityType)
            )
        `);

        console.log('✓ Database initialized successfully');
    } catch (err) {
        console.error('Database initialization error:', err.message);
    } finally {
        connection.release();
    }
}

// Import seed function
async function seedInitialData() {
    const connection = await pool.getConnection();
    try {
        // Check if users already exist
        const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
        if (users[0].count > 0) {
            console.log('✓ Database already seeded');
            return;
        }

        const { v4: uuidv4 } = require('uuid');

        const seedUsers = [
            {
                id: 'USR-SUPERADMIN',
                name: 'DK Super Administrator',
                username: 'superadmin',
                email: 'superadmin@ubms.ph',
                password: 'DK-SA-7829-UBMS',
                role: 'superadmin',
                companies: JSON.stringify(['all']),
                modules: JSON.stringify(['all']),
                status: 'active',
                avatar: 'SA',
                isSuperAdmin: 1,
                mustChangePassword: 0
            },
            {
                id: 'USR-001',
                name: 'Dhomer Bangayan',
                username: 'dhomer.bangayan',
                email: 'dhomer.bangayan@ubms.ph',
                password: 'DB@UBMS2026!',
                role: 'owner',
                companies: JSON.stringify(['all']),
                modules: JSON.stringify(['all']),
                status: 'active',
                avatar: 'DB',
                isSuperAdmin: 0,
                mustChangePassword: 1
            },
            {
                id: 'USR-002',
                name: 'Dheekay Manager',
                username: 'dheekay.manager',
                email: 'dheekay.manager@dheekaybuilders.com',
                password: 'DK12345678',
                role: 'manager',
                companies: JSON.stringify(['dheekay']),
                modules: JSON.stringify(['dashboard', 'crm', 'financial', 'reports', 'invoicing']),
                status: 'active',
                avatar: 'DM',
                isSuperAdmin: 0,
                mustChangePassword: 1
            },
            {
                id: 'USR-003',
                name: 'KDChavit Manager',
                username: 'kdchavit.manager',
                email: 'kdchavit.manager@kdchavitconstruction.com',
                password: 'KD12345678',
                role: 'manager',
                companies: JSON.stringify(['kdchavit']),
                modules: JSON.stringify(['dashboard', 'crm', 'financial', 'reports']),
                status: 'active',
                avatar: 'KM',
                isSuperAdmin: 0,
                mustChangePassword: 1
            },
            {
                id: 'USR-004',
                name: 'Nuatthai Manager',
                username: 'nuatthai.manager',
                email: 'nuatthai.manager@nuatthai.com',
                password: 'NT12345678',
                role: 'manager',
                companies: JSON.stringify(['nuatthai']),
                modules: JSON.stringify(['dashboard', 'crm', 'financial', 'booking', 'pos']),
                status: 'active',
                avatar: 'NM',
                isSuperAdmin: 0,
                mustChangePassword: 1
            },
            {
                id: 'USR-005',
                name: 'Autocasa Manager',
                username: 'autocasa.manager',
                email: 'autocasa.manager@autocasa.com',
                password: 'AC12345678',
                role: 'manager',
                companies: JSON.stringify(['autocasa']),
                modules: JSON.stringify(['dashboard', 'crm', 'financial', 'workshop']),
                status: 'active',
                avatar: 'AM',
                isSuperAdmin: 0,
                mustChangePassword: 1
            },
            {
                id: 'USR-006',
                name: 'Group Accountant',
                username: 'group.accountant',
                email: 'group.accountant@ubms.com',
                password: 'GA12345678',
                role: 'accountant',
                companies: JSON.stringify(['all']),
                modules: JSON.stringify(['dashboard', 'financial', 'reports']),
                status: 'active',
                avatar: 'GA',
                isSuperAdmin: 0,
                mustChangePassword: 1
            }
        ];

        for (const user of seedUsers) {
            await connection.query(
                `INSERT INTO users (id, name, username, email, password, role, companies, modules, status, avatar, isSuperAdmin, mustChangePassword) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [user.id, user.name, user.username, user.email, user.password, user.role, user.companies, user.modules, user.status, user.avatar, user.isSuperAdmin, user.mustChangePassword]
            );
        }

        console.log('✓ Initial users seeded successfully');
    } catch (err) {
        console.error('Seed error:', err.message);
    } finally {
        connection.release();
    }
}

module.exports = { pool, initDatabase, seedInitialData };
