const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

// Bulk import all localStorage data from a client PC
router.post('/import', dataController.bulkImport);

// Export all server data for a business (used on startup to load data)
router.get('/export', dataController.exportAll);

// All users (including those registered on other PCs)
router.get('/users/all', dataController.getAllUsers);

// Login history
router.get('/logins', dataController.getLogins);

// All entities created by a specific user
router.get('/user/:userId', dataController.getByUser);

// Entity CRUD (must come after specific routes above)
router.get('/:entityType', dataController.getEntities);
router.post('/:entityType', dataController.upsertEntity);
router.delete('/:entityType/:id', dataController.deleteEntity);

module.exports = router;
