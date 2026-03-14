const ADMIN_NAV = [
  { id:'dashboard', label:'Dashboard',        href:'admin-dashboard.html',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>` },
  { id:'inventory', label:'Inventory',         href:'admin-inventory.html',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>` },
  { id:'workers',   label:'Worker Management', href:'admin-workers.html',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
  { id:'tasks',     label:'Task Management',   href:'admin-task-management.html',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>` },
  { id:'crm',       label:'CRM',               href:'admin-crm.html',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>` },
  { id:'ai',        label:'AI Predictions',    href:'admin-ai.html',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>` },
  { id:'analytics', label:'Analytics',          href:'admin-analytics.html',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>` },
  { id:'yield',     label:'Yield Management',   href:'admin-yield.html',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2"/><path d="M4 22l2-2"/><path d="M8 18l2-2"/></svg>` },
  { id:'elearning', label:'E-Learning',         href:'admin-elearning.html',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>` },
];

function renderShell(activeId) {

  // ════════════════════════════════════════════════════════
  // CHANGE 1 — Auth guard
  // Checks if the user is logged in AND has the right role.
  // If not logged in → goes to login.html automatically.
  // If wrong role (e.g. a worker trying to access admin) → redirected.
  // ════════════════════════════════════════════════════════
  const currentUser = Auth.requireAuth(['admin', 'supervisor']);
  if (!currentUser) return; // requireAuth already redirected, just stop here


  const navHTML = ADMIN_NAV.map(item => `
    <a href="${item.href}" class="nav-item ${item.id === activeId ? 'active' : ''}">
      ${item.icon}<span>${item.label}</span>
    </a>`).join('');

  document.getElementById('app').innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <a href="admin-dashboard.html" class="sidebar-brand">
          <div class="brand-icon">
            <svg viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 0 0 7-1 8 5-2-1-8-1-8 5 3-1 6 0 6 5-1-4-10-5-11 0 1-1 2.5-1 3 0-1 0-2.5.5-3 2 1-1 3-1 4 0-1-2-6-3-8 0 2-2 4-3 5-8 1-5 3-8 5-10z"/></svg>
          </div>
          <span class="brand-name">AgriSmart</span>
        </a>
        <nav class="sidebar-nav">${navHTML}</nav>
        <div class="sidebar-collapse">
          <button id="collapseBtn" title="Collapse sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </div>
      </aside>
      <div class="main-area">
        <header class="top-header">
          <p class="header-welcome">Welcome back, <span>${currentUser.name}</span></p>
          <div class="header-right">
            <button class="notif-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span class="badge"></span>
            </button>

            <!-- ══════════════════════════════════════════════
                 CHANGE 2 — Live user info from session
                 currentUser.name, currentUser.email,
                 currentUser.role all come from Auth.getSession()
                 which was set when they logged in.
                 ══════════════════════════════════════════════ -->
            <div class="user-profile" onclick="toggleUserMenu()" style="cursor:pointer;position:relative;" id="userProfileBtn">
              <div class="user-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div class="user-info">
                <div class="user-name">${currentUser.name}</div>
                <div class="user-role">${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}</div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:4px;color:var(--muted);"><polyline points="6 9 12 15 18 9"/></svg>

              <div id="userDropdown" style="display:none;position:absolute;top:calc(100% + 10px);right:0;background:white;border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.12);min-width:200px;z-index:999;overflow:hidden;">
                <div style="padding:1rem;border-bottom:1px solid var(--border);">
                  <div style="font-size:0.85rem;font-weight:600;">${currentUser.name}</div>
                  <div style="font-size:0.72rem;color:var(--muted);">${currentUser.email}</div>
                  <span class="badge badge-green" style="margin-top:0.35rem;">${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}</span>
                </div>
                <div style="padding:0.5rem;">
                  <a href="#" style="display:flex;align-items:center;gap:0.6rem;padding:0.6rem 0.75rem;border-radius:8px;text-decoration:none;color:var(--text);font-size:0.82rem;font-weight:500;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='transparent'">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    My Profile
                  </a>
                  <a href="#" style="display:flex;align-items:center;gap:0.6rem;padding:0.6rem 0.75rem;border-radius:8px;text-decoration:none;color:var(--text);font-size:0.82rem;font-weight:500;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='transparent'">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                    Settings
                  </a>
                  <div style="border-top:1px solid var(--border);margin:0.4rem 0;"></div>

                  <!-- ══════════════════════════════════════════
                       CHANGE 3 — Logout calls Auth.logout()
                       instead of href="index.html"
                       Auth.logout() clears the session then
                       redirects to login.html automatically.
                       ══════════════════════════════════════════ -->
                  <a href="#" onclick="Auth.logout()" style="display:flex;align-items:center;gap:0.6rem;padding:0.6rem 0.75rem;border-radius:8px;text-decoration:none;color:#ef4444;font-size:0.82rem;font-weight:500;" onmouseover="this.style.background='#fff5f5'" onmouseout="this.style.background='transparent'">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Logout
                  </a>
                </div>
              </div>
            </div>

          </div>
        </header>
        <main class="page-content" id="pageContent"></main>
      </div>
    </div>`;

  // Sidebar collapse
  document.getElementById('collapseBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  // Dropdown open/close
  document.addEventListener('click', function(e) {
    const btn      = document.getElementById('userProfileBtn');
    const dropdown = document.getElementById('userDropdown');
    if (!btn || !dropdown) return;
    if (btn.contains(e.target)) {
      const isOpen = dropdown.style.display === 'block';
      dropdown.style.display = isOpen ? 'none' : 'block';
    } else {
      dropdown.style.display = 'none';
    }
  });
}