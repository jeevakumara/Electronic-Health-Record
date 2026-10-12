const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { requireBodyFields } = require('../middleware/validate');

// POST /api/v1/doctors - Register a doctor
router.post('/', requireBodyFields(['full_name', 'specialization']), doctorController.createDoctor);

// GET /api/v1/doctors - List all doctors
router.get('/', doctorController.getDoctors);

// GET /api/v1/doctors/:id - Get doctor by ID
router.get('/:id', doctorController.getDoctorById);

module.exports = router;
