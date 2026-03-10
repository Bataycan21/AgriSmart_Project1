document.addEventListener('DOMContentLoaded', async function () {

  renderShell('timeinout');

  let geofenceInside = true;

  function formatCutoffDisplay(t) {
    let [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  async function renderPage() {
    const [timedIn, timedOut, todayLog, logs] = await Promise.all([
      AttendanceStore.isTimedInToday(),
      AttendanceStore.isTimedOutToday(),
      AttendanceStore.getTodayLog(),
      AttendanceStore.getLogs(),
    ]);
    const cutoff = AttendanceStore.getCutoff();

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
          <div style="font-size:0.72rem;color:var(--muted);margin-bottom:0.15rem;">
            Cutoff Time: <strong>${formatCutoffDisplay(cutoff)}</strong>
          </div>
          <div style="font-size:0.78rem;color:var(--muted);margin-bottom:0.25rem;">Current Time</div>
          <div id="liveClock" style="font-size:2.4rem;font-weight:700;color:var(--text);letter-spacing:0.02em;line-height:1;margin-bottom:0.25rem;">--:-- --</div>
          <div id="liveDate"  style="font-size:0.82rem;color:var(--muted);margin-bottom:1.75rem;">--, -- --, ----</div>

          ${!geofenceInside ? `
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:0.65rem 0.9rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;text-align:left;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style="font-size:0.75rem;color:#92400e;">You are outside the farm area. You can still time in but your location will be flagged.</span>
            </div>
          ` : ''}

          ${timedOut ? `
            <div style="background:#f0fdf4;border:1px solid #dcfce7;border-radius:10px;padding:0.85rem;margin-bottom:1rem;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" style="margin-bottom:0.35rem;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <div style="font-size:0.82rem;font-weight:600;color:#166534;">Attendance recorded for today</div>
              <div style="font-size:0.72rem;color:var(--muted);">In: ${todayLog?.timeIn || '—'} &nbsp;·&nbsp; Out: ${todayLog?.timeOut || '—'}</div>
            </div>
          ` : ''}

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
            <div onclick="handleTimeIn()"
              style="padding:1.25rem;border:1.5px solid ${timedIn||timedOut ? '#dcfce7' : 'var(--border)'};border-radius:12px;background:${timedIn||timedOut ? '#f0fdf4' : 'white'};cursor:${timedOut ? 'not-allowed' : 'pointer'};transition:all 0.2s;opacity:${timedOut ? '0.6' : '1'};">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${timedIn||timedOut ? '#22c55e' : 'var(--muted)'}" stroke-width="2" style="margin-bottom:0.5rem;">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              <div style="font-size:0.9rem;font-weight:600;color:${timedIn||timedOut ? '#22c55e' : 'var(--muted)'};">Time In</div>
              <div style="font-size:0.75rem;color:${timedIn||timedOut ? '#22c55e' : 'var(--muted)'};">
                ${timedIn||timedOut ? todayLog?.timeIn || '—' : 'Tap to time in'}
              </div>
            </div>

            <div onclick="handleTimeOut()"
              style="padding:1.25rem;border:1.5px solid ${timedOut ? '#dcfce7' : '#fecaca'};border-radius:12px;background:${timedOut ? '#f0fdf4' : timedIn ? '#fff5f5' : '#f9fafb'};cursor:${!timedIn||timedOut ? 'not-allowed' : 'pointer'};transition:all 0.2s;opacity:${!timedIn&&!timedOut ? '0.45' : '1'};">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${timedOut ? '#22c55e' : '#ef4444'}" stroke-width="2" style="margin-bottom:0.5rem;">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <div style="font-size:0.9rem;font-weight:600;color:${timedOut ? '#22c55e' : '#ef4444'};">Time Out</div>
              <div style="font-size:0.75rem;color:${timedOut ? '#22c55e' : '#ef4444'};">
                ${timedOut ? todayLog?.timeOut || '—' : timedIn ? 'Tap to time out' : 'Time in first'}
              </div>
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
              <div style="font-size:0.82rem;font-weight:600;color:${geofenceInside ? '#166534' : '#991b1b'};">
                ${geofenceInside ? 'Inside Farm Area' : 'Outside Farm Area'}
              </div>
              <div style="font-size:0.72rem;color:var(--muted);">
                ${geofenceInside ? 'You are within the designated farm geofence' : 'You are outside the designated farm geofence'}
              </div>
            </div>
          </div>
          <div style="margin-bottom:1rem;">
            <div style="font-size:0.8rem;font-weight:600;margin-bottom:0.35rem;">Current Location</div>
            <div style="font-size:0.8rem;font-weight:500;">Farm Zone A – Rice Paddies Section</div>
            <div style="font-size:0.72rem;color:var(--muted);">14.5995, 120.9842</div>
          </div>
          <button onclick="toggleGeofence()" style="width:100%;padding:0.6rem;background:white;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.8rem;cursor:pointer;">
            Toggle Geofence (Demo)
          </button>
        </div>
      </div>

      <!-- Recent Logs -->
      <div class="card">
        <h3 style="font-size:1rem;font-weight:600;margin-bottom:1.25rem;">Recent Time Logs</h3>
        ${logs.length === 0 ? `
          <div style="text-align:center;padding:2.5rem;color:var(--muted);">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:0.5rem;opacity:0.4;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <div style="font-size:0.82rem;">No time logs yet. Tap Time In to start.</div>
          </div>
        ` : `
          <table>
            <thead>
              <tr><th>Date</th><th>Time In</th><th>Time Out</th><th>Total Hours</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${logs.map(r => `
                <tr>
                  <td>${r.date}</td>
                  <td>${r.timeIn}</td>
                  <td>${r.timeOut || '—'}</td>
                  <td>${r.total || '—'}</td>
                  <td>${r.active
                    ? `<span class="badge badge-green">Active</span>`
                    : `<span class="badge badge-gray">Completed</span>`}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;

    startClock();
  }

  function startClock() {
    const dayNames   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    function tick() {
      const now  = new Date();
      let h = now.getHours(), m = now.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      const pad = n => String(n).padStart(2,'0');
      const c = document.getElementById('liveClock');
      const d = document.getElementById('liveDate');
      if (c) c.textContent = `${pad(h)}:${pad(m)} ${ampm}`;
      if (d) d.textContent = `${dayNames[now.getDay()]}, ${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    }
    tick();
    setInterval(tick, 1000);
  }

  window.handleTimeIn = async function () {
    const timedIn  = await AttendanceStore.isTimedInToday();
    const timedOut = await AttendanceStore.isTimedOutToday();
    if (timedIn || timedOut) return;
    if (!geofenceInside) {
      if (!confirm('You are outside the farm area. Your location will be flagged. Time in anyway?')) return;
    }
    const result = await AttendanceStore.timeIn();
    if (!result.success) { alert(result.error); return; }
    await renderPage();
  };

  window.handleTimeOut = async function () {
    const timedIn  = await AttendanceStore.isTimedInToday();
    const timedOut = await AttendanceStore.isTimedOutToday();
    if (!timedIn || timedOut) return;
    if (!confirm('Are you sure you want to Time Out?')) return;
    const result = await AttendanceStore.timeOut();
    if (!result.success) { alert(result.error); return; }
    await renderPage();
  };

  window.toggleGeofence = async function () {
    geofenceInside = !geofenceInside;
    await renderPage();
  };

  await renderPage();
});