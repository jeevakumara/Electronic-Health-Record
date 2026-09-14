# Temporal Electronic Health Record (EHR) Platform

**Database Management Systems Project | M.Tech Information Technology, Anna University (MIT Campus)**

## Project Overview
The Temporal Electronic Health Record (EHR) platform is an advanced database management project designed to solve the critical issue of data loss in medical records[cite: 1]. Traditional databases overwrite historical data upon updates, destroying the medical audit trail[cite: 1]. This project implements a system-versioned temporal database to ensure an immutable, automated history of every patient record, diagnosis, and prescription change[cite: 1]. The platform will allow healthcare administrators to execute "time-travel" queries, retrieving the exact state of a patient's record at any specific point in the past without relying on complex application-level manual logging[cite: 1].
## Tech Stack
* **Frontend:** HTML, CSS, JavaScript (JSON Payloads, Client-side validation)
* **Backend:** Node.js, Express.js (REST API, HTTP POST/PUT routing)
* **Database:** MariaDB (utilizing `WITH SYSTEM VERSIONING` for temporal tables)

## System Architecture
The system operates on a 3-tier architecture (Client-Server-Database), ensuring seamless data processing and historical archiving[cite: 1].
* **Frontend:** Users interact via structured HTML forms; data is packaged into a JSON payload and sent via HTTP POST or PUT requests[cite: 1].
* **Backend:** A Node.js server receives the JSON payload, validates the input, and constructs the appropriate SQL query, ensuring no direct database access from the client side[cite: 1].
* **Database:** MariaDB intercepts updates using the `WITH SYSTEM VERSIONING` clause[cite: 1]. It automatically closes the timestamp on the existing row, moves it to a hidden history partition, and inserts the new data with a new start timestamp to guarantee a perfect audit trail[cite: 1].

## Core UI Pages
1. **Admin Dashboard:** The landing page displaying system metrics, total patient count, and recent global updates[cite: 1].
2. **Patient Registration Page:** A form to input new patient demographics (Name, Age, Contact, Emergency details)[cite: 1].
3. **Patient Search & Profile:** A search bar to locate patients, leading to their medical profile with active prescriptions and current diagnoses[cite: 1].
4. **Medical Update Form:** The interface to update diagnoses or change medication dosages, which triggers the temporal database engine[cite: 1].
5. **Temporal Audit Log (Time-Travel Viewer):** A page featuring a date-and-time picker that reflects the patient's exact medical record as it existed at that specific millisecond in the past, highlighting changes[cite: 1].

## Team Organization & Task Allocation

### Dinesh (System Architect & API Developer)
* Design the REST API specifications (Endpoints, Request/Response JSON structures)[cite: 1].
* Develop the Node.js/Express server routing logic[cite: 1].
* Handle system integration between the frontend client and the database server[cite: 1].
* Compile the final academic report and presentation slides[cite: 1].

### Jeeva (Database Engineer & SQL Developer)
* Install and configure the MariaDB server[cite: 1].
* Write all Data Definition Language (DDL) scripts, specifically implementing `WITH SYSTEM VERSIONING`[cite: 1].
* Write optimized standard SQL procedures for CRUD operations[cite: 1].
* Design the Entity-Relationship (ER) models for Patients, Doctors, and Prescriptions[cite: 1].

### Pugal (Frontend UI/UX Developer)
* Develop all 5 core UI pages (Dashboard, Search, Profile, Forms, Audit Log)[cite: 1].
* Implement client-side form validation before data is sent to the server[cite: 1].
* Build the interactive "Time-Travel" date picker component[cite: 1].
* Manage CSS styling and responsive layout for the medical dashboards[cite: 1].

### Ashqar (Temporal Logic & QA Engineer)
* Write the complex `FOR SYSTEM_TIME AS OF` queries to retrieve historical states[cite: 1].
* Develop scripts to generate and inject 1,000+ records of mock patient data to simulate a live hospital environment[cite: 1].
* Execute end-to-end testing, deliberately modifying and deleting records to prove the temporal history tables capture every event[cite: 1].
* Identify and fix edge cases in data retrieval timelines[cite: 1].
