# Temporal Electronic Health Record (EHR) — REST API Specification
**Author:** Dinesh (System Architect & API Developer)  
**Project:** Database Management Systems Project | M.Tech IT, Anna University (MIT Campus)  
**Target Consumers:** Pugal (Frontend UI/UX Developer), Ashqar (Temporal Logic & QA Engineer), Jeeva (Database Engineer)  
**Base URL:** `http://localhost:5000/api/v1`  
**Data Format:** `application/json`

---

## 1. Architectural & Response Standards

### 1.1 HTTP Status Codes
| Code | Meaning | Use Case |
|------|---------|----------|
| `200 OK` | Request succeeded | Successful GET, PUT updates |
| `201 Created` | Resource created | Successful POST (registration, new prescription) |
| `400 Bad Request` | Client validation failure | Missing required fields, invalid date/dosage format |
| `404 Not Found` | Resource not found | Patient/Prescription/Doctor ID not found in database |
| `500 Internal Server Error` | Database/Server error | Unexpected SQL or connection pool exception |

### 1.2 Standard Success Response Envelope
```json
{
  "success": true,
  "message": "Human-readable description of outcome",
  "data": { ... },
  "timestamp": "2026-09-20T16:45:00.000Z"
}
```

### 1.3 Standard Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | DATABASE_ERROR | BAD_REQUEST",
    "message": "Summary of the error",
    "details": [
      "Field 'full_name' is required and must be non-empty string"
    ]
  },
  "timestamp": "2026-09-20T16:45:00.000Z"
}
```

---

## 2. API Endpoints Specification

### 2.1 System & Health (`/health`)

#### `GET /api/v1/health`
Checks server liveness and MariaDB database connectivity.

- **Request:** None
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "System is healthy",
  "data": {
    "status": "UP",
    "database": "CONNECTED",
    "uptime_seconds": 128.45
  },
  "timestamp": "2026-09-20T16:45:00.000Z"
}
```

---

### 2.2 Admin Dashboard (`/dashboard`)
*Supports UI Page 1: Admin Dashboard displaying system metrics and recent updates.*

#### `GET /api/v1/dashboard/metrics`
Aggregates high-level platform statistics for hospital administrators.

- **Request:** None
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Dashboard metrics retrieved",
  "data": {
    "total_patients": 42,
    "total_doctors": 12,
    "total_prescriptions": 156,
    "recent_updates": [
      {
        "prescription_id": 14,
        "patient_name": "John Doe",
        "doctor_name": "Dr. Ramesh Kumar",
        "diagnosis": "Essential Hypertension",
        "medication": "Amlodipine",
        "dosage": "10mg once daily",
        "updated_at": "2026-09-20 16:30:00"
      }
    ]
  },
  "timestamp": "2026-09-20T16:45:00.000Z"
}
```

---

### 2.3 Patient Management (`/patients`)
*Supports UI Page 2: Patient Registration Page & UI Page 3: Patient Search & Profile.*

#### `POST /api/v1/patients`
Registers a new patient.

- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "full_name": "John Doe",
  "age": 42,
  "contact_number": "+91 9123456780",
  "emergency_details": "Spouse: Jane Doe (+91 9123456789)"
}
```
- **Validation Rules:**
  - `full_name`: Required, string, 2-100 characters.
  - `age`: Required, integer, 0-130.
  - `contact_number`: Required, string, 5-15 characters.
  - `emergency_details`: Optional, string.
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Patient registered successfully",
  "data": {
    "patient_id": 1,
    "full_name": "John Doe",
    "age": 42,
    "contact_number": "+91 9123456780",
    "emergency_details": "Spouse: Jane Doe (+91 9123456789)"
  },
  "timestamp": "2026-09-20T16:45:00.000Z"
}
```

#### `GET /api/v1/patients`
Searches or lists patients.
- **Query Parameters:**
  - `search` (optional): Filter by patient name or patient ID. E.g., `/api/v1/patients?search=John`
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Patients retrieved successfully",
  "data": [
    {
      "patient_id": 1,
      "full_name": "John Doe",
      "age": 42,
      "contact_number": "+91 9123456780",
      "emergency_details": "Spouse: Jane Doe (+91 9123456789)"
    }
  ],
  "timestamp": "2026-09-20T16:45:00.000Z"
}
```

#### `GET /api/v1/patients/:id`
Retrieves a complete medical profile for a patient, including active diagnoses and prescriptions.
- **URL Parameter:** `id` (integer)
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Patient profile retrieved successfully",
  "data": {
    "patient": {
      "patient_id": 1,
      "full_name": "John Doe",
      "age": 42,
      "contact_number": "+91 9123456780",
      "emergency_details": "Spouse: Jane Doe (+91 9123456789)"
    },
    "prescriptions": [
      {
        "prescription_id": 1,
        "diagnosis": "Essential Hypertension",
        "medication": "Amlodipine",
        "dosage": "5mg once daily",
        "doctor_id": 1,
        "doctor_name": "Dr. Ramesh Kumar",
        "specialization": "Cardiology"
      }
    ]
  },
  "timestamp": "2026-09-20T16:45:00.000Z"
}
```

#### `PUT /api/v1/patients/:id`
Updates demographic information for a patient.
- **Request Body:** `{ full_name, age, contact_number, emergency_details }`
- **Response (200 OK):** Updated patient record.

---

### 2.4 Doctor Directory (`/doctors`)
*Supports doctor selection dropdowns in prescription forms.*

#### `POST /api/v1/doctors`
Registers a new doctor.
- **Request Body:**
```json
{
  "full_name": "Dr. Ramesh Kumar",
  "specialization": "Cardiology",
  "contact_number": "+91 9876543210"
}
```
- **Response (201 Created):** Created doctor object.

#### `GET /api/v1/doctors`
Returns list of all doctors.
- **Response (200 OK):** Array of doctor objects.

#### `GET /api/v1/doctors/:id`
Returns doctor details by ID.

---

### 2.5 Prescriptions & Medical Updates (`/prescriptions`)
*Supports UI Page 4: Medical Update Form.*

#### `POST /api/v1/prescriptions`
Issues a new prescription to a patient.
- **Request Body:**
```json
{
  "patient_id": 1,
  "doctor_id": 1,
  "diagnosis": "Essential Hypertension",
  "medication": "Amlodipine",
  "dosage": "5mg once daily"
}
```
- **Validation Rules:**
  - `patient_id`: Required, integer, must exist in `patients`.
  - `doctor_id`: Required, integer, must exist in `doctors`.
  - `diagnosis`: Required, string, max 255 chars.
  - `medication`: Required, string, max 255 chars.
  - `dosage`: Required, string, max 100 chars.
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Prescription issued successfully",
  "data": {
    "prescription_id": 1,
    "patient_id": 1,
    "doctor_id": 1,
    "diagnosis": "Essential Hypertension",
    "medication": "Amlodipine",
    "dosage": "5mg once daily"
  },
  "timestamp": "2026-09-20T16:45:00.000Z"
}
```

#### `PUT /api/v1/prescriptions/:id`
Modifies an existing medical diagnosis or prescription dosage.
> **Database Temporal Trigger:** Executing this SQL `UPDATE` causes MariaDB's temporal engine (`WITH SYSTEM VERSIONING`) to automatically timestamp the old record, copy it to the hidden historical partition, and insert the modified record with the current timestamp.

- **Request Body:**
```json
{
  "diagnosis": "Essential Hypertension - Stage 2",
  "medication": "Amlodipine + Telmisartan",
  "dosage": "10mg / 40mg once daily",
  "doctor_id": 1
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Prescription updated. Historical audit state automatically preserved in MariaDB.",
  "data": {
    "prescription_id": 1,
    "diagnosis": "Essential Hypertension - Stage 2",
    "medication": "Amlodipine + Telmisartan",
    "dosage": "10mg / 40mg once daily",
    "doctor_id": 1
  },
  "timestamp": "2026-09-20T16:45:00.000Z"
}
```

#### `GET /api/v1/prescriptions/patient/:patient_id`
Returns all current prescriptions for a specific patient.

---

### 2.6 Temporal Audit Log & Time-Travel Queries (`/temporal`)
*Supports UI Page 5: Temporal Audit Log (Time-Travel Viewer).*

#### `GET /api/v1/temporal/prescriptions/:id?as_of=TIMESTAMP`
Executes MariaDB's `FOR SYSTEM_TIME AS OF` query to retrieve the exact medical record as it existed at the given point in time.

- **Query Parameters:**
  - `as_of`: Required ISO-8601 or SQL datetime string (`YYYY-MM-DD HH:mm:ss` or `YYYY-MM-DDTHH:mm:ss.sssZ`).
- **SQL Executed:**
```sql
SELECT 
    p.prescription_id,
    p.patient_id,
    p.doctor_id,
    p.diagnosis,
    p.medication,
    p.dosage,
    pt.full_name AS patient_name,
    d.full_name AS doctor_name
FROM prescriptions FOR SYSTEM_TIME AS OF ? p
LEFT JOIN patients pt ON p.patient_id = pt.patient_id
LEFT JOIN doctors d ON p.doctor_id = d.doctor_id
WHERE p.prescription_id = ?;
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Historical record retrieved for the requested timestamp",
  "data": {
    "as_of_requested": "2026-09-20 14:00:00",
    "record": {
      "prescription_id": 1,
      "patient_id": 1,
      "patient_name": "John Doe",
      "doctor_name": "Dr. Ramesh Kumar",
      "diagnosis": "Essential Hypertension",
      "medication": "Amlodipine",
      "dosage": "5mg once daily"
    }
  },
  "timestamp": "2026-09-20T16:45:00.000Z"
}
```

#### `GET /api/v1/temporal/prescriptions/:id/history`
Retrieves the complete historical audit timeline for a prescription, utilizing MariaDB's `FOR SYSTEM_TIME ALL` with system columns `ROW_START` and `ROW_END`.

- **SQL Executed:**
```sql
SELECT 
    prescription_id,
    patient_id,
    doctor_id,
    diagnosis,
    medication,
    dosage,
    ROW_START,
    ROW_END
FROM prescriptions FOR SYSTEM_TIME ALL
WHERE prescription_id = ?
ORDER BY ROW_START DESC;
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Complete temporal history retrieved",
  "data": {
    "prescription_id": 1,
    "version_count": 2,
    "timeline": [
      {
        "version": "Current (Active)",
        "diagnosis": "Essential Hypertension - Stage 2",
        "medication": "Amlodipine + Telmisartan",
        "dosage": "10mg / 40mg once daily",
        "valid_from": "2026-09-20 16:30:00",
        "valid_to": "2038-01-19 03:14:07"
      },
      {
        "version": "Historical Revision 1",
        "diagnosis": "Essential Hypertension",
        "medication": "Amlodipine",
        "dosage": "5mg once daily",
        "valid_from": "2026-09-20 10:00:00",
        "valid_to": "2026-09-20 16:30:00"
      }
    ]
  },
  "timestamp": "2026-09-20T16:45:00.000Z"
}
```
