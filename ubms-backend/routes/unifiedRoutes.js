const express = require('express');
const router = express.Router();
const unifiedController = require('../controllers/unifiedController');

// Unified dashboard - aggregated stats
router.get('/dashboard', unifiedController.getDashboard);

// List all businesses
router.get('/businesses', unifiedController.getBusinesses);

// System configuration
router.get('/config', unifiedController.getConfig);

// Audit log
router.get('/audit', unifiedController.getAuditLog);
router.post('/audit', unifiedController.addAuditLog);

// Activity consolidation — for managers/superadmin
router.get('/activity/by-user', unifiedController.getActivityByUser);
router.get('/activity/summary', unifiedController.getActivitySummary);

module.exports = router;
