const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { requireBodyFields } = require('../middleware/validate');

// POST /api/v1/patients - Register a patient
router.post('/', requireBodyFields(['full_name', 'age', 'contact_number']), patientController.createPatient);

// GET /api/v1/patients - List or search patients (?search=...)
router.get('/', patientController.getPatients);

// GET /api/v1/patients/:id - Get patient profile with active prescriptions
router.get('/:id', patientController.getPatientById);

// PUT /api/v1/patients/:id - Update patient demographics
router.put('/:id', patientController.updatePatient);

module.exports = router;
