// ============================================================
// SUPABASE SETUP INSTRUCTIONS FOR GITHUB COPILOT
// ============================================================
// 1. Add to worker-tasks.html <head>:
//    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//
// 2. Initialize Supabase (create supabase.js and load it before this file):
//    const supabase = window.supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_ANON_KEY')
//
// 3. Required Supabase table:
//
//    TABLE: tasks
//    - id          (int8, primary key, auto increment)
//    - title       (text, not null)
//    - desc        (text)
//    - priority    (text) — 'High' | 'Medium' | 'Low'
//    - worker      (text) — must match the logged-in worker's name exactly
//    - due         (text)
//    - completed   (bool, default false)
//    - created_by  (text) — admin name who created the task
//    - created_at  (timestamptz, default now())
//    - updated_at  (timestamptz, default now())
//
// 4. Row Level Security (RLS) policies for the tasks table:
//    - Admin/Supervisor:
//        SELECT all rows
//        INSERT, UPDATE, DELETE all rows
//    - Worker:
//        SELECT only WHERE worker = (select name from workers where user_id = auth.uid())
//        UPDATE only WHERE worker = (select name from workers where user_id = auth.uid())
//          (workers can only mark complete — limit updateable columns to: completed, updated_at)
//
// 5. HOW TO CONNECT — replace each TODO block below:
//
//    LOAD TASKS for worker (replace local array):
//    const currentWorker = Auth.getSession()?.name || ''
//    const { data, error } = await supabase
//      .from('tasks')
//      .select('*')
//      .eq('worker', currentWorker)
//      .order('created_at', { ascending: false })
//    if (error) console.error(error)
//    tasks = data || []
//
//    MARK COMPLETE:
//    const { error } = await supabase
//      .from('tasks')
//      .update({ completed: true, updated_at: new Date().toISOString() })
//      .eq('id', id)
//    if (error) { console.error(error); return; }
//
// 6. Make renderTasks() async and reload tasks from DB each time:
//    async function renderTasks() {
//      const currentWorker = Auth.getSession()?.name || ''
//      const { data } = await supabase.from('tasks').select('*').eq('worker', currentWorker).order('created_at', { ascending: false })
//      tasks = data || []
//      ... rest of render
//    }
//
// 7. Real-time updates — worker sees new tasks from admin instantly:
//    const currentWorker = Auth.getSession()?.name || ''
//    supabase.channel('worker-tasks')
//      .on('postgres_changes', {
//        event: '*',
//        schema: 'public',
//        table: 'tasks',
//        filter: `worker=eq.${currentWorker}`
//      }, () => renderTasks())
//      .subscribe()
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

  renderShell('tasks');

  // TODO: SUPABASE — replace this local array with a live fetch:
  // const currentWorker = Auth.getSession()?.name || ''
  // const { data } = await supabase.from('tasks').select('*').eq('worker', currentWorker).order('created_at', { ascending: false })
  // let tasks = data || []
  let tasks = [
    { id:1, priority:'High',   completed:false, title:'Irrigate Rice Paddies – Section A',  desc:'Complete irrigation cycle for rice paddies in Section A. Ensure water level reaches 5cm depth.',   due:'Feb 20, 2026', by:'Maria Santos'  },
    { id:2, priority:'Medium', completed:true,  title:'Apply Fertilizer to Corn Fields',    desc:'Apply NPK fertilizer (14-14-14) at recommended rate of 2 bags per hectare.',                        due:'Feb 20, 2026', by:'Maria Santos'  },
    { id:3, priority:'Low',    completed:false, title:'Check Pest Traps',                   desc:'Inspect and replace pest traps in the vegetable garden area. Record pest count.',                    due:'Feb 20, 2026', by:'Admin'         },
    { id:4, priority:'High',   completed:false, title:'Harvest Ripe Tomatoes',              desc:'Harvest tomatoes that have reached maturity in greenhouse section B.',                                due:'Feb 21, 2026', by:'Maria Santos'  },
    { id:5, priority:'Medium', completed:true,  title:'Equipment Maintenance Check',        desc:'Perform routine maintenance check on tractor and irrigation pumps.',                                  due:'Feb 19, 2026', by:'Admin'         },
    { id:6, priority:'Medium', completed:false, title:'Soil Sample Collection',             desc:'Collect soil samples from Sections A, B, and C for laboratory analysis.',                            due:'Feb 22, 2026', by:'Maria Santos'  },
  ];

  let filter = 'All Tasks';

  const priorityStyle = {
    High:   { badge:'badge-red',    dot:'#ef4444' },
    Medium: { badge:'badge-orange', dot:'#f59e0b' },
    Low:    { badge:'badge-gray',   dot:'#6b7280' },
  };

  function iconFor(t) {
    if (t.completed)
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    const c = priorityStyle[t.priority].dot;
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  }

  function renderTasks() {
    // TODO: SUPABASE — make this async and reload tasks at the top:
    // const currentWorker = Auth.getSession()?.name || ''
    // const { data } = await supabase.from('tasks').select('*').eq('worker', currentWorker).order('created_at', { ascending: false })
    // tasks = data || []

    let visible = tasks;
    if (filter === 'Pending')   visible = tasks.filter(t => !t.completed);
    if (filter === 'Completed') visible = tasks.filter(t =>  t.completed);

    const total     = tasks.length;
    const pending   = tasks.filter(t => !t.completed).length;
    const completed = tasks.filter(t =>  t.completed).length;

    document.getElementById('pageContent').innerHTML = `

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.2rem;">
        <h1 class="page-title" style="margin-bottom:0;">My Tasks</h1>
        <div style="position:relative;">
          <select id="filterSelect" onchange="WT.setFilter(this.value)"
            style="padding:.45rem 2rem .45rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.78rem;background:white;cursor:pointer;appearance:none;outline:none;">
            <option>All Tasks</option>
            <option>Pending</option>
            <option>Completed</option>
          </select>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--muted);"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      <p class="page-subtitle" style="margin-bottom:1.25rem;">${pending} task${pending!==1?'s':''} pending</p>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem;">
        <div class="card" style="display:flex;align-items:center;gap:.75rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <div><div style="font-size:1.4rem;font-weight:700;line-height:1;">${total}</div><div style="font-size:.72rem;color:var(--muted);">Total Tasks</div></div>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:.75rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <div><div style="font-size:1.4rem;font-weight:700;color:#f59e0b;line-height:1;">${pending}</div><div style="font-size:.72rem;color:var(--muted);">Pending</div></div>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:.75rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <div><div style="font-size:1.4rem;font-weight:700;color:#22c55e;line-height:1;">${completed}</div><div style="font-size:.72rem;color:var(--muted);">Completed</div></div>
        </div>
      </div>

      <!-- Task Grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        ${visible.length ? visible.map(t => `
          <div class="card" style="opacity:${t.completed?'0.75':'1'};">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:.5rem;">
              <div style="display:flex;align-items:center;gap:.5rem;flex:1;min-width:0;">
                ${iconFor(t)}
                <span style="font-size:.88rem;font-weight:600;${t.completed?'text-decoration:line-through;color:var(--muted);':''}overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.title}</span>
              </div>
              <span class="badge ${priorityStyle[t.priority].badge}" style="flex-shrink:0;margin-left:.5rem;">${t.priority}</span>
            </div>
            <p style="font-size:.78rem;color:var(--muted);margin-bottom:.75rem;margin-left:1.7rem;line-height:1.5;">${t.desc}</p>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-left:1.7rem;">
              <div style="font-size:.72rem;color:var(--muted);">
                Due: <strong style="color:var(--text);">${t.due}</strong>
                &nbsp;·&nbsp;
                By: <strong style="color:var(--text);">${t.by || t.created_by || 'Admin'}</strong>
              </div>
              ${t.completed
                ? `<span style="font-size:.78rem;color:#22c55e;font-weight:600;display:flex;align-items:center;gap:.3rem;">
                    <svg width="14" height="14" fill="none" stroke="#22c55e" stroke-width="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Completed
                  </span>`
                : `<button class="btn btn-primary" style="font-size:.75rem;padding:.32rem .85rem;" onclick="WT.complete(${t.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Complete
                  </button>`}
            </div>
          </div>`).join('')
        : `<div style="grid-column:1/-1;text-align:center;padding:3rem 1rem;color:var(--muted);font-size:.85rem;">
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin:0 auto .75rem;display:block;opacity:.3;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            No tasks found.</div>`}
      </div>
    `;
    document.getElementById('filterSelect').value = filter;
  }

  window.WT = {
    setFilter(val) { filter = val; renderTasks(); },

    complete(id) {
      // TODO: SUPABASE — replace with:
      // const { error } = await supabase.from('tasks').update({ completed: true, updated_at: new Date().toISOString() }).eq('id', id)
      // if (error) { console.error(error); return; }
      // await renderTasks()
      const t = tasks.find(t => t.id === id);
      if (t) { t.completed = true; renderTasks(); }
    },
  };

  // TODO: SUPABASE — subscribe to real-time task updates for this worker:
  // const currentWorker = Auth.getSession()?.name || ''
  // supabase.channel('worker-tasks-live')
  //   .on('postgres_changes', {
  //     event: '*',
  //     schema: 'public',
  //     table: 'tasks',
  //     filter: `worker=eq.${currentWorker}`
  //   }, () => renderTasks())
  //   .subscribe()

  renderTasks();

}); // end DOMContentLoaded