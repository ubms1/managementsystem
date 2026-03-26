const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

// SSE stream for real-time updates
router.get('/stream', syncController.stream);

// Submit a single change
router.post('/changes', syncController.submitChange);

// Submit bulk changes (offline sync)
router.post('/bulk', syncController.submitBulk);

// Get changes since timestamp
router.get('/changes/:since', syncController.getChangesSince);

// Sync status
router.get('/status', syncController.status);

module.exports = router;
