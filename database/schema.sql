-- ==============================================================================
-- Temporal Electronic Health Record (EHR) Platform
-- Database Schema: System-Versioned Temporal Tables
-- DBMS Project | M.Tech IT, Anna University (MIT Campus)
-- Database Engineer: Jeeva
-- ==============================================================================

-- Create and select the project database
CREATE DATABASE IF NOT EXISTS temporal_ehr;
USE temporal_ehr;

-- Drop tables if they already exist (in reverse order of foreign keys)
DROP TABLE IF EXISTS prescriptions;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS patients;

-- 1. Patients Table with System Versioning
CREATE TABLE patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    age INT,
    contact_number VARCHAR(15),
    emergency_details TEXT
) WITH SYSTEM VERSIONING;

-- 2. Doctors Table with System Versioning
CREATE TABLE doctors (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100),
    contact_number VARCHAR(15)
) WITH SYSTEM VERSIONING;

-- 3. Prescriptions Table (Core Temporal Audit Table)
CREATE TABLE prescriptions (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    doctor_id INT,
    diagnosis VARCHAR(255) NOT NULL,
    medication VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE
) WITH SYSTEM VERSIONING;
