const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

/**
 * Controller for Temporal Database Engine Queries
 * Implements MariaDB system-versioned temporal queries:
 * 1. FOR SYSTEM_TIME AS OF: Point-in-time "Time Travel" reconstruction
 * 2. FOR SYSTEM_TIME ALL: Complete historical audit trail with ROW_START and ROW_END
 */

/**
 * Query a prescription as it existed at an exact historical timestamp
 * GET /api/v1/temporal/prescriptions/:id?as_of=YYYY-MM-DD HH:mm:ss
 */
async function getTimeTravelPrescription(req, res, next) {
  try {
    const prescriptionId = parseInt(req.params.id, 10);
    if (isNaN(prescriptionId)) {
      throw new AppError('Invalid prescription ID supplied in URL', 400, 'VALIDATION_ERROR');
    }

    const { as_of } = req.query;
    if (!as_of) {
      throw new AppError('Query parameter "as_of" is required (e.g. ?as_of=2026-09-20 14:30:00 or ISO timestamp)', 400, 'VALIDATION_ERROR');
    }

    // Format timestamp string safely for MariaDB TIMESTAMP
    // Supports ISO8601 strings e.g. "2026-09-20T14:30:00.000Z" or "2026-09-20 14:30:00"
    let formattedTimestamp = as_of;
    if (as_of.includes('T')) {
      const parsedDate = new Date(as_of);
      if (isNaN(parsedDate.getTime())) {
        throw new AppError('Invalid date format provided in "as_of"', 400, 'VALIDATION_ERROR');
      }
      formattedTimestamp = parsedDate.toISOString().slice(0, 19).replace('T', ' ');
    }

    // Execute MariaDB system-versioned temporal query
    const sql = `
      SELECT 
        p.prescription_id,
        p.patient_id,
        p.doctor_id,
        p.diagnosis,
        p.medication,
        p.dosage,
        pt.full_name AS patient_name,
        d.full_name AS doctor_name,
        d.specialization
      FROM prescriptions FOR SYSTEM_TIME AS OF TIMESTAMP(?) p
      LEFT JOIN patients FOR SYSTEM_TIME AS OF TIMESTAMP(?) pt ON p.patient_id = pt.patient_id
      LEFT JOIN doctors FOR SYSTEM_TIME AS OF TIMESTAMP(?) d ON p.doctor_id = d.doctor_id
      WHERE p.prescription_id = ?
    `;

    const rows = await db.query(sql, [formattedTimestamp, formattedTimestamp, formattedTimestamp, prescriptionId]);

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No record existed at the specified historical timestamp',
        data: null,
        meta: {
          as_of_requested: formattedTimestamp,
          prescription_id: prescriptionId
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Historical record retrieved successfully for the requested point in time',
      data: rows[0],
      meta: {
        as_of_requested: formattedTimestamp,
        prescription_id: prescriptionId
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve the full audit trail and change history for a prescription
 * GET /api/v1/temporal/prescriptions/:id/history
 */
async function getPrescriptionHistory(req, res, next) {
  try {
    const prescriptionId = parseInt(req.params.id, 10);
    if (isNaN(prescriptionId)) {
      throw new AppError('Invalid prescription ID supplied in URL', 400, 'VALIDATION_ERROR');
    }

    // Using FOR SYSTEM_TIME ALL to extract every version across historical partitions
    const sql = `
      SELECT 
        p.prescription_id,
        p.patient_id,
        p.doctor_id,
        p.diagnosis,
        p.medication,
        p.dosage,
        p.ROW_START,
        p.ROW_END,
        d.full_name AS doctor_name
      FROM prescriptions FOR SYSTEM_TIME ALL p
      LEFT JOIN doctors d ON p.doctor_id = d.doctor_id
      WHERE p.prescription_id = ?
      ORDER BY p.ROW_START DESC
    `;

    const versions = await db.query(sql, [prescriptionId]);

    if (!versions || versions.length === 0) {
      throw new AppError(`No prescription found with ID ${prescriptionId}`, 404, 'NOT_FOUND');
    }

    const timeline = versions.map((row, index) => {
      const isCurrent = index === 0;
      return {
        version_number: versions.length - index,
        is_current: isCurrent,
        diagnosis: row.diagnosis,
        medication: row.medication,
        dosage: row.dosage,
        doctor_name: row.doctor_name,
        valid_from: row.ROW_START,
        valid_to: row.ROW_END
      };
    });

    res.status(200).json({
      success: true,
      message: 'Full temporal history retrieved from MariaDB system versioning',
      data: {
        prescription_id: prescriptionId,
        total_revisions: versions.length,
        timeline: timeline,
        raw_revisions: versions
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTimeTravelPrescription,
  getPrescriptionHistory
};
