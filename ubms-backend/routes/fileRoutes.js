const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

// Upload a file
router.post('/upload', fileController.upload);

// Get storage statistics
router.get('/stats', fileController.stats);

// List files by business
router.get('/business/:business', fileController.listByBusiness);

// List files by employee
router.get('/employee/:employeeId', fileController.listByEmployee);

// List files by project
router.get('/project/:projectId', fileController.listByProject);

// Download a file
router.get('/:id/download', fileController.download);

// Delete a file
router.delete('/:id', fileController.remove);

module.exports = router;
