renderShell('dashboard');

document.getElementById('pageContent').innerHTML = `
  <h1 class="page-title">My Dashboard</h1>
  <p class="page-subtitle">Your daily overview</p>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">

    <!-- Today's Attendance -->
    <div class="card">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span style="font-weight:600;font-size:0.9rem;">Today's Attendance</span>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0.75rem;background:#f0fdf4;border-radius:10px;margin-bottom:0.6rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;color:#166534;font-size:0.82rem;font-weight:500;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Timed In
        </div>
        <span style="font-size:0.82rem;font-weight:600;color:#166534;">7:02 AM</span>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0.75rem;background:#fafafa;border-radius:10px;margin-bottom:1rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;color:var(--muted);font-size:0.82rem;font-weight:500;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Time Out
        </div>
        <span style="font-size:0.82rem;color:var(--muted);">Pending</span>
      </div>
      <div style="text-align:center;">
        <span style="background:#dcfce7;color:#166534;font-size:0.72rem;font-weight:600;padding:0.3rem 0.9rem;border-radius:999px;display:inline-flex;align-items:center;gap:0.3rem;">
          <span style="width:6px;height:6px;background:#22c55e;border-radius:50%;display:inline-block;"></span>
          Currently Working
        </span>
      </div>
    </div>

    <!-- Assigned Tasks -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <span style="font-weight:600;font-size:0.9rem;">Assigned Tasks</span>
        </div>
        <span class="badge badge-orange">2 pending</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.75rem;">
        <div>
          <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.82rem;font-weight:500;margin-bottom:0.15rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Irrigate rice paddies – Section A
          </div>
          <span class="priority-high">High Priority</span>
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.82rem;font-weight:500;margin-bottom:0.15rem;text-decoration:line-through;color:var(--muted);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Apply fertilizer to corn fields
          </div>
          <span class="priority-med">Medium Priority</span>
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.82rem;font-weight:500;margin-bottom:0.15rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Check pest traps in vegetable garden
          </div>
          <span class="priority-low">Low Priority</span>
        </div>
      </div>
    </div>

    <!-- Upcoming Training -->
    <div class="card">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        <span style="font-weight:600;font-size:0.9rem;">Upcoming Training</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:1rem;">
        <div style="padding-bottom:1rem;border-bottom:1px solid var(--border);">
          <div style="font-size:0.85rem;font-weight:600;margin-bottom:0.25rem;">Soil Health Assessment</div>
          <div style="display:flex;gap:1rem;font-size:0.75rem;color:var(--muted);">
            <span>Feb 22, 2026</span><span>2 hours</span>
          </div>
        </div>
        <div>
          <div style="font-size:0.85rem;font-weight:600;margin-bottom:0.25rem;">Organic Farming Techniques</div>
          <div style="display:flex;gap:1rem;font-size:0.75rem;color:var(--muted);">
            <span>Feb 25, 2026</span><span>3 hours</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-row">
    <div class="stat-card"><div class="stat-num">18</div><div class="stat-label">Days Present</div></div>
    <div class="stat-card"><div class="stat-num orange">2</div><div class="stat-label">Days Late</div></div>
    <div class="stat-card"><div class="stat-num blue">12</div><div class="stat-label">Tasks Completed</div></div>
    <div class="stat-card"><div class="stat-num purple">5</div><div class="stat-label">Trainings Done</div></div>
  </div>
`;