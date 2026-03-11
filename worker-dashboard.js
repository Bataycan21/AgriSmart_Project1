// ================================================================
// worker-dashboard.js  –  AgriSmart Worker Dashboard
// ================================================================

(async function () {

  renderShell('dashboard');

  const now       = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();

  const MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];

  // ── 1. ATTENDANCE (async — Supabase) ─────────────────────────
  const allLogsRaw    = await AttendanceStore.getLogs()  || [];
  const tLog          = await AttendanceStore.getTodayLog();
  const timedIn       = tLog ? tLog.active : false;
  const timedOut      = tLog ? (!tLog.active && !!tLog.timeOut && tLog.timeOut !== '--') : false;

  const completedLogs = allLogsRaw.filter(r => !r.active);
  const monthLogs     = completedLogs.filter(r => {
    const d = new Date(r.dateKey + 'T00:00:00');
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const daysPresent = monthLogs.filter(r => r.status === 'present' || r.status === 'late').length;
  const daysLate    = monthLogs.filter(r => r.status === 'late').length;
  const daysAbsent  = monthLogs.filter(r => r.status === 'absent').length;

  // ── 2. TASKS (Supabase) ───────────────────────────────────────
  const session = Auth.getSession();
  let TASKS = [];
  try {
    if (session?.worker_id) {
      const { data } = await window.db
        .from('tasks')
        .select('*')
        .eq('worker_id', session.worker_id)
        .order('created_at', { ascending: false });
      TASKS = (data || []).map(t => ({
        id:        t.id,
        priority:  t.priority  || 'Low',
        completed: t.completed || false,
        title:     t.title,
        due:       t.due_date ? new Date(t.due_date).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' }) : '—',
        isNew:     false,
      }));
    }
  } catch(e) { console.warn('[Dashboard] tasks:', e.message); }

  if (!TASKS.length) {
    TASKS = [
      { id:1, priority:'High',   completed:false, title:'Irrigate Rice Paddies – Section A',  due:'Mar 5, 2026',  isNew:true  },
      { id:2, priority:'Medium', completed:true,  title:'Apply Fertilizer to Corn Fields',    due:'Mar 4, 2026',  isNew:false },
      { id:3, priority:'Low',    completed:false, title:'Check Pest Traps',                   due:'Mar 5, 2026',  isNew:true  },
      { id:4, priority:'High',   completed:false, title:'Harvest Ripe Tomatoes',              due:'Mar 6, 2026',  isNew:false },
      { id:5, priority:'Medium', completed:true,  title:'Equipment Maintenance Check',        due:'Mar 3, 2026',  isNew:false },
      { id:6, priority:'Medium', completed:false, title:'Soil Sample Collection',             due:'Mar 7, 2026',  isNew:false },
    ];
  }

  const pendingTasks   = TASKS.filter(t => !t.completed);
  const completedTasks = TASKS.filter(t =>  t.completed);
  const newTasks       = TASKS.filter(t => !t.completed && t.isNew);

  // ── 3. E-LEARNING — fetch modules + progress from Supabase ───
  let COURSES = [];
  let CP = {};

  try {
    // Fetch all enabled modules (real IDs from DB)
    const { data: modulesData, error: modulesError } = await window.db
      .from('elearning_modules')
      .select('id, tag, tag_color, accent, title, description, hours, modules')
      .eq('enabled', true)
      .order('id');

    if (modulesError) throw modulesError;

    COURSES = (modulesData || []).map(row => ({
      id:       row.id,
      tag:      row.tag,
      tagColor: row.tag_color || '#2D5A27',
      accent:   row.accent    || '#2D5A27',
      title:    row.title,
    }));

    // Initialize all to 0%
    COURSES.forEach(c => { CP[c.id] = 0; });

    // Fetch this worker's progress
    if (session?.worker_id) {
      const { data: progressData, error: progressError } = await window.db
        .from('elearning_progress')
        .select('module_id, progress, completed')
        .eq('worker_id', session.worker_id);

      if (progressError) throw progressError;

      (progressData || []).forEach(r => {
        CP[r.module_id] = r.progress || 0;
      });
    }
  } catch(e) {
    console.warn('[Dashboard] elearning:', e.message);
  }

  const completedModules  = COURSES.filter(c => (CP[c.id] || 0) >= 100);
  const inProgressModules = COURSES.filter(c => (CP[c.id] || 0) > 0 && (CP[c.id] || 0) < 100);
  const notStarted        = COURSES.filter(c => (CP[c.id] || 0) === 0);
  const newModules        = notStarted;
  const pendingModules    = inProgressModules;

  // ── 4. Attendance badge ───────────────────────────────────────
  let attendStatus, attendBg, attendDot;
  if (timedOut) {
    attendStatus = 'Done for Today';    attendBg = '#f0fdf4'; attendDot = '#22c55e';
  } else if (timedIn) {
    attendStatus = 'Currently Working'; attendBg = '#f0fdf4'; attendDot = '#22c55e';
  } else {
    attendStatus = 'Not Yet Timed In';  attendBg = '#fffbeb'; attendDot = '#f59e0b';
  }

  // ── Helpers ───────────────────────────────────────────────────
  const priorityColors = {
    High:   { bg:'#fee2e2', text:'#dc2626', dot:'#ef4444' },
    Medium: { bg:'#fef3c7', text:'#d97706', dot:'#f59e0b' },
    Low:    { bg:'#f3f4f6', text:'#6b7280', dot:'#9ca3af' },
  };

  function priorityBadge(p) {
    const c = priorityColors[p] || priorityColors.Low;
    return `<span style="background:${c.bg};color:${c.text};font-size:.65rem;font-weight:700;padding:.15rem .5rem;border-radius:999px;">${p}</span>`;
  }

  // ── 5. Render ─────────────────────────────────────────────────
  document.getElementById('pageContent').innerHTML = `

    <!-- Page Header -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.25rem;">
      <div>
        <h1 class="page-title" style="margin-bottom:0;">My Dashboard</h1>
        <p class="page-subtitle" style="margin-bottom:0;">${MONTH_NAMES[thisMonth]} ${thisYear} · Your daily overview</p>
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;background:${attendBg};border:1px solid ${timedIn||timedOut?'#bbf7d0':'#fde68a'};padding:.4rem .85rem;border-radius:999px;">
        <span style="width:8px;height:8px;background:${attendDot};border-radius:50%;display:inline-block;${timedIn&&!timedOut?'animation:dashBlink 1.5s ease infinite;':''}"></span>
        <span style="font-size:.75rem;font-weight:600;color:${timedIn||timedOut?'#166534':'#92400e'};">${attendStatus}</span>
      </div>
    </div>

    <!-- ROW 1: Today's Attendance · Tasks · E-Learning -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">

      <!-- TODAY'S ATTENDANCE -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
          <div style="display:flex;align-items:center;gap:.5rem;">
            <div style="width:32px;height:32px;background:#f0fdf4;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <span style="font-weight:700;font-size:.9rem;">Today's Attendance</span>
          </div>
          <a href="worker-timeinout.html" style="font-size:.7rem;color:var(--green-dark);font-weight:600;text-decoration:none;">→ Time In/Out</a>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;padding:.6rem .75rem;background:${timedIn||timedOut?'#f0fdf4':'#fafafa'};border-radius:10px;margin-bottom:.5rem;border:1px solid ${timedIn||timedOut?'#dcfce7':'var(--border)'};">
          <div style="display:flex;align-items:center;gap:.45rem;font-size:.8rem;font-weight:500;color:${timedIn||timedOut?'#166534':'var(--muted)'};">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            Time In
          </div>
          <span style="font-size:.82rem;font-weight:700;color:${timedIn||timedOut?'#166534':'var(--muted)'};">
            ${timedIn||timedOut ? (tLog?.timeIn || '—') : 'Not yet'}
          </span>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;padding:.6rem .75rem;background:${timedOut?'#f0fdf4':'#fafafa'};border-radius:10px;margin-bottom:1rem;border:1px solid ${timedOut?'#dcfce7':'var(--border)'};">
          <div style="display:flex;align-items:center;gap:.45rem;font-size:.8rem;font-weight:500;color:${timedOut?'#166534':'var(--muted)'};">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Time Out
          </div>
          <span style="font-size:.82rem;font-weight:700;color:${timedOut?'#166534':'var(--muted)'};">
            ${timedOut ? (tLog?.timeOut || '—') : 'Pending'}
          </span>
        </div>

        <div style="text-align:center;">
          <span style="background:${attendBg};border:1px solid ${timedIn||timedOut?'#bbf7d0':'#fde68a'};color:${timedIn||timedOut?'#166534':'#92400e'};font-size:.72rem;font-weight:700;padding:.3rem .9rem;border-radius:999px;display:inline-flex;align-items:center;gap:.35rem;">
            <span style="width:6px;height:6px;background:${attendDot};border-radius:50%;display:inline-block;"></span>
            ${attendStatus}
          </span>
        </div>

        ${!timedIn && !timedOut ? `
          <a href="worker-timeinout.html" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:.85rem;text-decoration:none;font-size:.78rem;padding:.5rem;display:flex;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            Time In Now
          </a>` : ''}
      </div>

      <!-- ASSIGNED TASKS -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
          <div style="display:flex;align-items:center;gap:.5rem;">
            <div style="width:32px;height:32px;background:#fffbeb;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <span style="font-weight:700;font-size:.9rem;">My Tasks</span>
          </div>
          <div style="display:flex;align-items:center;gap:.35rem;">
            ${newTasks.length ? `<span style="background:#fee2e2;color:#dc2626;font-size:.65rem;font-weight:700;padding:.15rem .5rem;border-radius:999px;">${newTasks.length} new</span>` : ''}
            <span style="background:#fef3c7;color:#d97706;font-size:.65rem;font-weight:700;padding:.15rem .5rem;border-radius:999px;">${pendingTasks.length} pending</span>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:.55rem;margin-bottom:.85rem;">
          ${pendingTasks.slice(0,3).map(t => `
            <div style="display:flex;align-items:flex-start;gap:.5rem;padding:.55rem .65rem;background:#fafafa;border-radius:8px;border:1px solid var(--border);border-left:3px solid ${priorityColors[t.priority]?.dot||'#9ca3af'};">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${priorityColors[t.priority]?.dot||'#9ca3af'}" stroke-width="2.5" style="flex-shrink:0;margin-top:2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div style="min-width:0;flex:1;">
                <div style="font-size:.78rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.title}</div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:.15rem;">
                  <span style="font-size:.67rem;color:var(--muted);">Due ${t.due}</span>
                  ${priorityBadge(t.priority)}
                </div>
              </div>
            </div>`).join('')}

          ${pendingTasks.length === 0 ? `
            <div style="text-align:center;padding:1rem;color:var(--muted);font-size:.78rem;">
              <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin:0 auto .35rem;display:block;opacity:.4;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              All tasks completed!
            </div>` : ''}
        </div>

        <a href="worker-tasks.html" style="display:flex;align-items:center;justify-content:center;gap:.35rem;font-size:.75rem;color:var(--green-dark);font-weight:600;text-decoration:none;padding:.4rem;border:1.5px solid var(--border);border-radius:8px;transition:all .2s;"
          onmouseover="this.style.borderColor='var(--sage)';this.style.background='var(--green-light)'"
          onmouseout="this.style.borderColor='var(--border)';this.style.background='transparent'">
          View All ${TASKS.length} Tasks →
        </a>
      </div>

      <!-- E-LEARNING -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
          <div style="display:flex;align-items:center;gap:.5rem;">
            <div style="width:32px;height:32px;background:#eff6ff;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            </div>
            <span style="font-weight:700;font-size:.9rem;">E-Learning</span>
          </div>
          <div style="display:flex;align-items:center;gap:.35rem;">
            ${newModules.length ? `<span style="background:#dbeafe;color:#1e40af;font-size:.65rem;font-weight:700;padding:.15rem .5rem;border-radius:999px;">${newModules.length} new</span>` : ''}
            ${pendingModules.length ? `<span style="background:#fef3c7;color:#d97706;font-size:.65rem;font-weight:700;padding:.15rem .5rem;border-radius:999px;">${pendingModules.length} in progress</span>` : ''}
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:.55rem;margin-bottom:.85rem;">
          ${pendingModules.slice(0,2).map(c => `
            <div style="padding:.55rem .65rem;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
              <div style="font-size:.73rem;font-weight:600;margin-bottom:.2rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.title}</div>
              <div style="display:flex;align-items:center;gap:.5rem;">
                <div style="flex:1;height:4px;background:#dbeafe;border-radius:999px;overflow:hidden;">
                  <div style="height:100%;width:${CP[c.id]||0}%;background:#3b82f6;border-radius:999px;"></div>
                </div>
                <span style="font-size:.65rem;color:#1e40af;font-weight:700;">${CP[c.id]||0}%</span>
              </div>
            </div>`).join('')}

          ${newModules.slice(0, Math.max(0, 2 - pendingModules.length)).map(c => `
            <div style="display:flex;align-items:center;gap:.5rem;padding:.55rem .65rem;background:#fafafa;border-radius:8px;border:1px solid var(--border);">
              <div style="width:8px;height:8px;background:${c.tagColor};border-radius:50%;flex-shrink:0;"></div>
              <div style="min-width:0;flex:1;">
                <div style="font-size:.73rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.title}</div>
                <span style="font-size:.65rem;color:var(--muted);">${c.tag} · Not started</span>
              </div>
            </div>`).join('')}

          ${pendingModules.length === 0 && newModules.length === 0 ? `
            <div style="text-align:center;padding:1rem;color:var(--muted);font-size:.78rem;">
              <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin:0 auto .35rem;display:block;opacity:.4;"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
              All modules completed!
            </div>` : ''}
        </div>

        <a href="worker-elearning.html" style="display:flex;align-items:center;justify-content:center;gap:.35rem;font-size:.75rem;color:#1e40af;font-weight:600;text-decoration:none;padding:.4rem;border:1.5px solid #bfdbfe;border-radius:8px;background:#eff6ff;transition:all .2s;"
          onmouseover="this.style.background='#dbeafe'"
          onmouseout="this.style.background='#eff6ff'">
          View All ${COURSES.length} Modules →
        </a>
      </div>
    </div>

    <!-- ROW 2: Monthly Summary Stats -->
    <div style="margin-bottom:1rem;">
      <div style="font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.65rem;">
        ${MONTH_NAMES[thisMonth]} Summary
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.85rem;">

        <div class="card" style="display:flex;align-items:center;gap:.85rem;padding:.9rem 1rem;">
          <div style="width:42px;height:42px;background:#f0fdf4;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div>
            <div style="font-size:1.6rem;font-weight:700;color:#22c55e;line-height:1;">${daysPresent}</div>
            <div style="font-size:.7rem;font-weight:600;color:var(--text);margin-top:.1rem;">Days Present</div>
            <div style="font-size:.65rem;color:var(--muted);">${daysAbsent} absent this month</div>
          </div>
        </div>

        <div class="card" style="display:flex;align-items:center;gap:.85rem;padding:.9rem 1rem;">
          <div style="width:42px;height:42px;background:#fffbeb;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <div style="font-size:1.6rem;font-weight:700;color:#f59e0b;line-height:1;">${daysLate}</div>
            <div style="font-size:.7rem;font-weight:600;color:var(--text);margin-top:.1rem;">Days Late</div>
            <div style="font-size:.65rem;color:var(--muted);">${monthLogs.length} days logged</div>
          </div>
        </div>

        <div class="card" style="display:flex;align-items:center;gap:.85rem;padding:.9rem 1rem;">
          <div style="width:42px;height:42px;background:#eff6ff;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <div>
            <div style="font-size:1.6rem;font-weight:700;color:#3b82f6;line-height:1;">${completedTasks.length}</div>
            <div style="font-size:.7rem;font-weight:600;color:var(--text);margin-top:.1rem;">Tasks Completed</div>
            <div style="font-size:.65rem;color:var(--muted);">${pendingTasks.length} still pending</div>
          </div>
        </div>

        <div class="card" style="display:flex;align-items:center;gap:.85rem;padding:.9rem 1rem;">
          <div style="width:42px;height:42px;background:#f5f3ff;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
          </div>
          <div>
            <div style="font-size:1.6rem;font-weight:700;color:#8b5cf6;line-height:1;">${completedModules.length}</div>
            <div style="font-size:.7rem;font-weight:600;color:var(--text);margin-top:.1rem;">Trainings Done</div>
            <div style="font-size:.65rem;color:var(--muted);">${inProgressModules.length} in progress</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ROW 3: Recent Attendance + Training Progress -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.85rem;">
          <div style="font-weight:700;font-size:.95rem;">Recent Attendance</div>
          <a href="worker-attendance.html" style="font-size:.72rem;color:var(--green-dark);font-weight:600;text-decoration:none;">View all →</a>
        </div>
        ${completedLogs.length === 0 ? `
          <div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.8rem;">
            <svg width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin:0 auto .5rem;display:block;opacity:.35;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            No attendance records yet.<br>
            <a href="worker-timeinout.html" style="color:var(--green-dark);font-weight:600;">Time In</a> to start recording.
          </div>` : `
          <div style="display:flex;flex-direction:column;gap:.4rem;">
            ${completedLogs.slice(0,5).map(r => {
              const sColor = r.status==='present'?'#22c55e':r.status==='late'?'#f59e0b':'#ef4444';
              const sBg    = r.status==='present'?'#f0fdf4':r.status==='late'?'#fffbeb':'#fef2f2';
              const sLabel = r.status==='present'?'Present':r.status==='late'?'Late':'Absent';
              return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:.5rem .65rem;background:#fafafa;border-radius:8px;">
                  <div style="display:flex;align-items:center;gap:.6rem;">
                    <span style="width:8px;height:8px;background:${sColor};border-radius:50%;flex-shrink:0;"></span>
                    <div>
                      <div style="font-size:.78rem;font-weight:600;">${r.date} <span style="font-weight:400;color:var(--muted);">· ${r.day||''}</span></div>
                      <div style="font-size:.67rem;color:var(--muted);">${r.timeIn||'—'} → ${r.timeOut||'—'} · ${r.total||'—'}</div>
                    </div>
                  </div>
                  <span style="background:${sBg};color:${sColor};font-size:.67rem;font-weight:700;padding:.15rem .5rem;border-radius:999px;">${sLabel}</span>
                </div>`;
            }).join('')}
          </div>`}
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.85rem;">
          <div style="font-weight:700;font-size:.95rem;">Training Progress</div>
          <a href="worker-elearning.html" style="font-size:.72rem;color:var(--green-dark);font-weight:600;text-decoration:none;">Go to E-Learning →</a>
        </div>

        <div style="margin-bottom:1rem;">
          <div style="display:flex;justify-content:space-between;font-size:.72rem;color:var(--muted);margin-bottom:.3rem;">
            <span>Overall Completion</span>
            <span style="font-weight:700;color:var(--green-dark);">${completedModules.length} / ${COURSES.length} modules</span>
          </div>
          <div style="height:8px;background:#f3f4f6;border-radius:999px;overflow:hidden;">
            <div style="height:100%;width:${COURSES.length ? Math.round((completedModules.length/COURSES.length)*100) : 0}%;background:linear-gradient(90deg,#2D5A27,#22c55e);border-radius:999px;transition:width .6s ease;"></div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:.45rem;">
          ${COURSES.map(c => {
            const p      = CP[c.id] || 0;
            const status = p >= 100 ? 'Completed' : p > 0 ? 'In Progress' : 'Not Started';
            const sColor = p >= 100 ? '#22c55e'   : p > 0 ? '#3b82f6'    : '#d1d5db';
            const sBg    = p >= 100 ? '#f0fdf4'   : p > 0 ? '#eff6ff'    : '#f9fafb';
            return `
              <div style="display:flex;align-items:center;gap:.6rem;">
                <div style="width:6px;height:6px;background:${c.tagColor};border-radius:50%;flex-shrink:0;"></div>
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.2rem;">
                    <span style="font-size:.73rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;">${c.title}</span>
                    <span style="background:${sBg};color:${sColor};font-size:.62rem;font-weight:700;padding:.1rem .45rem;border-radius:999px;flex-shrink:0;margin-left:.4rem;">${status}</span>
                  </div>
                  <div style="height:4px;background:#f3f4f6;border-radius:999px;overflow:hidden;">
                    <div style="height:100%;width:${p}%;background:${c.tagColor};border-radius:999px;"></div>
                  </div>
                </div>
                <span style="font-size:.65rem;font-weight:700;color:var(--muted);width:28px;text-align:right;flex-shrink:0;">${p}%</span>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <style>
      @keyframes dashBlink { 0%,100%{opacity:1} 50%{opacity:.3} }
    </style>
  `;

})();