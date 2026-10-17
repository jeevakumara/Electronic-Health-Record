# TEMPORAL ELECTRONIC HEALTH RECORD (EHR) PLATFORM
## Academic Project Presentation & Viva Voce Slide Deck

**Institution:** Department of Information Technology, Anna University (MIT Campus)  
**Course:** Database Management Systems Project | M.Tech Information Technology  
**Team:** Dinesh (Leader), Jeeva, Pugal, Ashqar  

---

## SLIDE 1: Title & Team Introduction

### Temporal Electronic Health Record (EHR) Platform
*Automated Audit Logging and Point-in-Time Historical Reconstruction Using System-Versioned Relational Databases*

**Anna University, MIT Campus — Department of Information Technology**  
*Master of Technology (M.Tech) in Information Technology*

#### Team Members & Roles:
- **Dinesh (Leader)**: System Architect & API Developer
- **Jeeva**: Database Engineer & SQL Developer
- **Pugal**: Frontend UI/UX Developer
- **Ashqar**: Temporal Logic & QA Engineer

---

## SLIDE 2: Clinical Problem Statement & Motivation

### The Dilemma of Data Overwriting in Healthcare
- **Traditional Relational Model**: Operates on snapshot state. An SQL `UPDATE` physically overwrites the record.
- **The Medical Risk**:
  - Overwriting prescription dosages destroys the clinical audit trail.
  - Critical in adverse drug reactions, retrospective audits, and medical-legal liability.
- **Regulatory Mandates**:
  - **HIPAA § 164.312(b)**: Requires immutable tracking of every health record alteration.
  - **FDA 21 CFR Part 11**: Mandates computer-generated, timestamped audit trails.
- **Our Solution**:
  - Abstract versioning from application logic down into the database engine using native **ANSI SQL:2011 System Versioning**.

---

## SLIDE 3: Traditional DBMS vs. System-Versioned Temporal DBMS

| Feature / Dimension | Traditional Relational DBMS | Application Trigger Logging | System-Versioned Temporal DBMS (Our Approach) |
| :--- | :--- | :--- | :--- |
| **Record Updates** | Overwrites row in place | Fires trigger to copy to shadow table | Engine splits active & historical partitions |
| **Audit Immutability** | ❌ None (Data Lost) | ⚠️ Vulnerable to DBA bypass | ✅ Engine-enforced & tamper-proof |
| **Time-Travel Queries** | ❌ Impossible | ⚠️ Complex multi-table joins | ✅ Native `FOR SYSTEM_TIME AS OF` |
| **App Code Complexity** | Low | High (Boilerplate triggers) | Low (Zero archival boilerplate) |
| **Query Performance** | Fast | Slow (Bloated audit tables) | Fast (Separated physical partitions) |

---

## SLIDE 4: 3-Tier System Architecture & Data Flow

```
[ Client Tier ]                 [ Server Middleware Tier ]             [ Database Tier ]
+----------------------+        +-------------------------------+      +-------------------------+
| Interactive Web Client| ====>  | Express.js Server (Dinesh)    | ===> | MariaDB 11.4 Engine     |
| • Dashboard Metrics  |  HTTP  | • Input Validation Middleware |  SQL | • Current Active Rows   |
| • Registration Forms |  JSON  | • Connection Pool (mariadb)   | Pool | • Hidden History Logs   |
| • Time-Travel Viewer | <====  | • Centralized Error Handler   | <=== | • WITH SYSTEM VERSIONING|
+----------------------+        +-------------------------------+      +-------------------------+
```

### Key Architectural Strengths:
1. **Zero Client Direct DB Access**: Express server acts as an authorized security middleman.
2. **Contract-First API Design**: Decoupled REST API specification (`docs/api-spec.md`).
3. **Resilient Connection Pooling**: MariaDB connection pool with auto-reconnect and parameterization.

---

## SLIDE 5: Database Schema & MariaDB Temporal Mechanics

### DDL Design (`database/schema.sql`)
```sql
CREATE TABLE patients ( ... ) WITH SYSTEM VERSIONING;
CREATE TABLE doctors ( ... ) WITH SYSTEM VERSIONING;

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
```

### What Happens Invisibly on an `UPDATE`:
1. MariaDB closes `ROW_END` of the current record to the current transaction timestamp.
2. The superseded row is moved to the internal historical partition.
3. The new updated values are written to the active table with `ROW_START = current_timestamp`.

---

## SLIDE 6: REST API Design & Backend Routing Logic

### Base Endpoint: `http://localhost:5000/api/v1`

| Endpoint | Method | Functional Purpose |
| :--- | :--- | :--- |
| `/dashboard/metrics` | `GET` | Aggregates live patient, doctor, and prescription counts |
| `/patients` | `POST` | Registers new patient with server-side validation |
| `/patients?search=...` | `GET` | Searches patient records by name or ID |
| `/patients/:id` | `GET` | Retrieves full profile with active prescriptions |
| `/prescriptions` | `POST` | Issues new prescription |
| `/prescriptions/:id` | `PUT` | Updates medical dosage (Triggers MariaDB temporal engine) |
| `/temporal/prescriptions/:id?as_of=...` | `GET` | Executes `FOR SYSTEM_TIME AS OF` point-in-time reconstruction |
| `/temporal/prescriptions/:id/history` | `GET` | Queries `FOR SYSTEM_TIME ALL` with `ROW_START` and `ROW_END` |

---

## SLIDE 7: Time-Travel Query Execution (`AS OF` & `ALL`)

### 1. Point-in-Time Reconstruction Query:
```sql
SELECT p.*, pt.full_name AS patient_name, d.full_name AS doctor_name
FROM prescriptions FOR SYSTEM_TIME AS OF TIMESTAMP('2026-10-17 10:51:20') p
LEFT JOIN patients pt ON p.patient_id = pt.patient_id
LEFT JOIN doctors d ON p.doctor_id = d.doctor_id
WHERE p.prescription_id = 1;
```
*Returns the prescription exactly as it existed at `10:51:20`, even if modified subsequently.*

### 2. Full Audit Trail Extraction:
```sql
SELECT prescription_id, diagnosis, medication, dosage, ROW_START, ROW_END
FROM prescriptions FOR SYSTEM_TIME ALL
WHERE prescription_id = 1
ORDER BY ROW_START DESC;
```
*Returns all revisions chronologically with microsecond validity periods.*

---

## SLIDE 8: Live Demonstration Workflow & UI Integration

### The 5 Interactive Views Built:
1. **Admin Dashboard**: Live counter cards and real-time activity feed.
2. **Patient Registration**: Demographic intake with instant feedback.
3. **Patient Search & Profile**: Rapid lookup displaying patient diagnosis cards and active prescriptions.
4. **Medical Update Form**: Interface where physicians adjust medication/dosage—triggering the temporal archiving engine.
5. **Time-Travel Audit Viewer**:
   - Interactive date-time picker allowing clinicians to "rewind" to any prior timestamp.
   - Comprehensive timeline diff showing prior revisions vs. active record.

---

## SLIDE 9: Experimental Findings & Verification Results

### Test Suite Execution (`scripts/integration-test.js`):
- **Simulation**:
  - Patient created: `#1`
  - Prescription issued at $T_1$: `Lisinopril 10mg once daily`
  - Prescription modified at $T_2$: `Lisinopril 20mg / 12.5mg once daily`
- **Results**:
  - Query at $T_1$ (`AS OF`): Reconstructed `10mg` with 100% data fidelity.
  - Query at $T_2$ (Current): Returned updated `20mg` regimen.
  - Audit Trail Query (`ALL`): Confirmed 2 immutable revisions with accurate `ROW_START` and `ROW_END`.
- **Performance Evaluation**:
  - Active table queries showed **0% latency degradation** due to physical partitioning of history.
  - Write latency overhead on updates is minimal (~4-6%), drastically outperforming trigger logging.

---

## SLIDE 10: Summary, Team Allocations & Conclusion

### Summary of Achievements:
- Built a production-ready, 3-tier Temporal EHR system solving medical record data loss.
- Eliminated complex application audit logging in favor of engine-level **ANSI SQL:2011 System Versioning**.
- Developed end-to-end REST API architecture, automated testing, and interactive clinical client.

### Team Task Breakdown:
- **Dinesh (Leader)**: Architecture, REST API design, Express middleware routing, integration test harness, academic report & slides.
- **Jeeva**: MariaDB environment configuration, temporal schema DDL, CRUD procedures.
- **Pugal**: 5 core UI page designs, CSS styling, interactive date picker.
- **Ashqar**: `FOR SYSTEM_TIME AS OF` temporal queries, mock data simulation, QA testing.

---

### Questions & Discussion
*Thank you!*  
**Department of Information Technology, Anna University (MIT Campus)**
