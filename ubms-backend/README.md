# UBMS Backend - REST API

This is the Node.js + Express + MySQL backend for the Unified Business System Platform (UBMS). It provides REST API endpoints for user management, authentication, and audit logging.

## Features

- ✅ User Management (CRUD operations)
- ✅ User Authentication (regular & Super Admin)
- ✅ Password Reset
- ✅ Audit Logging
- ✅ Role-Based Access Control
- ✅ Company Segregation
- ✅ MySQL Database Integration

## Prerequisites

- Node.js (v14+)
- MySQL / MariaDB (v5.7+)
- npm

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# MySQL Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ubms_database
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=development

# Super Admin Code
SA_CODE=DK-SA-7829-UBMS
```

### 3. Create MySQL Database (Optional - Auto-created)

The backend will automatically create the database and tables on first run.

If you want to manually create it:

```sql
CREATE DATABASE ubms_database;
```

### 4. Start the Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication

#### User Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "dheekay.manager",
  "password": "DK12345678",
  "company": "dheekay"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "USR-002",
    "username": "dheekay.manager",
    "name": "Dheekay Manager",
    "email": "dheekay.manager@dheekaybuilders.com",
    "role": "manager",
    "companies": ["dheekay"],
    "modules": ["dashboard", "crm", "financial"],
    "company": "dheekay",
    "isSuperAdmin": false,
    "avatar": "DM"
  }
}
```

#### Super Admin Login
```
POST /api/auth/superadmin
Content-Type: application/json

{
  "code": "DK-SA-7829-UBMS"
}
```

#### Reset Password
```
POST /api/auth/reset-password
Content-Type: application/json

{
  "username": "dheekay.manager",
  "email": "dheekay.manager@dheekaybuilders.com",
  "newPassword": "NewPassword123"
}
```

### User Management

#### Get All Users
```
GET /api/users
```

#### Get User by ID
```
GET /api/users/:userId
```

#### Get User by Username
```
GET /api/users/username/:username
```

#### Get User by Email
```
GET /api/users/email/:email
```

#### Create New User
```
POST /api/users
Content-Type: application/json

{
  "name": "New User",
  "username": "new.user",
  "email": "new.user@example.com",
  "password": "Password123",
  "role": "manager",
  "companies": ["dheekay"],
  "modules": ["dashboard", "crm"],
  "mustChangePassword": true
}
```

#### Update User
```
PUT /api/users/:userId
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "updated@example.com",
  "companies": ["dheekay", "nuatthai"]
}
```

#### Deactivate User
```
PATCH /api/users/:userId/deactivate
```

#### Activate User
```
PATCH /api/users/:userId/activate
```

#### Delete User
```
DELETE /api/users/:userId
```

## Default Users

These users are automatically created on first run:

| Username | Password | Role | Companies | Access |
|----------|----------|------|-----------|--------|
| superadmin | DK-SA-7829-UBMS | superadmin | all | All modules |
| dhomer.bangayan | DB@UBMS2026! | owner | all | All modules |
| dheekay.manager | DK12345678 | manager | dheekay | Construction modules |
| kdchavit.manager | KD12345678 | manager | kdchavit | Construction modules |
| nuatthai.manager | NT12345678 | manager | nuatthai | Wellness modules |
| autocasa.manager | AC12345678 | manager | autocasa | Auto workshop modules |
| group.accountant | GA12345678 | accountant | all | Financial modules |

## Database Schema

### users
```sql
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255),
  username VARCHAR(100) UNIQUE,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  role VARCHAR(50),
  companies JSON,
  modules JSON,
  status VARCHAR(50),
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lastLogin TIMESTAMP,
  avatar VARCHAR(10),
  isSuperAdmin BOOLEAN,
  mustChangePassword BOOLEAN
)
```

### audit_logs
```sql
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user VARCHAR(255),
  action VARCHAR(255),
  detail TEXT,
  level VARCHAR(50)
)
```

### customers
```sql
CREATE TABLE customers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  company VARCHAR(100),
  totalSpent DECIMAL(10, 2),
  created DATE
)
```

### invoices
```sql
CREATE TABLE invoices (
  id VARCHAR(50) PRIMARY KEY,
  customerId VARCHAR(50),
  company VARCHAR(100),
  amount DECIMAL(10, 2),
  paid DECIMAL(10, 2),
  status VARCHAR(50),
  description TEXT,
  issueDate DATE,
  dueDate DATE,
  paymentMethod VARCHAR(50),
  created TIMESTAMP
)
```

## Frontend Integration

To use this backend in your frontend, update the `API_BASE_URL` in your frontend's `db.js`:

```javascript
const API_BASE_URL = 'http://localhost:3000/api';
```

All existing API calls will now use the backend instead of localStorage.

## Project Structure

```
ubms-backend/
├── config/
│   └── db.js              # MySQL connection & initialization
├── controllers/
│   ├── authController.js  # Authentication logic
│   └── userController.js  # User CRUD logic
├── models/
│   └── User.js            # User model
├── routes/
│   ├── authRoutes.js      # Auth endpoints
│   └── userRoutes.js      # User endpoints
├── middleware/
│   └── errorHandler.js    # Global error handler
├── app.js                 # Express app & server setup
├── package.json           # Dependencies
├── .env                   # Environment variables
└── README.md              # This file
```

## Error Handling

All errors return a JSON response with `success: false` and an `error` message:

```json
{
  "success": false,
  "error": "User not found"
}
```

## Security Notes

⚠️ **Important:** This is a development/demo backend. For production:
- Use password hashing (bcrypt)
- Implement JWT tokens for authentication
- Add rate limiting
- Use HTTPS
- Implement proper access control middleware
- Never expose Super Admin code in .env files

## Extending the Backend

The backend is designed to be easily extended with more modules:

### Add a New Model
Create `/models/Invoice.js` similar to `/models/User.js`

### Add New Routes
Create `/routes/invoiceRoutes.js` and import in `app.js`:
```javascript
const invoiceRoutes = require('./routes/invoiceRoutes');
app.use('/api/invoices', invoiceRoutes);
```

### Add New Controllers
Create `/controllers/invoiceController.js` with CRUD operations

## Troubleshooting

### Connection Refused
- Ensure MySQL is running
- Check DB_HOST, DB_USER, DB_PASSWORD in .env

### Table Already Exists Error
- This is normal; tables are created only if they don't exist

### PORT Already in Use
- Change PORT in .env to a different number (e.g., 3001)

## License

ISC

## Support

For issues or questions, contact the development team.
