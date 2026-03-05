// ================================================================
// SUPABASE SETUP INSTRUCTIONS FOR GITHUB COPILOT
// ================================================================
//
// Add to admin-workers.html <head> (in this order):
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="supabase.js"></script>
//
// supabase.js should contain:
//   const db = window.supabase.createClient('YOUR_URL', 'YOUR_ANON_KEY')
//
// ── REQUIRED TABLES ──────────────────────────────────────────────
//
// TABLE: workers
//   id         int8,  PK, auto
//   name       text,  NOT NULL
//   email      text,  UNIQUE, NOT NULL
//   role       text   → 'Field Worker' | 'Supervisor' | 'Equipment Operator'
//   join_date  date,  default today
//   status     text,  default 'active' → 'active' | 'inactive'
//   created_at timestamptz, default now()
//   RLS: Admin/Supervisor = ALL | Workers = SELECT their own row
//
// TABLE: attendance
//   id          int8, PK, auto
//   worker_id   int8, FK → workers.id
//   worker_name text
//   date        date, NOT NULL
//   time_in     text  → e.g. '7:02 AM'
//   time_out    text  → e.g. '4:00 PM'
//   status      text  → 'present' | 'late' | 'absent'
//   created_at  timestamptz, default now()
//   RLS: Admin/Supervisor = ALL
//       Workers = SELECT/INSERT/UPDATE their own rows
//
// TABLE: worker_role_history
//   id          int8, PK, auto
//   worker_id   int8, FK → workers.id
//   worker_name text
//   old_role    text
//   new_role    text
//   changed_by  text  → Auth.getSession().name
//   changed_at  timestamptz, default now()
//   notes       text
//   RLS: Admin/Supervisor = ALL | Workers = no access
//
// ── COPILOT: HOW TO CONNECT ───────────────────────────────────────
//
// LOAD WORKERS (registered accounts only):
//   const { data } = await db.from('workers').select('*').order('name')
//   workers = data || []
//
// LOAD ATTENDANCE FOR ONE WORKER:
//   const { data } = await db.from('attendance').select('*')
//     .eq('worker_id', workerId).order('date', { ascending: false }).limit(30)
//   attendRows = data || []
//
// UPDATE ROLE:
//   await db.from('workers').update({ role: newRole }).eq('id', workerId)
//
// LOG ROLE CHANGE:
//   await db.from('worker_role_history').insert({
//     worker_id: w.id, worker_name: w.name,
//     old_role, new_role, notes,
//     changed_by: Auth.getSession()?.name || 'Admin'
//   })
//
// TOGGLE STATUS:
//   await db.from('workers').update({ status }).eq('id', workerId)
//
// LOAD ROLE HISTORY:
//   const { data } = await db.from('worker_role_history')
//     .select('*').order('changed_at', { ascending: false })
//
// REAL-TIME attendance updates:
//   db.channel('attendance-live')
//     .on('postgres_changes', { event: 'INSERT', schema: 'public',
//         table: 'attendance', filter: `worker_id=eq.${id}` },
//         () => loadAttendance(id))
//     .subscribe()
// ================================================================

renderShell('workers');

// TODO: SUPABASE — replace with:
// const { data } = await db.from('workers').select('*').order('name')
// workers = data || []
let workers = [
  { id:1, name:'Juan Dela Cruz',  email:'juan@agrismart.app',   role:'Field Worker',       join_date:'2025-01-15', status:'active'   },
  { id:2, name:'Maria Clara',     email:'maria@agrismart.app',  role:'Supervisor',         join_date:'2024-11-20', status:'active'   },
  { id:3, name:'Pedro Santos',    email:'pedro@agrismart.app',  role:'Field Worker',       join_date:'2025-03-01', status:'active'   },
  { id:4, name:'Ana Reyes',       email:'ana@agrismart.app',    role:'Equipment Operator', join_date:'2024-08-10', status:'inactive' },
  { id:5, name:'Carlos Garcia',   email:'carlos@agrismart.app', role:'Field Worker',       join_date:'2025-02-14', status:'active'   },
  { id:6, name:'Lisa Tan',        email:'lisa@agrismart.app',   role:'Supervisor',         join_date:'2024-12-01', status:'active'   },
];

// TODO: SUPABASE — replace with live attendance from DB per worker
// const { data } = await db.from('attendance').select('*')
//   .eq('worker_id', workerId).order('date', { ascending: false }).limit(30)
const sampleAttendance = [
  { date:'Mar 4, 2026',  day:'Wednesday', time_in:'7:02 AM', time_out:'--',      status:'present' },
  { date:'Mar 3, 2026',  day:'Tuesday',   time_in:'7:05 AM', time_out:'4:00 PM', status:'late'    },
  { date:'Mar 2, 2026',  day:'Monday',    time_in:'6:58 AM', time_out:'4:00 PM', status:'present' },
  { date:'Feb 28, 2026', day:'Saturday',  time_in:'--',      time_out:'--',      status:'absent'  },
  { date:'Feb 27, 2026', day:'Friday',    time_in:'7:01 AM', time_out:'4:00 PM', status:'present' },
  { date:'Feb 26, 2026', day:'Thursday',  time_in:'6:55 AM', time_out:'4:00 PM', status:'present' },
];

// TODO: SUPABASE — replace with:
// const { data } = await db.from('worker_role_history')
//   .select('*').order('changed_at', { ascending: false })
let roleHistory = [
  { id:1, worker_name:'Maria Clara',    old_role:'Field Worker', new_role:'Supervisor',         changed_by:'Admin', changed_at:'Mar 1, 2026',  notes:'Promoted after Q1 review'       },
  { id:2, worker_name:'Ana Reyes',      old_role:'Field Worker', new_role:'Equipment Operator', changed_by:'Admin', changed_at:'Feb 10, 2026', notes:'Certified for heavy machinery'  },
  { id:3, worker_name:'Juan Dela Cruz', old_role:'Supervisor',   new_role:'Field Worker',       changed_by:'Admin', changed_at:'Jan 20, 2026', notes:'Requested role change'          },
];

const ROLES      = ['Field Worker', 'Supervisor', 'Equipment Operator'];
let wSearch      = '';
let activeTab    = 'workers';
let attendModal  = null;
let editRoleModal = null;

const initials   = n => n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
const statusBadge = s =>
  s === 'present' ? `<span class="badge badge-green">Present</span>`
: s === 'late'    ? `<span class="badge badge-orange">Late</span>`
:                   `<span class="badge badge-red">Absent</span>`;

// ── MAIN RENDER ──────────────────────────────────────────────────
function render() {
  const vis    = workers.filter(w =>
    w.name.toLowerCase().includes(wSearch.toLowerCase()) ||
    w.role.toLowerCase().includes(wSearch.toLowerCase()) ||
    w.email.toLowerCase().includes(wSearch.toLowerCase())
  );
  const active   = workers.filter(w => w.status === 'active').length;
  const inactive = workers.filter(w => w.status === 'inactive').length;

  document.getElementById('pageContent').innerHTML = `

    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.25rem;">
      <div>
        <h1 class="page-title" style="margin-bottom:0;">Worker Management</h1>
        <p class="page-subtitle" style="margin-bottom:0;">Registered accounts, roles &amp; attendance</p>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row" style="margin-bottom:1.5rem;">
      <div class="stat-card"><div class="stat-num">${workers.length}</div><div class="stat-label">Total Workers</div></div>
      <div class="stat-card"><div class="stat-num" style="color:#22c55e;">${active}</div><div class="stat-label">Active</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--muted);">${inactive}</div><div class="stat-label">Inactive</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--blue);">${roleHistory.length}</div><div class="stat-label">Role Changes</div></div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;border-bottom:2px solid var(--border);margin-bottom:1.25rem;">
      ${[['workers','Workers'],['history','Role History']].map(([id,label]) => `
        <button onclick="WM.tab('${id}')"
          style="background:none;border:none;padding:.55rem 1.2rem;font-family:'Poppins',sans-serif;font-size:.83rem;font-weight:600;cursor:pointer;
                 border-bottom:2px solid ${activeTab===id?'var(--green-dark)':'transparent'};
                 margin-bottom:-2px;color:${activeTab===id?'var(--green-dark)':'var(--muted)'};transition:color .2s;">
          ${label}
        </button>`).join('')}
    </div>

    ${activeTab === 'workers' ? renderWorkersTab(vis) : renderHistoryTab()}

    ${attendModal   ? renderAttendModal()   : ''}
    ${editRoleModal ? renderEditRoleModal() : ''}

    <style>
      @keyframes modalIn { from{opacity:0;transform:translateY(16px) scale(.98);}to{opacity:1;transform:translateY(0) scale(1);} }
      .wm-icon { background:none;border:none;cursor:pointer;color:var(--muted);padding:5px;border-radius:6px;display:inline-flex;align-items:center;transition:color .2s,background .2s; }
      .wm-icon:hover { color:var(--green-dark);background:var(--green-light); }
      .wm-icon svg { width:15px;height:15px; }
    </style>
  `;

  const ab = document.getElementById('attendBackdrop');
  if (ab) ab.addEventListener('click', () => { attendModal = null; render(); });
  const eb = document.getElementById('editRoleBackdrop');
  if (eb) eb.addEventListener('click', () => { editRoleModal = null; render(); });
}

// ── WORKERS TAB ──────────────────────────────────────────────────
function renderWorkersTab(vis) {
  return `
    <div style="max-width:420px;margin-bottom:1.1rem;position:relative;">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"
        style="position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="text" placeholder="Search by name, role or email..." value="${wSearch}"
        oninput="WM.search(this.value)"
        style="width:100%;padding:.5rem .75rem .5rem 2.1rem;border:1.5px solid var(--border);border-radius:8px;
               font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;background:white;box-sizing:border-box;"/>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <table>
        <thead>
          <tr>
            <th style="padding-left:1.5rem;">Worker</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Status</th>
            <th style="text-align:right;padding-right:1.5rem;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${vis.length ? vis.map(w => `
            <tr>
              <td style="padding-left:1.5rem;">
                <div style="display:flex;align-items:center;gap:.75rem;">
                  <div style="width:34px;height:34px;background:var(--green-light);border:2px solid var(--sage);
                              border-radius:50%;display:flex;align-items:center;justify-content:center;
                              font-size:.7rem;font-weight:700;color:var(--green-dark);flex-shrink:0;">
                    ${initials(w.name)}
                  </div>
                  <div>
                    <div style="font-weight:600;font-size:.85rem;">${w.name}</div>
                    <div style="font-size:.72rem;color:var(--muted);">${w.email}</div>
                  </div>
                </div>
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:.4rem;">
                  <span style="font-size:.83rem;">${w.role}</span>
                  <button class="wm-icon" title="Edit Role" onclick="WM.openEditRole(${w.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </div>
              </td>
              <td style="color:var(--muted);font-size:.83rem;">${w.join_date}</td>
              <td>
                <label style="display:inline-flex;align-items:center;gap:.45rem;cursor:pointer;">
                  <span style="position:relative;display:inline-block;width:36px;height:20px;">
                    <input type="checkbox" ${w.status==='active'?'checked':''} onchange="WM.toggleStatus(${w.id},this.checked)"
                      style="opacity:0;width:0;height:0;position:absolute;"/>
                    <span style="position:absolute;inset:0;background:${w.status==='active'?'var(--green-dark)':'#d1d5db'};border-radius:999px;transition:background .2s;"></span>
                    <span style="position:absolute;top:2px;left:${w.status==='active'?'18':'2'}px;width:16px;height:16px;background:white;border-radius:50%;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2);"></span>
                  </span>
                  <span style="font-size:.78rem;font-weight:600;color:${w.status==='active'?'var(--green-dark)':'var(--muted)'};">
                    ${w.status==='active'?'Active':'Inactive'}
                  </span>
                </label>
              </td>
              <td style="text-align:right;padding-right:1.5rem;">
                <button class="btn btn-outline" onclick="WM.openAttend(${w.id})"
                  style="padding:.3rem .75rem;font-size:.72rem;gap:.3rem;display:inline-flex;align-items:center;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Attendance
                </button>
              </td>
            </tr>`).join('')
          : `<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--muted);font-size:.85rem;">No workers found.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

// ── HISTORY TAB ──────────────────────────────────────────────────
function renderHistoryTab() {
  return `
    <div class="card" style="padding:0;overflow:hidden;">
      <table>
        <thead>
          <tr>
            <th style="padding-left:1.5rem;">Worker</th>
            <th>Old Role</th>
            <th>New Role</th>
            <th>Changed By</th>
            <th>Date</th>
            <th style="padding-right:1.5rem;">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${roleHistory.length ? roleHistory.map(h => `
            <tr>
              <td style="padding-left:1.5rem;">
                <div style="display:flex;align-items:center;gap:.6rem;">
                  <div style="width:28px;height:28px;background:var(--green-light);border:2px solid var(--sage);
                              border-radius:50%;display:flex;align-items:center;justify-content:center;
                              font-size:.63rem;font-weight:700;color:var(--green-dark);flex-shrink:0;">
                    ${initials(h.worker_name)}
                  </div>
                  <span style="font-weight:600;font-size:.83rem;">${h.worker_name}</span>
                </div>
              </td>
              <td><span class="badge badge-gray" style="font-size:.7rem;">${h.old_role}</span></td>
              <td><span class="badge badge-green" style="font-size:.7rem;">${h.new_role}</span></td>
              <td style="font-size:.82rem;color:var(--muted);">${h.changed_by}</td>
              <td style="font-size:.82rem;color:var(--muted);">${h.changed_at}</td>
              <td style="font-size:.78rem;color:var(--muted);max-width:180px;padding-right:1.5rem;">${h.notes || '—'}</td>
            </tr>`).join('')
          : `<tr><td colspan="6" style="text-align:center;padding:2.5rem;color:var(--muted);font-size:.85rem;">No role changes recorded yet.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

// ── ATTENDANCE MODAL ─────────────────────────────────────────────
function renderAttendModal() {
  const w = attendModal;
  // TODO: SUPABASE — replace sampleAttendance with:
  // const { data } = await db.from('attendance').select('*')
  //   .eq('worker_id', w.id).order('date', { ascending: false }).limit(30)
  // rows = data || []
  const rows     = sampleAttendance;
  const presentN = rows.filter(r => r.status === 'present').length;
  const lateN    = rows.filter(r => r.status === 'late').length;
  const absentN  = rows.filter(r => r.status === 'absent').length;
  const rate     = rows.length ? Math.round(((presentN + lateN) / rows.length) * 100) : 0;

  return `
    <div id="attendBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.38);z-index:300;display:flex;align-items:center;justify-content:center;">
      <div style="background:white;border-radius:16px;padding:1.75rem 2rem;width:640px;max-height:82vh;overflow-y:auto;
                  box-shadow:0 20px 60px rgba(0,0,0,.18);animation:modalIn .22s ease;" onclick="event.stopPropagation()">

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
          <div style="display:flex;align-items:center;gap:.75rem;">
            <div style="width:38px;height:38px;background:var(--green-light);border:2px solid var(--sage);
                        border-radius:50%;display:flex;align-items:center;justify-content:center;
                        font-size:.72rem;font-weight:700;color:var(--green-dark);">
              ${initials(w.name)}
            </div>
            <div>
              <div style="font-size:1.05rem;font-weight:700;">${w.name}</div>
              <div style="font-size:.75rem;color:var(--muted);">${w.role} &nbsp;·&nbsp; Attendance Record</div>
            </div>
          </div>
          <button onclick="WM.closeAttend()" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;border-radius:6px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Summary cards -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1.25rem;">
          ${[
            { n: presentN,  label:'Present', color:'#22c55e',         bg:'#dcfce7'             },
            { n: lateN,     label:'Late',    color:'#f59e0b',         bg:'#fef3c7'             },
            { n: absentN,   label:'Absent',  color:'#ef4444',         bg:'#fee2e2'             },
            { n: rate+'%',  label:'Rate',    color:'var(--green-dark)',bg:'var(--green-light)'  },
          ].map(s => `
            <div style="text-align:center;padding:.75rem;border-radius:10px;background:${s.bg};">
              <div style="font-size:1.45rem;font-weight:700;color:${s.color};line-height:1;">${s.n}</div>
              <div style="font-size:.72rem;color:var(--muted);margin-top:.2rem;">${s.label}</div>
            </div>`).join('')}
        </div>

        <!-- Attendance table -->
        <table>
          <thead>
            <tr><th>Date</th><th>Day</th><th>Time In</th><th>Time Out</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td style="font-size:.82rem;">${r.date}</td>
                <td style="font-size:.82rem;color:var(--muted);">${r.day}</td>
                <td style="font-size:.82rem;">${r.time_in || '--'}</td>
                <td style="font-size:.82rem;">${r.time_out || '--'}</td>
                <td>${statusBadge(r.status)}</td>
              </tr>`).join('')}
          </tbody>
        </table>

        <p style="font-size:.72rem;color:var(--muted);margin-top:1rem;text-align:center;">
          Showing last ${rows.length} records
        </p>
      </div>
    </div>`;
}

// ── EDIT ROLE MODAL ──────────────────────────────────────────────
function renderEditRoleModal() {
  const w = editRoleModal;
  return `
    <div id="editRoleBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.38);z-index:300;display:flex;align-items:center;justify-content:center;">
      <div style="background:white;border-radius:16px;padding:1.75rem 2rem;width:420px;
                  box-shadow:0 20px 60px rgba(0,0,0,.18);animation:modalIn .22s ease;" onclick="event.stopPropagation()">

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
          <div>
            <div style="font-size:1.05rem;font-weight:700;">Edit Role</div>
            <div style="font-size:.78rem;color:var(--muted);">${w.name}</div>
          </div>
          <button onclick="WM.closeEditRole()" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;border-radius:6px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style="margin-bottom:1rem;">
          <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">Current Role</label>
          <div style="padding:.55rem .85rem;background:#f3f4f6;border-radius:8px;font-size:.83rem;color:var(--muted);">${w.role}</div>
        </div>

        <div style="margin-bottom:1rem;">
          <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">New Role <span style="color:var(--red);">*</span></label>
          <div style="position:relative;">
            <select id="er_role"
              style="width:100%;padding:.6rem .85rem;border:1.5px solid var(--border);border-radius:10px;
                     font-family:'Poppins',sans-serif;font-size:.82rem;background:#f9fafb;appearance:none;cursor:pointer;outline:none;">
              ${ROLES.map(r => `<option value="${r}" ${r===w.role?'selected':''}>${r}</option>`).join('')}
            </select>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              style="position:absolute;right:.75rem;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--muted);">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <div style="margin-bottom:1.4rem;">
          <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">Reason / Notes</label>
          <textarea id="er_notes" placeholder="e.g. Promoted after Q1 review" rows="2"
            style="width:100%;padding:.6rem .85rem;border:1.5px solid var(--border);border-radius:10px;
                   font-family:'Poppins',sans-serif;font-size:.82rem;background:#f9fafb;resize:vertical;outline:none;"></textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:.7rem;">
          <button onclick="WM.closeEditRole()"
            style="background:transparent;color:var(--muted);border:1.5px solid var(--border);padding:.5rem 1.2rem;
                   border-radius:8px;font-family:'Poppins',sans-serif;font-size:.8rem;font-weight:600;cursor:pointer;">
            Cancel
          </button>
          <button class="btn btn-primary" onclick="WM.saveRole()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Save Role
          </button>
        </div>
      </div>
    </div>`;
}

// ── PUBLIC API ───────────────────────────────────────────────────
window.WM = {

  tab(t)    { activeTab = t; render(); },
  search(v) { wSearch = v; render(); },

  openAttend(id) {
    // TODO: SUPABASE — fetch live attendance here before rendering:
    // const { data } = await db.from('attendance').select('*')
    //   .eq('worker_id', id).order('date', { ascending: false }).limit(30)
    // attendRows = data || []
    attendModal = workers.find(w => w.id === id) || null;
    render();
  },
  closeAttend() { attendModal = null; render(); },

  openEditRole(id) {
    editRoleModal = workers.find(w => w.id === id) || null;
    render();
  },
  closeEditRole() { editRoleModal = null; render(); },

  saveRole() {
    const newRole = document.getElementById('er_role')?.value;
    const notes   = document.getElementById('er_notes')?.value.trim() || '';
    if (!newRole || !editRoleModal) return;

    const w       = editRoleModal;
    const oldRole = w.role;
    if (newRole === oldRole) { WM.closeEditRole(); return; }

    const now       = new Date().toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
    const changedBy = (typeof Auth !== 'undefined' && Auth.getSession()?.name) || 'Admin';

    // TODO: SUPABASE — replace local mutations with:
    // await db.from('workers').update({ role: newRole }).eq('id', w.id)
    // await db.from('worker_role_history').insert({
    //   worker_id: w.id, worker_name: w.name,
    //   old_role: oldRole, new_role: newRole,
    //   changed_by: changedBy, notes
    // })
    w.role = newRole;
    roleHistory.unshift({
      id: Date.now(), worker_name: w.name, old_role: oldRole,
      new_role: newRole, changed_by: changedBy, changed_at: now, notes
    });

    editRoleModal = null;
    render();
  },

  toggleStatus(id, isActive) {
    const w = workers.find(w => w.id === id);
    if (!w) return;
    // TODO: SUPABASE — replace with:
    // await db.from('workers').update({ status: isActive ? 'active' : 'inactive' }).eq('id', id)
    w.status = isActive ? 'active' : 'inactive';
    render();
  },
};

render();