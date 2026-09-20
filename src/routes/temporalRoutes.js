const express = require('express');
const router = express.Router();
const temporalController = require('../controllers/temporalController');

// GET /api/v1/temporal/prescriptions/:id?as_of=YYYY-MM-DD HH:mm:ss
// Retrieves historical state of a prescription at a given timestamp
router.get('/prescriptions/:id', temporalController.getTimeTravelPrescription);

// GET /api/v1/temporal/prescriptions/:id/history
// Retrieves full change history across all temporal partitions
router.get('/prescriptions/:id/history', temporalController.getPrescriptionHistory);

module.exports = router;
