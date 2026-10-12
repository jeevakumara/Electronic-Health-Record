const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

/**
 * Issue a new prescription
 */
async function createPrescription(req, res, next) {
  try {
    const { patient_id, doctor_id, diagnosis, medication, dosage } = req.body;

    const patientId = parseInt(patient_id, 10);
    const doctorId = parseInt(doctor_id, 10);

    if (isNaN(patientId) || isNaN(doctorId)) {
      throw new AppError('patient_id and doctor_id must be valid numbers', 400, 'VALIDATION_ERROR');
    }

    // Check if patient exists
    const patientRows = await db.query('SELECT patient_id FROM patients WHERE patient_id = ?', [patientId]);
    if (!patientRows || patientRows.length === 0) {
      throw new AppError(`Patient with ID ${patientId} does not exist`, 404, 'NOT_FOUND');
    }

    // Check if doctor exists
    const doctorRows = await db.query('SELECT doctor_id FROM doctors WHERE doctor_id = ?', [doctorId]);
    if (!doctorRows || doctorRows.length === 0) {
      throw new AppError(`Doctor with ID ${doctorId} does not exist`, 404, 'NOT_FOUND');
    }

    const insertResult = await db.query(
      `INSERT INTO prescriptions (patient_id, doctor_id, diagnosis, medication, dosage)
       VALUES (?, ?, ?, ?, ?)`,
      [patientId, doctorId, diagnosis.trim(), medication.trim(), dosage.trim()]
    );

    const newPrescriptionId = Number(insertResult.insertId);

    const prescriptionRows = await db.query(`
      SELECT 
        p.prescription_id,
        p.patient_id,
        p.doctor_id,
        p.diagnosis,
        p.medication,
        p.dosage,
        pt.full_name AS patient_name,
        d.full_name AS doctor_name
      FROM prescriptions p
      LEFT JOIN patients pt ON p.patient_id = pt.patient_id
      LEFT JOIN doctors d ON p.doctor_id = d.doctor_id
      WHERE p.prescription_id = ?
    `, [newPrescriptionId]);

    res.status(201).json({
      success: true,
      message: 'Prescription issued successfully',
      data: prescriptionRows[0],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing prescription (e.g., dosage change or diagnosis revision)
 * NOTE: This UPDATE statement automatically triggers MariaDB's WITH SYSTEM VERSIONING
 * engine, archiving the existing record into the system-versioned temporal partition.
 */
async function updatePrescription(req, res, next) {
  try {
    const prescriptionId = parseInt(req.params.id, 10);
    if (isNaN(prescriptionId)) {
      throw new AppError('Invalid prescription ID supplied in URL', 400, 'VALIDATION_ERROR');
    }

    const { diagnosis, medication, dosage, doctor_id } = req.body;

    const existing = await db.query('SELECT * FROM prescriptions WHERE prescription_id = ?', [prescriptionId]);
    if (!existing || existing.length === 0) {
      throw new AppError(`Prescription with ID ${prescriptionId} not found`, 404, 'NOT_FOUND');
    }

    let parsedDoctorId = null;
    if (doctor_id !== undefined && doctor_id !== null) {
      parsedDoctorId = parseInt(doctor_id, 10);
      if (isNaN(parsedDoctorId)) {
        throw new AppError('doctor_id must be a valid integer', 400, 'VALIDATION_ERROR');
      }
      const doctorCheck = await db.query('SELECT doctor_id FROM doctors WHERE doctor_id = ?', [parsedDoctorId]);
      if (!doctorCheck || doctorCheck.length === 0) {
        throw new AppError(`Doctor with ID ${parsedDoctorId} does not exist`, 404, 'NOT_FOUND');
      }
    }

    await db.query(`
      UPDATE prescriptions
      SET diagnosis = COALESCE(?, diagnosis),
          medication = COALESCE(?, medication),
          dosage = COALESCE(?, dosage),
          doctor_id = COALESCE(?, doctor_id)
      WHERE prescription_id = ?
    `, [
      diagnosis ? diagnosis.trim() : null,
      medication ? medication.trim() : null,
      dosage ? dosage.trim() : null,
      parsedDoctorId,
      prescriptionId
    ]);

    const updated = await db.query(`
      SELECT 
        p.prescription_id,
        p.patient_id,
        p.doctor_id,
        p.diagnosis,
        p.medication,
        p.dosage,
        pt.full_name AS patient_name,
        d.full_name AS doctor_name
      FROM prescriptions p
      LEFT JOIN patients pt ON p.patient_id = pt.patient_id
      LEFT JOIN doctors d ON p.doctor_id = d.doctor_id
      WHERE p.prescription_id = ?
    `, [prescriptionId]);

    res.status(200).json({
      success: true,
      message: 'Prescription updated successfully. MariaDB temporal engine automatically archived previous state.',
      data: updated[0],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get prescription details by ID
 */
async function getPrescriptionById(req, res, next) {
  try {
    const prescriptionId = parseInt(req.params.id, 10);
    if (isNaN(prescriptionId)) {
      throw new AppError('Invalid prescription ID supplied in URL', 400, 'VALIDATION_ERROR');
    }

    const rows = await db.query(`
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
      FROM prescriptions p
      LEFT JOIN patients pt ON p.patient_id = pt.patient_id
      LEFT JOIN doctors d ON p.doctor_id = d.doctor_id
      WHERE p.prescription_id = ?
    `, [prescriptionId]);

    if (!rows || rows.length === 0) {
      throw new AppError(`Prescription with ID ${prescriptionId} not found`, 404, 'NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      message: 'Prescription retrieved successfully',
      data: rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all prescriptions for a specific patient
 */
async function getPrescriptionsByPatient(req, res, next) {
  try {
    const patientId = parseInt(req.params.patient_id, 10);
    if (isNaN(patientId)) {
      throw new AppError('Invalid patient ID supplied in URL', 400, 'VALIDATION_ERROR');
    }

    const prescriptions = await db.query(`
      SELECT 
        p.prescription_id,
        p.patient_id,
        p.doctor_id,
        p.diagnosis,
        p.medication,
        p.dosage,
        d.full_name AS doctor_name,
        d.specialization
      FROM prescriptions p
      LEFT JOIN doctors d ON p.doctor_id = d.doctor_id
      WHERE p.patient_id = ?
      ORDER BY p.prescription_id DESC
    `, [patientId]);

    res.status(200).json({
      success: true,
      message: 'Patient prescriptions retrieved successfully',
      data: prescriptions,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPrescription,
  updatePrescription,
  getPrescriptionById,
  getPrescriptionsByPatient
};
