# Team Developer & Onboarding Guide

Welcome to the **Temporal Electronic Health Record (EHR)** platform development repository!  
This guide introduces the backend architecture built by **Dhinesh (System Architect & API Developer)** and provides instructions for **Pugal**, **Ashqar**, and **Jeeva** on how to set up the environment and connect their respective modules.

---

## 1. Overview of Dhinesh's Work (Backend Architecture)

The backend provides a secure 3-tier bridge between client-side interfaces and the MariaDB system-versioned temporal engine.

### What is Built & Available:
- **Express.js Server** running on `http://localhost:5000` with CORS pre-configured.
- **MariaDB Connection Pool** (`src/config/db.js`) reading from `.env`.
- **Modular REST API Routers & Controllers** (`src/routes/` and `src/controllers/`) serving all 5 frontend pages.
- **Temporal Engine Routes**:
  - `FOR SYSTEM_TIME AS OF`: Point-in-time state reconstruction.
  - `FOR SYSTEM_TIME ALL`: Full audit timeline with `ROW_START` and `ROW_END` tracking.
- **Docker Compose Setup** (`docker-compose.yml`) that spins up MariaDB and automatically runs schema and seed data.
- **Full API Specification Documentation**: See [`docs/api-spec.md`](docs/api-spec.md).

---

## 2. Setting Up MariaDB with Docker

We provide a zero-configuration Docker setup. On first startup, Docker automatically loads [`database/schema.sql`](database/schema.sql) and [`database/seed.sql`](database/seed.sql) into MariaDB.

### If Running in WSL (Ubuntu):
1. Start the Docker service in WSL:
   ```bash
   sudo service docker start
   ```
2. Navigate to the project root inside WSL:
   ```bash
   cd "/mnt/d/college/ADBMS project/Electronic-Health-Record"
   ```
3. Launch MariaDB container in the background:
   ```bash
   docker compose up -d
   ```

### If Running in Windows Docker Desktop / Linux / macOS:
In your terminal, navigate to the repository root and run:
```bash
docker compose up -d
```

### Useful Docker Commands:
- Check container status: `docker compose ps`
- View MariaDB database logs: `docker compose logs -f mariadb`
- Stop the database: `docker compose down`
- Reset and re-seed database completely: `docker compose down -v && docker compose up -d`

*(Note for HeidiSQL users: If you prefer running MariaDB natively without Docker, execute `database/schema.sql` and `database/seed.sql` in HeidiSQL on port 3306).*

---

## 3. Running the Backend Server

1. **Install Node.js Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   A `.env` file is pre-configured with default local credentials. You can also refer to `.env.example`:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=123456
   DB_NAME=temporal_ehr
   ```

3. **Verify Database Connection**:
   ```bash
   npm run test:db
   ```
   *Expected output: `✅ Connection to MariaDB succeeded!` and table list.*

4. **Verify API Endpoints & Middleware**:
   ```bash
   npm run test:api
   ```

5. **Start Development Server (with Auto-Reload)**:
   ```bash
   npm run dev
   ```
   *The server will run on `http://localhost:5000`.*  
   *Health Check: `http://localhost:5000/api/v1/health`*

---

## 4. How Team Members Connect for Their Tasks

### For Pugal (Frontend UI/UX Developer)
- **Base API URL**: `http://localhost:5000/api/v1`
- **CORS**: Already enabled for all origins (`*`). You can make `fetch()` or `axios` calls directly from your local frontend.
- **Endpoints mapped to your 5 UI Pages**:
  1. **Page 1 (Admin Dashboard)**:
     - `GET /api/v1/dashboard/metrics` -> Returns patient count, doctor count, prescription count, and recent updates.
  2. **Page 2 (Patient Registration)**:
     - `POST /api/v1/patients` -> Send JSON `{ full_name, age, contact_number, emergency_details }`.
  3. **Page 3 (Patient Search & Profile)**:
     - `GET /api/v1/patients?search={query}` -> Search patients by name or ID.
     - `GET /api/v1/patients/{id}` -> Returns patient demographics and their active prescriptions.
  4. **Page 4 (Medical Update Form)**:
     - `PUT /api/v1/prescriptions/{id}` -> Send updated `{ diagnosis, medication, dosage, doctor_id }`.
  5. **Page 5 (Temporal Audit Log / Time-Travel Viewer)**:
     - `GET /api/v1/temporal/prescriptions/{id}?as_of=2026-09-20 14:30:00` -> Fetches the record as it existed at the picker timestamp.
     - `GET /api/v1/temporal/prescriptions/{id}/history` -> Returns the full chronological timeline array with `valid_from` and `valid_to` timestamps.
- **Detailed Request/Response Contracts**: Check [`docs/api-spec.md`](docs/api-spec.md).

---

### For Ashqar (Temporal Logic & QA Engineer)
- **Testing Historical Archiving**:
  1. Check an initial prescription: `GET /api/v1/prescriptions/1`.
  2. Perform an update via `PUT /api/v1/prescriptions/1` with new dosage or diagnosis.
  3. Notice that MariaDB's `WITH SYSTEM VERSIONING` captures the previous state without manual log tables.
  4. Query the history endpoint: `GET /api/v1/temporal/prescriptions/1/history`. It returns all historical revisions with `ROW_START` and `ROW_END`.
  5. Query the point-in-time endpoint: `GET /api/v1/temporal/prescriptions/1?as_of={past_timestamp}`.
- **Bulk Mock Data**:
  - Add additional records into [`database/seed.sql`](database/seed.sql) or write automated HTTP injection scripts targeting `POST /api/v1/patients` and `POST /api/v1/prescriptions`.

---

### For Jeeva (Database Engineer & SQL Developer)
- **Schema Location**:
  - Keep master DDL scripts in [`database/schema.sql`](database/schema.sql).
  - Any updates made here will automatically apply when Docker restarts or when executed in HeidiSQL.
- **Database Connection Pool**:
  - Managed centrally in [`src/config/db.js`](src/config/db.js).
  - Uses `mariadb` driver with connection pooling and `dateStrings: true` for clean ISO datetime outputs.
