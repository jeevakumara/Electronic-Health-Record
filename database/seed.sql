-- ==============================================================================
-- Temporal Electronic Health Record (EHR) Platform
-- Seed Data for Local Development and Testing
-- ==============================================================================

USE temporal_ehr;

-- Insert initial sample doctors
INSERT INTO doctors (full_name, specialization, contact_number) VALUES
('Dr. Ramesh Kumar', 'Cardiology', '+91 9876543210'),
('Dr. Priya Sundaram', 'General Medicine', '+91 9876543211'),
('Dr. Arvind Narayanan', 'Neurology', '+91 9876543212');

-- Insert initial sample patients
INSERT INTO patients (full_name, age, contact_number, emergency_details) VALUES
('John Doe', 42, '+91 9123456780', 'Spouse: Jane Doe (+91 9123456789)'),
('Amina Begum', 29, '+91 9123456781', 'Father: Tariq Begum (+91 9123456790)'),
('Suresh Raina', 55, '+91 9123456782', 'Brother: Ramesh Raina (+91 9123456791)');

-- Insert initial prescriptions
INSERT INTO prescriptions (patient_id, doctor_id, diagnosis, medication, dosage) VALUES
(1, 1, 'Essential Hypertension', 'Amlodipine', '5mg once daily'),
(2, 2, 'Acute Bronchitis', 'Azithromycin', '500mg daily for 3 days'),
(3, 3, 'Migraine with Aura', 'Propranolol', '40mg twice daily');
