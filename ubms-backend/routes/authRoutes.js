const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// User login
router.post('/login', authController.login);

// Super Admin login by code
router.post('/superadmin', authController.superAdminLogin);

// Reset password via forgot-password
router.post('/reset-password', authController.resetPassword);

// Update Super Admin code
router.post('/update-sa-code', authController.updateSuperAdminCode);

module.exports = router;
