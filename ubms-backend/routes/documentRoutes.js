const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

// Specific routes MUST come before parameterized /:id
router.get('/', documentController.getAll);
router.get('/company/:company', documentController.getByCompany);
router.get('/project/:projectId', documentController.getByProject);
router.post('/', documentController.upload);

// Parameterized routes AFTER specific routes
router.get('/:id/download', documentController.download);
router.get('/:id', documentController.getById);
router.put('/:id', documentController.update);
router.delete('/:id', documentController.remove);

module.exports = router;
