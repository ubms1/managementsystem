const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

router.get('/', documentController.getAll);
router.get('/company/:company', documentController.getByCompany);
router.get('/project/:projectId', documentController.getByProject);
router.get('/:id', documentController.getById);
router.get('/:id/download', documentController.download);
router.post('/', documentController.upload);
router.put('/:id', documentController.update);
router.delete('/:id', documentController.remove);

module.exports = router;
