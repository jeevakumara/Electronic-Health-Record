const db = require('../config/db');

/**
 * Controller for Admin Dashboard metrics
 * Provides summary statistics and latest platform activity
 */
async function getMetrics(req, res, next) {
  try {
    const patientCountResult = await db.query('SELECT COUNT(*) AS total FROM patients');
    const doctorCountResult = await db.query('SELECT COUNT(*) AS total FROM doctors');
    const prescriptionCountResult = await db.query('SELECT COUNT(*) AS total FROM prescriptions');

    const recentUpdates = await db.query(`
      SELECT 
        p.prescription_id,
        pt.full_name AS patient_name,
        d.full_name AS doctor_name,
        p.diagnosis,
        p.medication,
        p.dosage
      FROM prescriptions p
      LEFT JOIN patients pt ON p.patient_id = pt.patient_id
      LEFT JOIN doctors d ON p.doctor_id = d.doctor_id
      ORDER BY p.prescription_id DESC
      LIMIT 5
    `);

    res.status(200).json({
      success: true,
      message: 'Dashboard metrics retrieved',
      data: {
        total_patients: Number(patientCountResult[0]?.total || 0),
        total_doctors: Number(doctorCountResult[0]?.total || 0),
        total_prescriptions: Number(prescriptionCountResult[0]?.total || 0),
        recent_updates: recentUpdates
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMetrics
};
