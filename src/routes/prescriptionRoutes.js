const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { requireBodyFields } = require('../middleware/validate');

// POST /api/v1/prescriptions - Issue a new prescription
router.post('/', requireBodyFields(['patient_id', 'doctor_id', 'diagnosis', 'medication', 'dosage']), prescriptionController.createPrescription);

// PUT /api/v1/prescriptions/:id - Update an existing prescription (triggers MariaDB temporal archiving)
router.put('/:id', prescriptionController.updatePrescription);

// GET /api/v1/prescriptions/:id - Get specific prescription
router.get('/:id', prescriptionController.getPrescriptionById);

// GET /api/v1/prescriptions/patient/:patient_id - Get all prescriptions for a patient
router.get('/patient/:patient_id', prescriptionController.getPrescriptionsByPatient);

module.exports = router;
