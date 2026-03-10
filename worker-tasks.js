document.addEventListener('DOMContentLoaded', async function () {

  renderShell('tasks');

  const session = Auth.getSession();
  let tasks  = [];
  let filter = 'All Tasks';

  const priorityStyle = {
    High:   { badge:'badge-red',    dot:'#ef4444' },
    Medium: { badge:'badge-orange', dot:'#f59e0b' },
    Low:    { badge:'badge-gray',   dot:'#6b7280' },
  };

  function iconFor(t) {
    if (t.completed)
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    const c = priorityStyle[t.priority]?.dot || '#9ca3af';
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  }

  // ── Load tasks from Supabase ───────────────────────────────
  async function loadTasks() {
    const { data, error } = await window.db
      .from('tasks')
      .select('*')
      .eq('worker_id', session.worker_id)
      .order('created_at', { ascending: false });
    if (error) { console.error('[Tasks] load:', error.message); return; }
    tasks = (data || []).map(t => ({
      ...t,
      due: t.due_date ? new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-US', { month:'short', day:'2-digit', year:'numeric' }) : '—',
      by:  t.created_by || 'Admin',
      desc: t.description || '',
    }));
  }

  // ── Render ─────────────────────────────────────────────────
  function renderTasks() {
    let visible = tasks;
    if (filter === 'Pending')   visible = tasks.filter(t => !t.completed);
    if (filter === 'Completed') visible = tasks.filter(t =>  t.completed);

    const total     = tasks.length;
    const pending   = tasks.filter(t => !t.completed).length;
    const completed = tasks.filter(t =>  t.completed).length;

    document.getElementById('pageContent').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.2rem;">
        <h1 class="page-title" style="margin-bottom:0;">My Tasks</h1>
        <div style="position:relative;">
          <select id="filterSelect" onchange="WT.setFilter(this.value)"
            style="padding:.45rem 2rem .45rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.78rem;background:white;cursor:pointer;appearance:none;outline:none;">
            <option>All Tasks</option><option>Pending</option><option>Completed</option>
          </select>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--muted);"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      <p class="page-subtitle" style="margin-bottom:1.25rem;">${pending} task${pending!==1?'s':''} pending</p>

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

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        ${visible.length ? visible.map(t => `
          <div class="card" style="opacity:${t.completed?'0.75':'1'};">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:.5rem;">
              <div style="display:flex;align-items:center;gap:.5rem;flex:1;min-width:0;">
                ${iconFor(t)}
                <span style="font-size:.88rem;font-weight:600;${t.completed?'text-decoration:line-through;color:var(--muted);':''}overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.title}</span>
              </div>
              <span class="badge ${priorityStyle[t.priority]?.badge||'badge-gray'}" style="flex-shrink:0;margin-left:.5rem;">${t.priority}</span>
            </div>
            <p style="font-size:.78rem;color:var(--muted);margin-bottom:.75rem;margin-left:1.7rem;line-height:1.5;">${t.desc || t.description || ''}</p>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-left:1.7rem;">
              <div style="font-size:.72rem;color:var(--muted);">
                Due: <strong style="color:var(--text);">${t.due}</strong>
                &nbsp;·&nbsp; By: <strong style="color:var(--text);">${t.by}</strong>
              </div>
              ${t.completed
                ? `<span style="font-size:.78rem;color:#22c55e;font-weight:600;display:flex;align-items:center;gap:.3rem;">
                    <svg width="14" height="14" fill="none" stroke="#22c55e" stroke-width="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Completed</span>`
                : `<button class="btn btn-primary" style="font-size:.75rem;padding:.32rem .85rem;" onclick="WT.complete(${t.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Complete</button>`}
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

    async complete(id) {
      const { error } = await window.db
        .from('tasks')
        .update({ completed: true, status: 'completed' })
        .eq('id', id);
      if (error) { alert('Failed to update task: ' + error.message); return; }
      await loadTasks();
      renderTasks();
    },
  };

  // ── Real-time: new tasks assigned to this worker appear instantly ─
  window.db.channel('worker-tasks-live')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'tasks',
      filter: `worker_id=eq.${session.worker_id}`
    }, async () => { await loadTasks(); renderTasks(); })
    .subscribe();

  await loadTasks();
  renderTasks();
});