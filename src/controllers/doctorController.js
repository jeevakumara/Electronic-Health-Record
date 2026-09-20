const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

/**
 * Register a new doctor
 */
async function createDoctor(req, res, next) {
  try {
    const { full_name, specialization, contact_number } = req.body;

    const insertResult = await db.query(
      `INSERT INTO doctors (full_name, specialization, contact_number)
       VALUES (?, ?, ?)`,
      [full_name.trim(), specialization.trim(), contact_number ? contact_number.trim() : null]
    );

    const newDoctorId = Number(insertResult.insertId);
    const rows = await db.query('SELECT * FROM doctors WHERE doctor_id = ?', [newDoctorId]);

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List all doctors
 */
async function getDoctors(req, res, next) {
  try {
    const doctors = await db.query('SELECT * FROM doctors ORDER BY doctor_id ASC');

    res.status(200).json({
      success: true,
      message: 'Doctors retrieved successfully',
      data: doctors,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get doctor by ID
 */
async function getDoctorById(req, res, next) {
  try {
    const doctorId = parseInt(req.params.id, 10);
    if (isNaN(doctorId)) {
      throw new AppError('Invalid doctor ID supplied', 400, 'VALIDATION_ERROR');
    }

    const rows = await db.query('SELECT * FROM doctors WHERE doctor_id = ?', [doctorId]);
    if (!rows || rows.length === 0) {
      throw new AppError(`Doctor with ID ${doctorId} not found`, 404, 'NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      message: 'Doctor retrieved successfully',
      data: rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createDoctor,
  getDoctors,
  getDoctorById
};
