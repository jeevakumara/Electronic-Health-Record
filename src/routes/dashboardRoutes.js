const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /api/v1/dashboard/metrics
router.get('/metrics', dashboardController.getMetrics);

module.exports = router;
