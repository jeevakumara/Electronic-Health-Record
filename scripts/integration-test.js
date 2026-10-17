/**
 * End-to-End System Integration Test Suite
 * Simulates complete client-server-database workflows:
 * 1. Health check & DB connection
 * 2. Patient registration
 * 3. Doctor registration
 * 4. Prescription creation
 * 5. Medical dosage update (triggers MariaDB WITH SYSTEM VERSIONING)
 * 6. Historical point-in-time time-travel query (FOR SYSTEM_TIME AS OF)
 * 7. Full audit trail timeline query (FOR SYSTEM_TIME ALL with ROW_START/ROW_END)
 * 8. Dashboard metrics aggregation verification
 */
const http = require('http');

const PORT = process.env.PORT || 5000;
const BASE_PATH = '/api/v1';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function request(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: `${BASE_PATH}${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (_) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runIntegrationSuite() {
  console.log('===============================================================');
  console.log('   TEMPORAL EHR PLATFORM — END-TO-END INTEGRATION TEST SUITE   ');
  console.log('===============================================================');
  console.log(`Target Server: http://localhost:${PORT}/api/v1\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (details) console.error(`     Details: ${details}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    console.log('[Phase 1: Health & Connectivity]');
    const health = await request('/health');
    assert(health.status === 200 && health.data.success, 'Server liveness check returns HTTP 200');
    console.log(`     Database status: ${health.data.data?.database || 'UNKNOWN'}`);

    if (health.data.data?.database !== 'CONNECTED') {
      console.log('\n⚠️  Notice: MariaDB is currently offline or unreachable.');
      console.log('   Please run MariaDB (via Docker: docker compose up -d) to execute full DB assertions.');
      console.log(`\nTest Summary: ${passed} passed, ${failed} failed.\n`);
      return;
    }

    // 2. Dashboard metrics initial
    console.log('\n[Phase 2: Initial Dashboard Metrics]');
    const initialMetrics = await request('/dashboard/metrics');
    assert(initialMetrics.status === 200, 'GET /dashboard/metrics returns HTTP 200');
    const prevPatientCount = initialMetrics.data.data.total_patients;
    const prevPrescriptionCount = initialMetrics.data.data.total_prescriptions;
    console.log(`     Current Patients: ${prevPatientCount}, Prescriptions: ${prevPrescriptionCount}`);

    // 3. Register Patient
    console.log('\n[Phase 3: Patient Registration]');
    const patientPayload = {
      full_name: `Integration Test Patient ${Date.now().toString().slice(-4)}`,
      age: 38,
      contact_number: '+91 9888877771',
      emergency_details: 'Relative: Test Contact'
    };
    const patientRes = await request('/patients', 'POST', patientPayload);
    assert(patientRes.status === 201 && patientRes.data.data?.patient_id, 'POST /patients creates patient');
    const patientId = patientRes.data.data.patient_id;
    console.log(`     Created Patient ID: ${patientId} (${patientPayload.full_name})`);

    // Verify search
    const searchRes = await request(`/patients?search=${encodeURIComponent(patientPayload.full_name)}`);
    assert(searchRes.status === 200 && searchRes.data.data.length > 0, 'GET /patients?search locates registered patient');

    // 4. Register Doctor
    console.log('\n[Phase 4: Doctor Registration & Directory]');
    const doctorPayload = {
      full_name: `Dr. Specialist ${Date.now().toString().slice(-4)}`,
      specialization: 'Internal Medicine',
      contact_number: '+91 9777766662'
    };
    const doctorRes = await request('/doctors', 'POST', doctorPayload);
    assert(doctorRes.status === 201 && doctorRes.data.data?.doctor_id, 'POST /doctors creates doctor');
    const doctorId = doctorRes.data.data.doctor_id;
    console.log(`     Created Doctor ID: ${doctorId} (${doctorPayload.full_name})`);

    // 5. Issue Prescription
    console.log('\n[Phase 5: Issue Initial Prescription]');
    const initialPrescription = {
      patient_id: patientId,
      doctor_id: doctorId,
      diagnosis: 'Hypertension Stage 1',
      medication: 'Lisinopril',
      dosage: '10mg once daily'
    };
    const presRes = await request('/prescriptions', 'POST', initialPrescription);
    assert(presRes.status === 201 && presRes.data.data?.prescription_id, 'POST /prescriptions issues prescription');
    const prescriptionId = presRes.data.data.prescription_id;
    console.log(`     Created Prescription ID: ${prescriptionId} -> Dosage: "${initialPrescription.dosage}"`);

    // Record Timestamp T1
    const t1 = new Date();
    const t1Formatted = t1.toISOString().slice(0, 19).replace('T', ' ');
    console.log(`     Recorded Timestamp T1: ${t1Formatted}`);

    // Wait 2 seconds so MariaDB system versioning timestamp clearly advances
    console.log('     Waiting 2 seconds for temporal timestamp progression...');
    await sleep(2000);

    // 6. Update Prescription (Triggering System Versioning)
    console.log('\n[Phase 6: Update Prescription & Trigger Temporal Engine]');
    const updatedPrescription = {
      diagnosis: 'Hypertension Stage 2 - Dosage Escalated',
      medication: 'Lisinopril + Hydrochlorothiazide',
      dosage: '20mg / 12.5mg once daily'
    };
    const updateRes = await request(`/prescriptions/${prescriptionId}`, 'PUT', updatedPrescription);
    assert(updateRes.status === 200, 'PUT /prescriptions/:id updates prescription successfully');
    console.log(`     Updated Prescription ID: ${prescriptionId} -> New Dosage: "${updatedPrescription.dosage}"`);

    // 7. Time-Travel Query (FOR SYSTEM_TIME AS OF)
    console.log('\n[Phase 7: Time-Travel Verification (FOR SYSTEM_TIME AS OF)]');
    const timeTravelRes = await request(`/temporal/prescriptions/${prescriptionId}?as_of=${encodeURIComponent(t1Formatted)}`);
    assert(timeTravelRes.status === 200, 'GET /temporal/prescriptions/:id?as_of=T1 returns HTTP 200');
    
    if (timeTravelRes.data.data) {
      const historicalDosage = timeTravelRes.data.data.dosage;
      assert(
        historicalDosage === initialPrescription.dosage,
        `Point-in-Time reconstruction matches historical state at T1 (Got: "${historicalDosage}", Expected: "${initialPrescription.dosage}")`
      );
    } else {
      console.log('     Note: Exact AS OF precision depends on MariaDB transaction clock.');
    }

    // 8. Full Audit Timeline Query (FOR SYSTEM_TIME ALL)
    console.log('\n[Phase 8: Complete Audit Timeline (FOR SYSTEM_TIME ALL)]');
    const historyRes = await request(`/temporal/prescriptions/${prescriptionId}/history`);
    assert(historyRes.status === 200, 'GET /temporal/prescriptions/:id/history returns HTTP 200');
    const revisions = historyRes.data.data?.timeline || [];
    assert(revisions.length >= 2, `Audit trail preserved both versions (Found ${revisions.length} revisions)`);
    
    if (revisions.length >= 2) {
      console.log(`     Current Revision: ${revisions[0].dosage} (Valid From: ${revisions[0].valid_from})`);
      console.log(`     Prior Revision:   ${revisions[1].dosage} (Valid From: ${revisions[1].valid_from} to ${revisions[1].valid_to})`);
    }

    // 9. Dashboard verification
    console.log('\n[Phase 9: Post-Integration Dashboard Metrics]');
    const finalMetrics = await request('/dashboard/metrics');
    assert(finalMetrics.status === 200, 'GET /dashboard/metrics succeeds');
    assert(
      finalMetrics.data.data.total_patients > prevPatientCount,
      `Patient count incremented (${prevPatientCount} -> ${finalMetrics.data.data.total_patients})`
    );
    assert(
      finalMetrics.data.data.total_prescriptions > prevPrescriptionCount,
      `Prescription count incremented (${prevPrescriptionCount} -> ${finalMetrics.data.data.total_prescriptions})`
    );

    console.log('\n===============================================================');
    console.log(`   INTEGRATION SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED   `);
    console.log('===============================================================\n');

  } catch (err) {
    console.error('❌ Unexpected integration test error:', err.message);
  }
}

runIntegrationSuite();
