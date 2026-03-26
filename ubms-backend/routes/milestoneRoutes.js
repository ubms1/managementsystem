const express = require('express');
const router = express.Router();
const milestoneController = require('../controllers/milestoneController');

router.get('/', milestoneController.getAll);
router.get('/project/:projectId', milestoneController.getByProject);
router.post('/', milestoneController.create);
router.put('/:id', milestoneController.update);
router.delete('/:id', milestoneController.remove);

module.exports = router;
