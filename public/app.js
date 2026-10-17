/**
 * Frontend System Integration Client Logic
 * Connects directly to Express REST API at /api/v1
 */

const API_BASE = '/api/v1';

// Initial load
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  checkSystemHealth();
  fetchDashboardMetrics();
  setDefaultTimeTravelPicker();
});

// Tab navigation handler
function setupTabs() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.getAttribute('data-tab');

      navButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(t => t.classList.remove('active'));

      btn.classList.add('active');
      const targetElement = document.getElementById(targetTabId);
      if (targetElement) {
        targetElement.classList.add('active');
      }

      // Auto-fetch data when opening tabs
      if (targetTabId === 'tab-dashboard') fetchDashboardMetrics();
      if (targetTabId === 'tab-search') loadAllPatients();
    });
  });
}

// Notification banner display
function showAlert(message, type = 'success') {
  const banner = document.getElementById('alertBanner');
  banner.className = `alert-banner ${type}`;
  banner.innerHTML = `
    <span>${message}</span>
    <button style="background:none;border:none;cursor:pointer;font-weight:bold" onclick="this.parentElement.classList.add('hidden')">&times;</button>
  `;
  banner.classList.remove('hidden');

  setTimeout(() => {
    banner.classList.add('hidden');
  }, 6000);
}

// System Health Check
async function checkSystemHealth() {
  const indicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');

  try {
    const res = await fetch(`${API_BASE}/health`);
    const json = await res.json();

    if (json.data && json.data.database === 'CONNECTED') {
      indicator.className = 'status-indicator connected';
      statusText.textContent = 'API & MariaDB Connected';
    } else {
      indicator.className = 'status-indicator disconnected';
      statusText.textContent = 'Server Online (DB Disconnected)';
    }
  } catch (err) {
    indicator.className = 'status-indicator disconnected';
    statusText.textContent = 'Backend Offline';
  }
}

// ==========================================
// TAB 1: Dashboard Metrics
// ==========================================
async function fetchDashboardMetrics() {
  try {
    const res = await fetch(`${API_BASE}/dashboard/metrics`);
    const json = await res.json();

    if (json.success && json.data) {
      document.getElementById('metricPatients').textContent = json.data.total_patients;
      document.getElementById('metricDoctors').textContent = json.data.total_doctors;
      document.getElementById('metricPrescriptions').textContent = json.data.total_prescriptions;

      renderRecentActivity(json.data.recent_updates || []);
    }
  } catch (err) {
    console.error('Error fetching metrics:', err);
  }
}

function renderRecentActivity(updates) {
  const tbody = document.querySelector('#recentTable tbody');
  if (!updates || updates.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No prescriptions recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = updates.map(u => `
    <tr>
      <td><span class="badge-id">#${u.prescription_id}</span></td>
      <td><strong>${escapeHtml(u.patient_name || 'N/A')}</strong></td>
      <td>${escapeHtml(u.doctor_name || 'N/A')}</td>
      <td>${escapeHtml(u.diagnosis)}</td>
      <td>${escapeHtml(u.medication)}</td>
      <td><span class="badge badge-current">${escapeHtml(u.dosage)}</span></td>
    </tr>
  `).join('');
}

// ==========================================
// TAB 2: Patient Registration
// ==========================================
async function handlePatientRegistration(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmitPatient');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const payload = {
    full_name: document.getElementById('regFullName').value.trim(),
    age: parseInt(document.getElementById('regAge').value, 10),
    contact_number: document.getElementById('regContact').value.trim(),
    emergency_details: document.getElementById('regEmergency').value.trim()
  };

  try {
    const res = await fetch(`${API_BASE}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();

    if (res.ok && json.success) {
      showAlert(`✅ Patient "${json.data.full_name}" registered successfully with ID #${json.data.patient_id}!`, 'success');
      document.getElementById('registerForm').reset();
      fetchDashboardMetrics();
    } else {
      const errDetail = json.error?.details ? json.error.details.join(', ') : json.error?.message;
      showAlert(`❌ Registration failed: ${errDetail || 'Bad Request'}`, 'error');
    }
  } catch (err) {
    showAlert(`❌ Error connecting to server: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Register Patient';
  }
}

// ==========================================
// TAB 3: Patient Search & Profile
// ==========================================
async function loadAllPatients() {
  document.getElementById('searchInput').value = '';
  executePatientSearch('');
}

async function searchPatients() {
  const query = document.getElementById('searchInput').value.trim();
  executePatientSearch(query);
}

async function executePatientSearch(query) {
  const listEl = document.getElementById('patientList');
  listEl.innerHTML = '<li class="empty-state">Searching...</li>';

  try {
    const url = query ? `${API_BASE}/patients?search=${encodeURIComponent(query)}` : `${API_BASE}/patients`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.success && json.data) {
      if (json.data.length === 0) {
        listEl.innerHTML = '<li class="empty-state">No matching patients found.</li>';
        return;
      }

      listEl.innerHTML = json.data.map(p => `
        <li class="patient-item" onclick="selectPatient(${p.patient_id}, this)">
          <div><strong>${escapeHtml(p.full_name)}</strong> <span class="badge-id">#${p.patient_id}</span></div>
          <div style="font-size:0.8rem;color:var(--text-muted)">Age: ${p.age} | Tel: ${escapeHtml(p.contact_number)}</div>
        </li>
      `).join('');
    }
  } catch (err) {
    listEl.innerHTML = `<li class="empty-state text-danger">Failed to search: ${err.message}</li>`;
  }
}

async function selectPatient(patientId, element) {
  document.querySelectorAll('.patient-item').forEach(el => el.classList.remove('selected'));
  if (element) element.classList.add('selected');

  const content = document.getElementById('profileContent');
  content.innerHTML = 'Loading medical profile...';

  try {
    const res = await fetch(`${API_BASE}/patients/${patientId}`);
    const json = await res.json();

    if (json.success && json.data) {
      const p = json.data.patient;
      const prescriptions = json.data.prescriptions || [];

      let rxHtml = '<p class="empty-state">No active prescriptions.</p>';
      if (prescriptions.length > 0) {
        rxHtml = prescriptions.map(rx => `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:0.75rem;margin-bottom:0.5rem">
            <div style="display:flex;justify-content:space-between">
              <strong>${escapeHtml(rx.medication)}</strong>
              <span class="badge badge-current">${escapeHtml(rx.dosage)}</span>
            </div>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.25rem">
              Diagnosis: ${escapeHtml(rx.diagnosis)}<br>
              Physician: ${escapeHtml(rx.doctor_name || 'N/A')} (${escapeHtml(rx.specialization || '')})
            </div>
            <div style="margin-top:0.5rem">
              <button class="btn btn-secondary" style="padding:0.2rem 0.5rem;font-size:0.75rem" onclick="preloadUpdateForm(${rx.prescription_id})">✏️ Edit in Update Form</button>
              <button class="btn btn-secondary" style="padding:0.2rem 0.5rem;font-size:0.75rem" onclick="preloadTimeTravel(${rx.prescription_id})">⏳ Audit History</button>
            </div>
          </div>
        `).join('');
      }

      content.innerHTML = `
        <div style="margin-bottom:1rem">
          <h4>${escapeHtml(p.full_name)} <span class="badge-id">#${p.patient_id}</span></h4>
          <p style="font-size:0.85rem;color:var(--text-muted)">Age: ${p.age} | Contact: ${escapeHtml(p.contact_number)}</p>
          <p style="font-size:0.85rem;color:var(--text-muted)">Emergency Details: ${escapeHtml(p.emergency_details || 'None provided')}</p>
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:1rem 0">
        <h5>Active Prescriptions & Regimens:</h5>
        ${rxHtml}
      `;
    }
  } catch (err) {
    content.innerHTML = `<p class="text-danger">Failed to load profile: ${err.message}</p>`;
  }
}

// ==========================================
// TAB 4: Medical Update Form
// ==========================================
function preloadUpdateForm(rxId) {
  document.querySelector('[data-tab="tab-update"]').click();
  document.getElementById('updatePrescriptionId').value = rxId;
  fetchPrescriptionForUpdate();
}

async function fetchPrescriptionForUpdate() {
  const rxId = document.getElementById('updatePrescriptionId').value;
  if (!rxId) return showAlert('Please enter a prescription ID', 'error');

  try {
    const res = await fetch(`${API_BASE}/prescriptions/${rxId}`);
    const json = await res.json();

    if (json.success && json.data) {
      document.getElementById('updateDiagnosis').value = json.data.diagnosis;
      document.getElementById('updateMedication').value = json.data.medication;
      document.getElementById('updateDosage').value = json.data.dosage;
      showAlert(`Loaded Prescription #${rxId} for ${json.data.patient_name}`, 'success');
    } else {
      showAlert(`Prescription #${rxId} not found`, 'error');
    }
  } catch (err) {
    showAlert(`Error loading prescription: ${err.message}`, 'error');
  }
}

async function handlePrescriptionUpdate(e) {
  e.preventDefault();
  const rxId = document.getElementById('updatePrescriptionId').value;
  const btn = document.getElementById('btnUpdatePrescription');
  btn.disabled = true;
  btn.textContent = 'Updating & Archiving...';

  const payload = {
    diagnosis: document.getElementById('updateDiagnosis').value.trim(),
    medication: document.getElementById('updateMedication').value.trim(),
    dosage: document.getElementById('updateDosage').value.trim()
  };

  try {
    const res = await fetch(`${API_BASE}/prescriptions/${rxId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();

    if (res.ok && json.success) {
      showAlert(`⚡ ${json.message}`, 'success');
      fetchDashboardMetrics();
    } else {
      showAlert(`❌ Update failed: ${json.error?.message || 'Error'}`, 'error');
    }
  } catch (err) {
    showAlert(`❌ Error connecting to server: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '⚡ Apply Medical Update (Trigger Temporal Engine)';
  }
}

// ==========================================
// TAB 5: Time-Travel Audit Viewer
// ==========================================
function preloadTimeTravel(rxId) {
  document.querySelector('[data-tab="tab-timetravel"]').click();
  document.getElementById('ttPrescriptionId').value = rxId;
  queryFullHistory();
}

function setDefaultTimeTravelPicker() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('ttDateTime').value = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

async function queryTimeTravel() {
  const rxId = document.getElementById('ttPrescriptionId').value;
  const dtVal = document.getElementById('ttDateTime').value;

  if (!rxId || !dtVal) {
    return showAlert('Please provide both Prescription ID and a Date/Time', 'error');
  }

  const resultCard = document.getElementById('timeTravelResultCard');
  const content = document.getElementById('timeTravelResultContent');
  resultCard.classList.remove('hidden');
  content.innerHTML = 'Querying MariaDB temporal hidden partitions with FOR SYSTEM_TIME AS OF...';

  try {
    const res = await fetch(`${API_BASE}/temporal/prescriptions/${rxId}?as_of=${encodeURIComponent(dtVal)}`);
    const json = await res.json();

    if (json.success) {
      if (!json.data) {
        content.innerHTML = `
          <div class="snapshot-card">
            <p class="text-danger">No active medical record existed for Prescription #${rxId} at <code>${escapeHtml(json.meta?.as_of_requested)}</code>.</p>
            <p style="font-size:0.85rem;color:var(--text-muted);margin-top:0.5rem">The prescription was created after this timestamp, or deleted before it.</p>
          </div>
        `;
        return;
      }

      const rec = json.data;
      content.innerHTML = `
        <div class="snapshot-card">
          <div class="snapshot-meta">
            QUERY CLAUSE: FOR SYSTEM_TIME AS OF TIMESTAMP('${escapeHtml(json.meta?.as_of_requested)}')<br>
            RECONSTRUCTED AT DATABASE LEVEL VIA HIDDEN PARTITION
          </div>
          <div class="snapshot-field"><span class="label">Prescription ID:</span> <strong>#${rec.prescription_id}</strong></div>
          <div class="snapshot-field"><span class="label">Patient Name:</span> ${escapeHtml(rec.patient_name || 'N/A')} (ID: #${rec.patient_id})</div>
          <div class="snapshot-field"><span class="label">Physician:</span> ${escapeHtml(rec.doctor_name || 'N/A')}</div>
          <div class="snapshot-field"><span class="label">Historical Diagnosis:</span> <strong>${escapeHtml(rec.diagnosis)}</strong></div>
          <div class="snapshot-field"><span class="label">Medication:</span> ${escapeHtml(rec.medication)}</div>
          <div class="snapshot-field"><span class="label">Historical Dosage:</span> <span class="badge badge-current">${escapeHtml(rec.dosage)}</span></div>
        </div>
      `;
    } else {
      content.innerHTML = `<p class="text-danger">Query Error: ${json.error?.message}</p>`;
    }
  } catch (err) {
    content.innerHTML = `<p class="text-danger">Failed to execute time-travel: ${err.message}</p>`;
  }
}

async function queryFullHistory() {
  const rxId = document.getElementById('ttPrescriptionId').value;
  if (!rxId) return showAlert('Please enter a prescription ID', 'error');

  const card = document.getElementById('auditTimelineCard');
  const tbody = document.getElementById('timelineTableBody');
  card.classList.remove('hidden');
  tbody.innerHTML = '<tr><td colspan="8" class="text-center">Loading complete temporal audit trail...</td></tr>';

  try {
    const res = await fetch(`${API_BASE}/temporal/prescriptions/${rxId}/history`);
    const json = await res.json();

    if (json.success && json.data) {
      const timeline = json.data.timeline || [];
      if (timeline.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No history recorded.</td></tr>';
        return;
      }

      tbody.innerHTML = timeline.map(v => `
        <tr style="${v.is_current ? 'background:#f0fdf4' : ''}">
          <td><strong>Rev #${v.version_number}</strong></td>
          <td>
            <span class="badge ${v.is_current ? 'badge-current' : 'badge-history'}">
              ${v.is_current ? 'ACTIVE CURRENT' : 'HISTORICAL LOG'}
            </span>
          </td>
          <td>${escapeHtml(v.diagnosis)}</td>
          <td>${escapeHtml(v.medication)}</td>
          <td><strong style="color:var(--primary)">${escapeHtml(v.dosage)}</strong></td>
          <td>${escapeHtml(v.doctor_name || 'N/A')}</td>
          <td><code>${escapeHtml(v.valid_from)}</code></td>
          <td><code>${v.valid_to ? escapeHtml(v.valid_to) : 'Present'}</code></td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${json.error?.message || 'Error'}</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Failed to load history: ${err.message}</td></tr>`;
  }
}

// Utility to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
