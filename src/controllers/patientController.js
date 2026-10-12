const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

/**
 * Register a new patient
 */
async function createPatient(req, res, next) {
  try {
    const { full_name, age, contact_number, emergency_details } = req.body;

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 130) {
      throw new AppError('Age must be a valid integer between 0 and 130', 400, 'VALIDATION_ERROR');
    }

    const insertResult = await db.query(
      `INSERT INTO patients (full_name, age, contact_number, emergency_details)
       VALUES (?, ?, ?, ?)`,
      [full_name.trim(), parsedAge, contact_number.trim(), emergency_details ? emergency_details.trim() : null]
    );

    const newPatientId = Number(insertResult.insertId);

    const rows = await db.query('SELECT * FROM patients WHERE patient_id = ?', [newPatientId]);

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      data: rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve patients, with optional name or ID search
 */
async function getPatients(req, res, next) {
  try {
    const { search } = req.query;

    let sql = 'SELECT * FROM patients';
    let params = [];

    if (search && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      const searchNum = parseInt(search.trim(), 10);

      if (!isNaN(searchNum)) {
        sql += ' WHERE patient_id = ? OR full_name LIKE ?';
        params = [searchNum, searchTerm];
      } else {
        sql += ' WHERE full_name LIKE ?';
        params = [searchTerm];
      }
    }

    sql += ' ORDER BY patient_id DESC';

    const patients = await db.query(sql, params);

    res.status(200).json({
      success: true,
      message: 'Patients retrieved successfully',
      data: patients,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get patient profile by ID, including current active prescriptions
 */
async function getPatientById(req, res, next) {
  try {
    const patientId = parseInt(req.params.id, 10);
    if (isNaN(patientId)) {
      throw new AppError('Invalid patient ID supplied in URL', 400, 'VALIDATION_ERROR');
    }

    const patientRows = await db.query('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
    if (!patientRows || patientRows.length === 0) {
      throw new AppError(`Patient with ID ${patientId} not found`, 404, 'NOT_FOUND');
    }

    const prescriptions = await db.query(`
      SELECT 
        p.prescription_id,
        p.diagnosis,
        p.medication,
        p.dosage,
        p.doctor_id,
        d.full_name AS doctor_name,
        d.specialization
      FROM prescriptions p
      LEFT JOIN doctors d ON p.doctor_id = d.doctor_id
      WHERE p.patient_id = ?
      ORDER BY p.prescription_id DESC
    `, [patientId]);

    res.status(200).json({
      success: true,
      message: 'Patient profile retrieved successfully',
      data: {
        patient: patientRows[0],
        prescriptions: prescriptions
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update patient demographic info
 */
async function updatePatient(req, res, next) {
  try {
    const patientId = parseInt(req.params.id, 10);
    if (isNaN(patientId)) {
      throw new AppError('Invalid patient ID supplied in URL', 400, 'VALIDATION_ERROR');
    }

    const { full_name, age, contact_number, emergency_details } = req.body;

    const existing = await db.query('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
    if (!existing || existing.length === 0) {
      throw new AppError(`Patient with ID ${patientId} not found`, 404, 'NOT_FOUND');
    }

    await db.query(`
      UPDATE patients
      SET full_name = COALESCE(?, full_name),
          age = COALESCE(?, age),
          contact_number = COALESCE(?, contact_number),
          emergency_details = COALESCE(?, emergency_details)
      WHERE patient_id = ?
    `, [
      full_name ? full_name.trim() : null,
      age !== undefined ? parseInt(age, 10) : null,
      contact_number ? contact_number.trim() : null,
      emergency_details !== undefined ? emergency_details.trim() : null,
      patientId
    ]);

    const updated = await db.query('SELECT * FROM patients WHERE patient_id = ?', [patientId]);

    res.status(200).json({
      success: true,
      message: 'Patient demographics updated successfully',
      data: updated[0],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient
};
