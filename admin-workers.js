renderShell('workers');

let workers = [
  {id:1, name:'Juan Dela Cruz',  email:'juan@agrismart.app',   role:'Field Worker',       joinDate:'2025-01-15', status:'active'  },
  {id:2, name:'Maria Clara',     email:'maria@agrismart.app',  role:'Supervisor',         joinDate:'2024-11-20', status:'active'  },
  {id:3, name:'Pedro Santos',    email:'pedro@agrismart.app',  role:'Field Worker',       joinDate:'2025-03-01', status:'active'  },
  {id:4, name:'Ana Reyes',       email:'ana@agrismart.app',    role:'Equipment Operator', joinDate:'2024-08-10', status:'inactive'},
  {id:5, name:'Carlos Garcia',   email:'carlos@agrismart.app', role:'Field Worker',       joinDate:'2025-02-14', status:'active'  },
  {id:6, name:'Lisa Tan',        email:'lisa@agrismart.app',   role:'Supervisor',         joinDate:'2024-12-01', status:'active'  },
];

let wSearch='', wModal=false, wAttend=null;
const initials = n => n.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();

const attendRecords = [
  {date:'Feb 20, 2026', day:'Thursday',  timeIn:'7:02 AM', timeOut:'--',      status:'present'},
  {date:'Feb 19, 2026', day:'Wednesday', timeIn:'7:05 AM', timeOut:'4:00 PM', status:'late'   },
  {date:'Feb 18, 2026', day:'Tuesday',   timeIn:'6:58 AM', timeOut:'4:00 PM', status:'present'},
  {date:'Feb 17, 2026', day:'Monday',    timeIn:'--',      timeOut:'--',      status:'absent' },
  {date:'Feb 14, 2026', day:'Friday',    timeIn:'7:01 AM', timeOut:'4:00 PM', status:'present'},
  {date:'Feb 13, 2026', day:'Thursday',  timeIn:'6:55 AM', timeOut:'4:00 PM', status:'present'},
];
const aBadge = s => s==='present'?`<span class="badge badge-green">Present</span>`:s==='late'?`<span class="badge badge-orange">Late</span>`:`<span class="badge badge-red">Absent</span>`;

function renderWorkers(){
  const vis = workers.filter(w =>
    w.name.toLowerCase().includes(wSearch.toLowerCase()) ||
    w.role.toLowerCase().includes(wSearch.toLowerCase())
  );

  document.getElementById('pageContent').innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.5rem;">
      <div>
        <h1 class="page-title" style="margin-bottom:0;">Worker Management</h1>
        <p class="page-subtitle" style="margin-bottom:0;">Manage farm workers and their attendance</p>
      </div>
      <button class="btn btn-primary" onclick="wOpenAdd()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Worker
      </button>
    </div>

    <div style="max-width:420px;margin-bottom:1.25rem;position:relative;">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);pointer-events:none;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" placeholder="Search workers..." value="${wSearch}" oninput="wSearch=this.value;renderWorkers()"
        style="width:100%;padding:0.55rem 0.75rem 0.55rem 2.2rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;box-sizing:border-box;"/>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <table>
        <thead>
          <tr>
            <th style="padding-left:1.5rem;">Worker</th>
            <th>Role</th>
            <th>Join Date</th>
            <th>Status</th>
            <th style="text-align:right;padding-right:1.5rem;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${vis.map(w=>`
            <tr>
              <td style="padding-left:1.5rem;">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                  <div style="width:34px;height:34px;background:var(--green-light);border:2px solid var(--sage);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:var(--green-dark);flex-shrink:0;">${initials(w.name)}</div>
                  <div>
                    <div style="font-weight:600;font-size:0.85rem;">${w.name}</div>
                    <div style="font-size:0.72rem;color:var(--muted);">${w.email}</div>
                  </div>
                </div>
              </td>
              <td style="color:var(--muted);font-size:0.85rem;">${w.role}</td>
              <td style="color:var(--muted);font-size:0.85rem;">${w.joinDate}</td>
              <td>
                ${w.status==='active'
                  ?`<span class="badge badge-green" style="gap:0.4rem;"><span style="width:6px;height:6px;background:#22c55e;border-radius:50%;display:inline-block;"></span>Active</span>`
                  :`<span class="badge badge-gray"  style="gap:0.4rem;"><span style="width:6px;height:6px;background:#9ca3af;border-radius:50%;display:inline-block;"></span>Inactive</span>`}
              </td>
              <td style="text-align:right;padding-right:1.5rem;">
                <button onclick="wOpenAttend(${w.id})" class="btn btn-outline" style="padding:0.3rem 0.75rem;font-size:0.72rem;gap:0.3rem;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Attendance
                </button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    ${wModal?`
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:999;display:flex;align-items:center;justify-content:center;" onclick="wCloseModal()">
      <div style="background:white;border-radius:16px;padding:1.75rem;width:440px;box-shadow:0 20px 60px rgba(0,0,0,0.15);" onclick="event.stopPropagation()">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
          <h2 style="font-size:1.05rem;font-weight:700;">Add New Worker</h2>
          <button onclick="wCloseModal()" style="background:none;border:none;cursor:pointer;color:var(--muted);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="display:flex;flex-direction:column;gap:1rem;">
          <div><label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">Full Name</label>
            <input id="wm_name" type="text" placeholder="e.g. Juan Dela Cruz"
              style="width:100%;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;box-sizing:border-box;"/></div>
          <div><label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">Email</label>
            <input id="wm_email" type="email" placeholder="e.g. juan@agrismart.app"
              style="width:100%;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;box-sizing:border-box;"/></div>
          <div><label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">Role</label>
            <select id="wm_role" style="width:100%;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;">
              <option>Field Worker</option><option>Supervisor</option><option>Equipment Operator</option>
            </select></div>
          <div style="display:flex;gap:0.75rem;margin-top:0.25rem;">
            <button onclick="wCloseModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Cancel</button>
            <button onclick="wSave()" class="btn btn-primary" style="flex:1;justify-content:center;">Add Worker</button>
          </div>
        </div>
      </div>
    </div>` : ''}

    ${wAttend?`
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:999;display:flex;align-items:center;justify-content:center;" onclick="wCloseAttend()">
      <div style="background:white;border-radius:16px;padding:1.75rem;width:600px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.15);" onclick="event.stopPropagation()">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
          <div>
            <h2 style="font-size:1.05rem;font-weight:700;">${wAttend.name} – Attendance</h2>
            <div style="font-size:0.75rem;color:var(--muted);">February 2026</div>
          </div>
          <button onclick="wCloseAttend()" style="background:none;border:none;cursor:pointer;color:var(--muted);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;margin-bottom:1.25rem;">
          ${[
            {n:attendRecords.filter(r=>r.status==='present').length, label:'Present', color:'#22c55e'},
            {n:attendRecords.filter(r=>r.status==='late').length,    label:'Late',    color:'#f59e0b'},
            {n:attendRecords.filter(r=>r.status==='absent').length,  label:'Absent',  color:'#ef4444'},
          ].map(s=>`<div style="text-align:center;padding:0.75rem;border-radius:10px;background:#fafafa;border:1px solid var(--border);">
            <div style="font-size:1.5rem;font-weight:700;color:${s.color};line-height:1;">${s.n}</div>
            <div style="font-size:0.72rem;color:var(--muted);">${s.label}</div>
          </div>`).join('')}
        </div>
        <table>
          <thead><tr><th>Date</th><th>Day</th><th>Time In</th><th>Time Out</th><th>Status</th></tr></thead>
          <tbody>${attendRecords.map(r=>`<tr><td>${r.date}</td><td>${r.day}</td><td>${r.timeIn}</td><td>${r.timeOut}</td><td>${aBadge(r.status)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>` : ''}
  `;
}

window.wOpenAdd     = () => { wModal=true; renderWorkers(); };
window.wCloseModal  = () => { wModal=false; renderWorkers(); };
window.wOpenAttend  = id => { wAttend=workers.find(w=>w.id===id); renderWorkers(); };
window.wCloseAttend = () => { wAttend=null; renderWorkers(); };
window.wSave        = () => {
  const name  = document.getElementById('wm_name').value.trim();
  const email = document.getElementById('wm_email').value.trim();
  const role  = document.getElementById('wm_role').value;
  if(!name) return;
  workers.push({id:Date.now(), name, email, role, joinDate:new Date().toISOString().slice(0,10), status:'active'});
  wModal=false; renderWorkers();
};

renderWorkers();