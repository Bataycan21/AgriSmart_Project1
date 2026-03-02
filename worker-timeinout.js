renderShell('timeinout');

const timeLogs = [
  { date: 'Feb 20, 2026', timeIn: '7:02 AM', timeOut: '--',      total: 'In progress', status: 'active' },
  { date: 'Feb 19, 2026', timeIn: '7:05 AM', timeOut: '4:00 PM', total: '8h 55m',      status: 'completed' },
  { date: 'Feb 18, 2026', timeIn: '6:58 AM', timeOut: '4:00 PM', total: '9h 02m',      status: 'completed' },
  { date: 'Feb 17, 2026', timeIn: '7:00 AM', timeOut: '4:00 PM', total: '9h 00m',      status: 'completed' },
  { date: 'Feb 14, 2026', timeIn: '7:01 AM', timeOut: '4:00 PM', total: '8h 59m',      status: 'completed' },
];

let timedIn = true;
let geofenceInside = true;

function statusBadge(s) {
  return s === 'active'
    ? `<span class="badge badge-green">Active</span>`
    : `<span class="badge badge-gray">Completed</span>`;
}

function renderPage() {
  document.getElementById('pageContent').innerHTML = `
    <h1 class="page-title">Time In / Time Out</h1>
    <p class="page-subtitle">Record your daily attendance</p>

    <div style="display:grid;grid-template-columns:1fr 380px;gap:1rem;margin-bottom:1rem;">

      <!-- Clock Card -->
      <div class="card" style="text-align:center;padding:2rem 1.5rem;">
        <div style="margin-bottom:1rem;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="1.5" style="background:#f0fdf4;border-radius:50%;padding:10px;">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div style="font-size:0.78rem;color:var(--muted);margin-bottom:0.25rem;">Current Time</div>
        <div id="liveClock" style="font-size:2.4rem;font-weight:700;color:var(--text);letter-spacing:0.02em;line-height:1;margin-bottom:0.25rem;">--:-- --</div>
        <div id="liveDate"  style="font-size:0.82rem;color:var(--muted);margin-bottom:1.75rem;">--, -- --, ----</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
          <div onclick="handleTimeIn()" style="padding:1.25rem;border:1.5px solid ${timedIn ? '#dcfce7' : 'var(--border)'};border-radius:12px;background:${timedIn ? '#f0fdf4' : 'white'};cursor:pointer;transition:all 0.2s;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${timedIn ? '#22c55e' : 'var(--muted)'}" stroke-width="2" style="margin-bottom:0.5rem;"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            <div style="font-size:0.9rem;font-weight:600;color:${timedIn ? '#22c55e' : 'var(--muted)'};">Time In</div>
            <div style="font-size:0.75rem;color:${timedIn ? '#22c55e' : 'var(--muted)'};">${timedIn ? '7:02 AM' : 'Tap to time in'}</div>
          </div>
          <div onclick="handleTimeOut()" style="padding:1.25rem;border:1.5px solid #fecaca;border-radius:12px;background:#fff5f5;cursor:pointer;transition:all 0.2s;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="margin-bottom:0.5rem;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <div style="font-size:0.9rem;font-weight:600;color:#ef4444;">Time Out</div>
            <div style="font-size:0.75rem;color:#ef4444;">${!timedIn ? 'Recorded' : 'Tap to time out'}</div>
          </div>
        </div>
      </div>

      <!-- Geofence Card -->
      <div class="card">
        <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:1rem;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
          <div>
            <div style="font-size:0.88rem;font-weight:600;">Geofence Status</div>
            <div style="font-size:0.72rem;color:var(--muted);">Location verification</div>
          </div>
        </div>
        <div style="padding:0.85rem 1rem;border-radius:10px;background:${geofenceInside ? '#f0fdf4' : '#fff5f5'};border:1px solid ${geofenceInside ? '#dcfce7' : '#fecaca'};display:flex;align-items:flex-start;gap:0.6rem;margin-bottom:1rem;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${geofenceInside ? '#22c55e' : '#ef4444'}" stroke-width="2" style="flex-shrink:0;margin-top:1px;">
            ${geofenceInside
              ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
              : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'}
          </svg>
          <div>
            <div style="font-size:0.82rem;font-weight:600;color:${geofenceInside ? '#166534' : '#991b1b'};">${geofenceInside ? 'Inside Farm Area' : 'Outside Farm Area'}</div>
            <div style="font-size:0.72rem;color:var(--muted);">${geofenceInside ? 'You are within the designated farm geofence' : 'You are outside the designated farm geofence'}</div>
          </div>
        </div>
        <div style="margin-bottom:1rem;">
          <div style="font-size:0.8rem;font-weight:600;margin-bottom:0.35rem;display:flex;align-items:center;gap:0.4rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
            Current Location
          </div>
          <div style="font-size:0.8rem;font-weight:500;">Farm Zone A – Rice Paddies Section</div>
          <div style="font-size:0.72rem;color:var(--muted);">14.5995, 120.9842</div>
        </div>
        <button onclick="toggleGeofence()" style="width:100%;padding:0.6rem;background:white;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.8rem;cursor:pointer;">
          Toggle Geofence (Demo)
        </button>
      </div>
    </div>

    <!-- Recent Logs Table -->
    <div class="card">
      <h3 style="font-size:1rem;font-weight:600;margin-bottom:1.25rem;">Recent Time Logs</h3>
      <table>
        <thead>
          <tr><th>Date</th><th>Time In</th><th>Time Out</th><th>Total Hours</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${timeLogs.map(r => `
            <tr>
              <td>${r.date}</td><td>${r.timeIn}</td><td>${r.timeOut}</td>
              <td>${r.total}</td><td>${statusBadge(r.status)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
  startClock();
}

function startClock() {
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function tick() {
    const now = new Date();
    let h = now.getHours(), m = now.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const pad = n => String(n).padStart(2,'0');
    const c = document.getElementById('liveClock');
    const d = document.getElementById('liveDate');
    if (c) c.textContent = `${pad(h)}:${pad(m)} ${ampm}`;
    if (d) d.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  }
  tick();
  setInterval(tick, 1000);
}

function handleTimeIn()  { if (!timedIn) { timedIn = true;  renderPage(); } }
function handleTimeOut() {
  if (timedIn && confirm('Are you sure you want to Time Out?')) { timedIn = false; renderPage(); }
}
function toggleGeofence() { geofenceInside = !geofenceInside; renderPage(); }

renderPage();