const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

router.get('/', attendanceController.getAll);
router.get('/company/:company', attendanceController.getByCompany);
router.get('/employee/:employeeId', attendanceController.getByEmployee);
router.post('/', attendanceController.create);
router.put('/:id/clockout', attendanceController.clockOut);

// Face descriptor endpoints
router.get('/face/:employeeId', attendanceController.getFaceDescriptor);
router.post('/face/enroll', attendanceController.enrollFace);

module.exports = router;
