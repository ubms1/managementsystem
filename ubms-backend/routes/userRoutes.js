const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

// Get all users
router.get('/', userController.getAllUsers);

// Get user by ID
router.get('/:userId', userController.getUserById);

// Get user by username
router.get('/username/:username', userController.getUserByUsername);

// Get user by email
router.get('/email/:email', userController.getUserByEmail);

// Create new user
router.post('/', userController.createUser);

// Update user
router.put('/:userId', userController.updateUser);

// Deactivate user
router.patch('/:userId/deactivate', userController.deactivateUser);

// Activate user
router.patch('/:userId/activate', userController.activateUser);

// Delete user
router.delete('/:userId', userController.deleteUser);

module.exports = router;
