// ============================================================
// SUPABASE SETUP INSTRUCTIONS FOR GITHUB COPILOT
// ============================================================
// 1. Add to admin-task-management.html <head>:
//    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//
// 2. Initialize Supabase (create supabase.js and load before this file):
//    const supabase = window.supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_ANON_KEY')
//
// 3. Required Supabase table:
//
//    TABLE: tasks
//    - id          (int8, primary key, auto increment)
//    - title       (text, not null)
//    - desc        (text)
//    - priority    (text) — 'High' | 'Medium' | 'Low'
//    - worker      (text) — must match the worker's name in the workers table exactly
//    - due         (text)
//    - completed   (bool, default false)
//    - created_by  (text) — name of admin who created the task
//    - created_at  (timestamptz, default now())
//    - updated_at  (timestamptz, default now())
//
// 4. Row Level Security (RLS) policies for the tasks table:
//    - Admin/Supervisor:
//        SELECT all rows
//        INSERT all rows
//        UPDATE all rows
//        DELETE all rows
//    - Worker:
//        SELECT only WHERE worker = their own name
//        UPDATE only WHERE worker = their own name
//          (restrict updatable columns to: completed, updated_at only)
//        No INSERT or DELETE
//
// 5. HOW TO CONNECT — replace each TODO block below:
//
//    LOAD ALL TASKS (admin sees all):
//    const { data, error } = await supabase
//      .from('tasks')
//      .select('*')
//      .order('created_at', { ascending: false })
//    if (error) console.error(error)
//    tasks = data || []
//
//    CREATE TASK:
//    const { data, error } = await supabase.from('tasks').insert({
//      title, desc, priority, worker, due,
//      completed: false,
//      created_by: Auth.getSession()?.name || 'Admin'
//    }).select().single()
//    if (error) { console.error(error); return; }
//    tasks.push(data)
//
//    EDIT TASK:
//    const { error } = await supabase.from('tasks')
//      .update({ title, desc, priority, worker, due, updated_at: new Date().toISOString() })
//      .eq('id', editingId)
//    if (error) { console.error(error); return; }
//
//    MARK COMPLETE:
//    const { error } = await supabase.from('tasks')
//      .update({ completed: true, updated_at: new Date().toISOString() })
//      .eq('id', id)
//
//    REOPEN TASK:
//    const { error } = await supabase.from('tasks')
//      .update({ completed: false, updated_at: new Date().toISOString() })
//      .eq('id', id)
//
//    DELETE TASK:
//    const { error } = await supabase.from('tasks').delete().eq('id', id)
//    if (error) { console.error(error); return; }
//
// 6. Make render() async and reload tasks from DB each time:
//    async function render() {
//      const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
//      tasks = data || []
//      ... rest of render
//    }
//
// 7. Load workers list from Supabase instead of hardcoded array:
//    const { data: workerData } = await supabase.from('workers').select('name').order('name')
//    const WORKERS = workerData?.map(w => w.name) || []
//
// 8. Real-time updates — admin sees worker completions instantly:
//    supabase.channel('admin-tasks-live')
//      .on('postgres_changes', {
//        event: '*',
//        schema: 'public',
//        table: 'tasks'
//      }, () => render())
//      .subscribe()
//
// KEY POINT FOR COPILOT:
// Admin creates tasks with a 'worker' field (worker's name).
// Worker page (worker-tasks.js) queries WHERE worker = currentWorkerName.
// This is how tasks flow from admin → worker automatically.
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

  renderShell('tasks');

  // TODO: SUPABASE — replace this local array with:
  // let tasks = []
  // then inside an async init function:
  // const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
  // tasks = data || []
  let tasks = [
    { id:1, priority:'High',   completed:false, title:'Irrigate Rice Paddies – Section A', desc:'Complete irrigation cycle for rice paddies in Section A. Ensure water level reaches 5cm depth.',   due:'2026-03-06', worker:'Juan Dela Cruz', created_by:'Admin' },
    { id:2, priority:'Medium', completed:true,  title:'Apply Fertilizer to Corn Fields',   desc:'Apply NPK fertilizer (14-14-14) at recommended rate of 2 bags per hectare.',                       due:'2026-03-05', worker:'Maria Clara',   created_by:'Admin' },
    { id:3, priority:'Low',    completed:false, title:'Check Pest Traps',                  desc:'Inspect and replace pest traps in the vegetable garden area. Record pest count.',                   due:'2026-03-07', worker:'Pedro Santos',  created_by:'Admin' },
    { id:4, priority:'High',   completed:false, title:'Harvest Ripe Tomatoes',             desc:'Harvest tomatoes that have reached maturity in greenhouse section B.',                               due:'2026-03-08', worker:'Carlos Garcia', created_by:'Admin' },
  ];

  let nextId     = 5;
  let editingId  = null;
  let searchQ    = '';
  let filterVal  = 'all';
  let _modalOpen = false;

  // TODO: SUPABASE — replace hardcoded WORKERS with:
  // const { data: workerData } = await supabase.from('workers').select('name').order('name')
  // const WORKERS = workerData?.map(w => w.name) || []
  const WORKERS = ['Juan Dela Cruz','Maria Clara','Pedro Santos','Carlos Garcia','Ana Reyes','Lisa Tan'];

  const PM = {
    High:   { badge:'badge-red',    dot:'#ef4444' },
    Medium: { badge:'badge-orange', dot:'#f59e0b' },
    Low:    { badge:'badge-gray',   dot:'#6b7280' },
  };

  function statusIcon(t) {
    if (t.completed)
      return `<svg width="18" height="18" fill="none" stroke="#22c55e" stroke-width="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    const c = PM[t.priority]?.dot || '#6b7280';
    return `<svg width="18" height="18" fill="none" stroke="${c}" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  }

  function getFiltered() {
    const q = searchQ.toLowerCase();
    return tasks.filter(t => {
      const mq = !q || t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.worker.toLowerCase().includes(q);
      let mf = true;
      if (filterVal === 'pending')   mf = !t.completed;
      if (filterVal === 'completed') mf =  t.completed;
      if (filterVal === 'high')      mf = t.priority === 'High';
      if (filterVal === 'medium')    mf = t.priority === 'Medium';
      if (filterVal === 'low')       mf = t.priority === 'Low';
      return mq && mf;
    });
  }

  function render() {
    // TODO: SUPABASE — make render() async, reload tasks at the top:
    // const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    // tasks = data || []

    const total     = tasks.length;
    const pending   = tasks.filter(t => !t.completed).length;
    const completed = tasks.filter(t =>  t.completed).length;
    const high      = tasks.filter(t => t.priority === 'High' && !t.completed).length;
    const filtered  = getFiltered();

    const taskCards = filtered.length ? filtered.map(t => `
      <div class="card" style="opacity:${t.completed?'.75':'1'};">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.5rem;margin-bottom:.45rem;">
          <div style="display:flex;align-items:center;gap:.5rem;flex:1;min-width:0;">
            ${statusIcon(t)}
            <span style="font-size:.88rem;font-weight:600;${t.completed?'text-decoration:line-through;color:var(--muted);':''}overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.title}</span>
          </div>
          <span class="badge ${PM[t.priority]?.badge||'badge-gray'}" style="flex-shrink:0;">${t.priority}</span>
        </div>
        <p style="font-size:.78rem;color:var(--muted);margin:0 0 .7rem 1.75rem;line-height:1.5;">${t.desc}</p>
        <div style="display:flex;align-items:center;gap:1.2rem;margin:0 0 .8rem 1.75rem;">
          <div style="display:flex;align-items:center;gap:.3rem;font-size:.73rem;color:var(--muted);">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/></svg>
            ${t.worker}
          </div>
          <div style="display:flex;align-items:center;gap:.3rem;font-size:.73rem;color:var(--muted);">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Due: ${t.due}
          </div>
          <div style="display:flex;align-items:center;gap:.3rem;font-size:.73rem;color:var(--muted);">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            By: ${t.created_by || 'Admin'}
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          ${t.completed
            ? `<button class="btn btn-ghost" style="font-size:.75rem;padding:.32rem .9rem;" onclick="AT.reopen(${t.id})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>Reopen</button>`
            : `<button class="btn btn-primary" style="font-size:.75rem;padding:.32rem .9rem;" onclick="AT.complete(${t.id})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Mark Complete</button>`
          }
          <div style="display:flex;gap:.35rem;">
            <button class="icon-btn" onclick="AT.openEdit(${t.id})" title="Edit">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="icon-btn del" onclick="AT.del(${t.id})" title="Delete">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>
      </div>`).join('')
    : `<div style="grid-column:1/-1;text-align:center;padding:3rem 1rem;color:var(--muted);font-size:.85rem;">
        <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin:0 auto .75rem;display:block;opacity:.3;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        No tasks found.</div>`;

    document.getElementById('pageContent').innerHTML = `

      <!-- Page Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.25rem;">
        <div>
          <h1 class="page-title" style="margin-bottom:.2rem;">Task Management</h1>
          <p class="page-subtitle">Create and assign tasks to workers</p>
        </div>
        <button class="btn btn-primary" onclick="AT.openCreate()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Task
        </button>
      </div>

      <!-- Stats -->
      <div class="stats-row" style="margin-bottom:1.5rem;">
        <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">Total Tasks</div></div>
        <div class="stat-card"><div class="stat-num orange">${pending}</div><div class="stat-label">Pending</div></div>
        <div class="stat-card"><div class="stat-num blue">${completed}</div><div class="stat-label">Completed</div></div>
        <div class="stat-card"><div class="stat-num" style="color:var(--red);">${high}</div><div class="stat-label">High Priority</div></div>
      </div>

      <!-- Toolbar -->
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;">
        <div style="flex:1;position:relative;">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="position:absolute;left:.7rem;top:50%;transform:translateY(-50%);width:15px;height:15px;color:var(--muted);pointer-events:none;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="taskSearch" type="text" value="${searchQ}" placeholder="Search tasks..."
            style="width:100%;padding:.55rem .75rem .55rem 2.1rem;border:1.5px solid var(--border);border-radius:10px;font-family:'Poppins',sans-serif;font-size:.82rem;background:var(--white);outline:none;"
            oninput="AT.search(this.value)"/>
        </div>
        <div style="position:relative;">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="position:absolute;left:.65rem;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--muted);pointer-events:none;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <select onchange="AT.filter(this.value)"
            style="padding:.55rem 2rem .55rem 2rem;border:1.5px solid var(--border);border-radius:10px;font-family:'Poppins',sans-serif;font-size:.82rem;background:var(--white);appearance:none;cursor:pointer;outline:none;">
            <option value="all"       ${filterVal==='all'       ?'selected':''}>All Tasks</option>
            <option value="pending"   ${filterVal==='pending'   ?'selected':''}>Pending</option>
            <option value="completed" ${filterVal==='completed' ?'selected':''}>Completed</option>
            <option value="high"      ${filterVal==='high'      ?'selected':''}>High Priority</option>
            <option value="medium"    ${filterVal==='medium'    ?'selected':''}>Medium Priority</option>
            <option value="low"       ${filterVal==='low'       ?'selected':''}>Low Priority</option>
          </select>
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="position:absolute;right:.65rem;top:50%;transform:translateY(-50%);width:13px;height:13px;color:var(--muted);pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>

      <!-- Task Grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        ${taskCards}
      </div>

      <!-- Modal -->
      <div id="taskModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:200;align-items:center;justify-content:center;">
        <div style="background:var(--white);border-radius:16px;padding:1.75rem 2rem;width:100%;max-width:480px;box-shadow:0 8px 40px rgba(0,0,0,.18);animation:modalIn .22s ease;">

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.4rem;">
            <span id="modalHeading" style="font-size:1.05rem;font-weight:700;color:var(--text);">Create New Task</span>
            <button onclick="AT.closeModal()" style="background:none;border:none;cursor:pointer;color:var(--muted);display:flex;padding:4px;border-radius:6px;">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block;font-size:.8rem;font-weight:600;color:var(--text);margin-bottom:.4rem;">Task Title <span style="color:var(--red);">*</span></label>
            <input id="mTitle" type="text" placeholder="Enter task title"
              style="width:100%;padding:.6rem .85rem;border:1.5px solid var(--border);border-radius:10px;font-family:'Poppins',sans-serif;font-size:.82rem;background:#f9fafb;outline:none;"/>
            <div id="mTitleErr" style="color:var(--red);font-size:.72rem;margin-top:3px;display:none;">Task title is required.</div>
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block;font-size:.8rem;font-weight:600;color:var(--text);margin-bottom:.4rem;">Description</label>
            <textarea id="mDesc" placeholder="Enter task description" rows="3"
              style="width:100%;padding:.6rem .85rem;border:1.5px solid var(--border);border-radius:10px;font-family:'Poppins',sans-serif;font-size:.82rem;background:#f9fafb;outline:none;resize:vertical;"></textarea>
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block;font-size:.8rem;font-weight:600;color:var(--text);margin-bottom:.4rem;">Priority</label>
            <div style="position:relative;">
              <select id="mPriority" style="width:100%;padding:.6rem .85rem;border:1.5px solid var(--border);border-radius:10px;font-family:'Poppins',sans-serif;font-size:.82rem;background:#f9fafb;appearance:none;cursor:pointer;outline:none;">
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Low">Low</option>
              </select>
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="position:absolute;right:.75rem;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--muted);"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block;font-size:.8rem;font-weight:600;color:var(--text);margin-bottom:.4rem;">Assign To <span style="color:var(--red);">*</span></label>
            <div style="position:relative;">
              <select id="mWorker" style="width:100%;padding:.6rem .85rem;border:1.5px solid var(--border);border-radius:10px;font-family:'Poppins',sans-serif;font-size:.82rem;background:#f9fafb;appearance:none;cursor:pointer;outline:none;">
                <option value="">Select worker</option>
                ${WORKERS.map(w=>`<option value="${w}">${w}</option>`).join('')}
              </select>
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="position:absolute;right:.75rem;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--muted);"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div id="mWorkerErr" style="color:var(--red);font-size:.72rem;margin-top:3px;display:none;">Please assign a worker.</div>
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block;font-size:.8rem;font-weight:600;color:var(--text);margin-bottom:.4rem;">Due Date <span style="color:var(--red);">*</span></label>
            <input id="mDue" type="date"
              style="width:100%;padding:.6rem .85rem;border:1.5px solid var(--border);border-radius:10px;font-family:'Poppins',sans-serif;font-size:.82rem;background:#f9fafb;outline:none;"/>
            <div id="mDueErr" style="color:var(--red);font-size:.72rem;margin-top:3px;display:none;">Due date is required.</div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:.7rem;margin-top:1.5rem;">
            <button onclick="AT.closeModal()"
              style="background:transparent;color:var(--muted);border:1.5px solid var(--border);padding:.5rem 1.2rem;border-radius:8px;font-family:'Poppins',sans-serif;font-size:.8rem;font-weight:600;cursor:pointer;">
              Cancel
            </button>
            <button id="mSubmitBtn" class="btn btn-primary" onclick="AT.submit()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create Task
            </button>
          </div>

        </div>
      </div>

      <style>
        @keyframes modalIn { from{opacity:0;transform:translateY(20px) scale(.97);}to{opacity:1;transform:translateY(0) scale(1);} }
        .icon-btn { background:none;border:none;cursor:pointer;color:var(--muted);padding:5px;border-radius:6px;display:inline-flex;align-items:center;transition:color .2s,background .2s; }
        .icon-btn svg { width:15px;height:15px; }
        .icon-btn:hover { color:var(--green-dark);background:var(--green-light); }
        .icon-btn.del:hover { color:var(--red);background:#fee2e2; }
      </style>
    `;

    const modal = document.getElementById('taskModal');
    if (modal) {
      modal.addEventListener('click', e => { if (e.target === modal) AT.closeModal(); });
      if (_modalOpen) modal.style.display = 'flex';
    }
  }

  function openModal() {
    _modalOpen = true;
    const m = document.getElementById('taskModal');
    if (m) m.style.display = 'flex';
  }

  function resetForm() {
    ['mTitle','mDesc'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const p = document.getElementById('mPriority'); if (p) p.value = 'Medium';
    const w = document.getElementById('mWorker');   if (w) w.value = '';
    const d = document.getElementById('mDue');      if (d) d.value = '';
    ['mTitleErr','mWorkerErr','mDueErr'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  }

  window.AT = {

    search(val) { searchQ = val; render(); },
    filter(val) { filterVal = val; render(); },

    openCreate() {
      editingId = null;
      render();
      resetForm();
      const h = document.getElementById('modalHeading'); if (h) h.textContent = 'Create New Task';
      const b = document.getElementById('mSubmitBtn');
      if (b) b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Create Task`;
      openModal();
    },

    openEdit(id) {
      const t = tasks.find(t => t.id === id);
      if (!t) return;
      editingId = id;
      render();
      const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val; };
      set('mTitle', t.title); set('mDesc', t.desc); set('mPriority', t.priority); set('mWorker', t.worker); set('mDue', t.due);
      const h = document.getElementById('modalHeading'); if (h) h.textContent = 'Edit Task';
      const b = document.getElementById('mSubmitBtn');
      if (b) b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Save Changes`;
      openModal();
    },

    closeModal() {
      _modalOpen = false;
      editingId = null;
      const m = document.getElementById('taskModal');
      if (m) m.style.display = 'none';
    },

    submit() {
      const val    = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
      const title  = val('mTitle');
      const desc   = document.getElementById('mDesc')?.value.trim()     || '';
      const prio   = document.getElementById('mPriority')?.value        || 'Medium';
      const worker = document.getElementById('mWorker')?.value          || '';
      const due    = document.getElementById('mDue')?.value             || '';

      const show = (id, v) => { const el = document.getElementById(id); if (el) el.style.display = v ? 'block' : 'none'; };
      show('mTitleErr',  !title);
      show('mWorkerErr', !worker);
      show('mDueErr',    !due);
      if (!title || !worker || !due) return;

      if (editingId) {
        // TODO: SUPABASE — replace with:
        // const { error } = await supabase.from('tasks').update({ title, desc, priority: prio, worker, due, updated_at: new Date().toISOString() }).eq('id', editingId)
        // if (error) { console.error(error); return; }
        const t = tasks.find(t => t.id === editingId);
        if (t) Object.assign(t, { title, desc, priority: prio, worker, due });
      } else {
        // TODO: SUPABASE — replace with:
        // const { data, error } = await supabase.from('tasks').insert({
        //   title, desc, priority: prio, worker, due,
        //   completed: false,
        //   created_by: Auth.getSession()?.name || 'Admin'
        // }).select().single()
        // if (error) { console.error(error); return; }
        // tasks.push(data)
        tasks.push({ id: nextId++, title, desc, priority: prio, worker, due, completed: false, created_by: Auth.getSession()?.name || 'Admin' });
      }

      AT.closeModal();
      render();
    },

    complete(id) {
      // TODO: SUPABASE — replace with:
      // const { error } = await supabase.from('tasks').update({ completed: true, updated_at: new Date().toISOString() }).eq('id', id)
      // if (error) { console.error(error); return; }
      const t = tasks.find(t => t.id === id);
      if (t) { t.completed = true; render(); }
    },

    reopen(id) {
      // TODO: SUPABASE — replace with:
      // const { error } = await supabase.from('tasks').update({ completed: false, updated_at: new Date().toISOString() }).eq('id', id)
      // if (error) { console.error(error); return; }
      const t = tasks.find(t => t.id === id);
      if (t) { t.completed = false; render(); }
    },

    del(id) {
      if (!confirm('Delete this task?')) return;
      // TODO: SUPABASE — replace with:
      // const { error } = await supabase.from('tasks').delete().eq('id', id)
      // if (error) { console.error(error); return; }
      tasks = tasks.filter(t => t.id !== id);
      render();
    },
  };

  // TODO: SUPABASE — subscribe to real-time task changes so admin sees
  // worker completions live without refreshing:
  // supabase.channel('admin-tasks-live')
  //   .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => render())
  //   .subscribe()

  render();

}); // end DOMContentLoaded