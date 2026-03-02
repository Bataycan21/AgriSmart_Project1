renderShell('attendance');

const records = [
  { date:'Feb 20, 2026', day:'Thursday',  timeIn:'7:02 AM', timeOut:'--',      status:'present' },
  { date:'Feb 19, 2026', day:'Wednesday', timeIn:'7:05 AM', timeOut:'4:00 PM', status:'late'    },
  { date:'Feb 18, 2026', day:'Tuesday',   timeIn:'6:58 AM', timeOut:'4:00 PM', status:'present' },
  { date:'Feb 17, 2026', day:'Monday',    timeIn:'--',       timeOut:'--',      status:'absent'  },
  { date:'Feb 14, 2026', day:'Friday',    timeIn:'7:01 AM', timeOut:'4:00 PM', status:'present' },
  { date:'Feb 13, 2026', day:'Thursday',  timeIn:'6:55 AM', timeOut:'4:00 PM', status:'present' },
  { date:'Feb 12, 2026', day:'Wednesday', timeIn:'7:00 AM', timeOut:'4:00 PM', status:'present' },
  { date:'Feb 11, 2026', day:'Tuesday',   timeIn:'7:10 AM', timeOut:'4:00 PM', status:'late'    },
  { date:'Feb 10, 2026', day:'Monday',    timeIn:'6:59 AM', timeOut:'4:00 PM', status:'present' },
  { date:'Feb 07, 2026', day:'Friday',    timeIn:'7:00 AM', timeOut:'4:00 PM', status:'present' },
];

function statusBadge(s) {
  if (s === 'present') return `<span class="badge badge-green"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Present</span>`;
  if (s === 'late')    return `<span class="badge badge-orange"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Late</span>`;
  return `<span class="badge badge-red"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Absent</span>`;
}

const total   = records.length;
const present = records.filter(r => r.status === 'present').length;
const late    = records.filter(r => r.status === 'late').length;
const absent  = records.filter(r => r.status === 'absent').length;

document.getElementById('pageContent').innerHTML = `
  <h1 class="page-title">My Attendance</h1>
  <p class="page-subtitle">Your attendance records for February 2026</p>

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
    <table>
      <thead><tr><th>Date</th><th>Day</th><th>Time In</th><th>Time Out</th><th>Status</th></tr></thead>
      <tbody>
        ${records.map(r => `
          <tr>
            <td>${r.date}</td><td>${r.day}</td><td>${r.timeIn}</td>
            <td>${r.timeOut}</td><td>${statusBadge(r.status)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
`;