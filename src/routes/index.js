const express = require('express');
const router = express.Router();

const dashboardRoutes = require('./dashboardRoutes');
const patientRoutes = require('./patientRoutes');
const doctorRoutes = require('./doctorRoutes');
const prescriptionRoutes = require('./prescriptionRoutes');
const temporalRoutes = require('./temporalRoutes');

// Mount sub-routers
router.use('/dashboard', dashboardRoutes);
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/temporal', temporalRoutes);

module.exports = router;
