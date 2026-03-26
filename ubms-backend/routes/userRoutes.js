const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

// Get all users
router.get('/', userController.getAllUsers);

// Specific routes MUST come before parameterized /:userId
// Get user by username
router.get('/username/:username', userController.getUserByUsername);

// Get user by email
router.get('/email/:email', userController.getUserByEmail);

// Create new user
router.post('/', userController.createUser);

// Deactivate user
router.patch('/:userId/deactivate', userController.deactivateUser);

// Activate user
router.patch('/:userId/activate', userController.activateUser);

// Get user by ID (parameterized — must be AFTER specific routes)
router.get('/:userId', userController.getUserById);

// Update user
router.put('/:userId', userController.updateUser);

// Delete user
router.delete('/:userId', userController.deleteUser);

module.exports = router;
