document.addEventListener('DOMContentLoaded', async function () {

  renderShell('attendance');

  function statusBadge(s) {
    if (s === 'present') return `<span class="badge badge-green"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Present</span>`;
    if (s === 'late')    return `<span class="badge badge-orange"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Late</span>`;
    return `<span class="badge badge-red"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Absent</span>`;
  }

  function fmtTime(t) {
    if (!t) return '—';
    const [hh, mm] = t.split(':').map(Number);
    const ampm = hh >= 12 ? 'PM' : 'AM';
    return `${hh % 12 || 12}:${String(mm).padStart(2,'0')} ${ampm}`;
  }

  function calcHours(timeIn, timeOut) {
    if (!timeIn || !timeOut) return '—';
    const [h1,m1] = timeIn.split(':').map(Number);
    const [h2,m2] = timeOut.split(':').map(Number);
    const diff = (h2*60+m2) - (h1*60+m1);
    if (diff <= 0) return '—';
    const h = Math.floor(diff/60), m = diff%60;
    return `${h}h ${m}m`;
  }

  const session = Auth.getSession();
  const now     = new Date();
  const months  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const days    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  // ── Fetch this month's completed attendance from Supabase ──
  const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const { data: logs, error } = await window.db
    .from('attendance')
    .select('*')
    .eq('worker_id', session.worker_id)
    .not('time_out', 'is', null)
    .gte('date', monthStart)
    .order('date', { ascending: false });

  if (error) console.error('[Attendance] load:', error.message);

  const records = (logs || []).map(r => ({
    date:    new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month:'short', day:'2-digit', year:'numeric' }),
    day:     days[new Date(r.date + 'T00:00:00').getDay()],
    timeIn:  fmtTime(r.time_in),
    timeOut: fmtTime(r.time_out),
    total:   calcHours(r.time_in, r.time_out),
    status:  r.status,
  }));

  const total   = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const late    = records.filter(r => r.status === 'late').length;
  const absent  = records.filter(r => r.status === 'absent').length;

  document.getElementById('pageContent').innerHTML = `
    <h1 class="page-title">My Attendance</h1>
    <p class="page-subtitle">Your attendance records for ${months[now.getMonth()]} ${now.getFullYear()}</p>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.25rem;">
      <div class="card" style="display:flex;align-items:center;gap:0.75rem;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <div><div style="font-size:1.4rem;font-weight:700;line-height:1;">${total}</div><div style="font-size:0.72rem;color:var(--muted);">Total Days</div></div>
      </div>
      <div class="card" style="display:flex;align-items:center;gap:0.75rem;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <div><div style="font-size:1.4rem;font-weight:700;color:#22c55e;line-height:1;">${present}</div><div style="font-size:0.72rem;color:var(--muted);">Present</div></div>
      </div>
      <div class="card" style="display:flex;align-items:center;gap:0.75rem;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <div><div style="font-size:1.4rem;font-weight:700;color:#f59e0b;line-height:1;">${late}</div><div style="font-size:0.72rem;color:var(--muted);">Late</div></div>
      </div>
      <div class="card" style="display:flex;align-items:center;gap:0.75rem;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <div><div style="font-size:1.4rem;font-weight:700;color:#ef4444;line-height:1;">${absent}</div><div style="font-size:0.72rem;color:var(--muted);">Absent</div></div>
      </div>
    </div>

    <div class="card">
      ${records.length === 0 ? `
        <div style="text-align:center;padding:3rem;color:var(--muted);">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:0.75rem;opacity:0.35;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <div style="font-size:0.9rem;font-weight:600;margin-bottom:0.3rem;">No attendance records yet</div>
          <div style="font-size:0.78rem;">Go to <a href="worker-timeinout.html" style="color:var(--green-dark);font-weight:600;">Time In / Out</a> to start recording your attendance.</div>
        </div>
      ` : `
        <table>
          <thead>
            <tr><th>Date</th><th>Day</th><th>Time In</th><th>Time Out</th><th>Total Hours</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td>${r.date}</td>
                <td>${r.day}</td>
                <td>${r.timeIn}</td>
                <td>${r.timeOut}</td>
                <td>${r.total}</td>
                <td>${statusBadge(r.status)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      `}
    </div>
  `;
});