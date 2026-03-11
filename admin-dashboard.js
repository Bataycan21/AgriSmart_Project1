// ================================================================
// admin-dashboard.js  –  AgriSmart Admin Dashboard
// Fully connected to Supabase — all data is live.
// ================================================================

renderShell('dashboard');

const currentYear = new Date().getFullYear();
const todayStr    = new Date().toISOString().split('T')[0];
const todayLabel  = new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });

// ── CHART STYLE DEFAULTS ─────────────────────────────────────────
const cf  = { family:'Poppins', size:10 };
const tip = {
  backgroundColor:'#fff', titleColor:'#1a1a1a', bodyColor:'#6b7280',
  borderColor:'#e5e7eb', borderWidth:1, padding:10,
  titleFont:{ family:'Poppins', weight:'600', size:12 },
  bodyFont:{ family:'Poppins', size:11 }
};

// ── RENDER HELPERS ───────────────────────────────────────────────
const statusBg   = { completed:'#dcfce7', 'in-progress':'#dbeafe', pending:'#fef3c7' };
const statusText = { completed:'#166534', 'in-progress':'#1e40af', pending:'#92400e' };
const statusBar  = { completed:'', 'in-progress':' orange', pending:' red' };
const prioClass  = { High:'priority-high', Medium:'priority-med', Low:'priority-low' };

const statIcons = {
  'Total Crops':     `<path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2"/>`,
  'Inventory Items': `<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>`,
  'Active Workers':  `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  'Predicted Yield': `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>`,
  'Total Tasks':     `<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`,
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs} hour${hrs>1?'s':''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 2)   return 'Yesterday';
  return `${days} days ago`;
}

function buildAttendPercents(rows) {
  const MONTHS = 12;
  const buckets = Array.from({length:MONTHS}, () => ({present:0,late:0,absent:0,total:0}));
  rows.forEach(r => {
    const m = new Date(r.date + 'T00:00:00').getMonth();
    buckets[m][r.status] = (buckets[m][r.status]||0) + 1;
    // Late workers are also present — count them in both
    if (r.status === 'late') {
      buckets[m].present = (buckets[m].present||0) + 1;
    }
    buckets[m].total++;
  });
  return {
    present: buckets.map(b => b.total ? Math.round((b.present/b.total)*100) : 0),
    late:    buckets.map(b => b.total ? Math.round((b.late/b.total)*100)    : 0),
    absent:  buckets.map(b => b.total ? Math.round((b.absent/b.total)*100)  : 0),
  };
}

function buildTaskMonthly(rows) {
  const completed = new Array(12).fill(0);
  const pending   = new Array(12).fill(0);
  rows.forEach(t => {
    const m = new Date(t.created_at).getMonth();
    t.completed ? completed[m]++ : pending[m]++;
  });
  return { completed, pending };
}

function buildYieldByCrop(rows) {
  const crops = {};
  rows.forEach(y => {
    if (!crops[y.crop]) crops[y.crop] = new Array(12).fill(0);
    const m = new Date(y.created_at).getMonth();
    crops[y.crop][m] += Math.round((y.per_ha_yield||0) * (y.land_area||1) * 1000);
  });
  // forward-fill
  Object.keys(crops).forEach(c => {
    let last = 0;
    crops[c] = crops[c].map(v => { if (v>0) last=v; return v>0?v:last; });
  });
  return crops;
}

// visible months up to current
function visMonths() {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return MONTHS.slice(0, new Date().getMonth() + 1);
}

// ── MAIN INIT ────────────────────────────────────────────────────
async function loadDashboard() {
  const db = window.db;

  // Loading state
  document.getElementById('pageContent').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:60vh;color:var(--muted);font-size:.9rem;gap:.75rem;">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="animation:spin 1s linear infinite;">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Loading dashboard…
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg);}}</style>
  `;

  // ── Fetch all data in parallel ───────────────────────────────
  const [
    { data: invRows },
    { data: workerRows },
    { data: predRows },
    { data: taskRows },
    { data: taskTodayRows },
    { data: attendRows },
    { data: crmRows },
  ] = await Promise.all([
    db.from('inventory_items').select('name, cat, qty, unit, status'),
    db.from('workers').select('id, name, status'),
    db.from('ai_predictions').select('crop, per_ha_yield, land_area, created_at').gte('created_at', `${currentYear}-01-01`),
    db.from('tasks').select('title, worker, priority, status, completed, created_at, due_date, description').gte('created_at', `${currentYear}-01-01`),
    db.from('tasks').select('title, worker, priority, status, completed, due_date, time, progress_pct').eq('due_date', todayStr).order('time', { ascending: true }),
    db.from('attendance').select('status, date, worker_id').gte('date', `${currentYear}-01-01`),
    db.from('crm_contacts').select('type, stars, enabled, created_at'),
  ]);

  const inventory  = invRows       || [];
  const workers    = workerRows    || [];
  const preds      = predRows      || [];
  const tasks      = taskRows      || [];
  const todayTasks = taskTodayRows || [];
  const attend     = attendRows    || [];
  const crm        = crmRows       || [];

  const vm = visMonths();

  // ── Compute KPIs ────────────────────────────────────────────
  const activeWorkers  = workers.filter(w => w.status === 'active').length;
  const totalInv       = inventory.length;
  const totalYield     = preds.reduce((s,p) => s + (p.per_ha_yield||0) * (p.land_area||1), 0);
  const ytdYield       = preds.reduce((s,p) => s + (p.per_ha_yield||0) * (p.land_area||1), 0);

  const totalTasks     = tasks.length;
  const doneTasks      = tasks.filter(t => t.completed || t.status === 'completed').length;
  const compRate       = totalTasks ? Math.round((doneTasks/totalTasks)*100) : 0;

  const lowStock       = inventory.filter(i => i.status === 'low-stock').length;
  const outStock       = inventory.filter(i => i.status === 'out-of-stock').length;

  const attendPercents = buildAttendPercents(attend);
  const presentVals    = attendPercents.present.slice(0, vm.length).filter(v => v > 0);
  const avgPresent     = presentVals.length ? Math.round(presentVals.reduce((a,b)=>a+b,0)/presentVals.length) : 0;
  const lateVals       = attendPercents.late.slice(0, vm.length).filter(v => v > 0);
  const avgLate        = lateVals.length ? Math.round(lateVals.reduce((a,b)=>a+b,0)/lateVals.length) : 0;
  const absentVals     = attendPercents.absent.slice(0, vm.length).filter(v => v > 0);
  const avgAbsent      = absentVals.length ? Math.round(absentVals.reduce((a,b)=>a+b,0)/absentVals.length) : 0;

  const taskMonthly    = buildTaskMonthly(tasks);
  const yieldByCrop    = buildYieldByCrop(preds);
  const crops          = Object.keys(yieldByCrop);

  const priorityCounts = { High:0, Medium:0, Low:0 };
  tasks.forEach(t => { if (priorityCounts[t.priority] !== undefined) priorityCounts[t.priority]++; });

  // ── CRM counts ───────────────────────────────────────────────
  const crmBuyers    = crm.filter(c => c.type === 'Buyer').length;
  const crmSuppliers = crm.filter(c => c.type === 'Supplier').length;
  const crmPartners  = crm.filter(c => c.type === 'Partner').length;

  // ── Build recent activity from real task completions ────────
  const recentCompleted = tasks
    .filter(t => t.completed || t.status === 'completed')
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 4)
    .map(t => ({ dot:'#22c55e', text:`Task completed: ${t.title} — ${t.worker||''}`, time: timeAgo(t.created_at) }));

  const lowStockItems = inventory
    .filter(i => i.status !== 'in-stock')
    .slice(0, 2)
    .map(i => ({ dot: i.status==='low-stock'?'#f59e0b':'#ef4444', text:`${i.status==='low-stock'?'Low':'Out of'} stock: ${i.name}`, time:'Now' }));

  const activity = [...lowStockItems, ...recentCompleted].slice(0, 6);

  // fallback if empty
  if (!activity.length) activity.push({ dot:'#6b7280', text:'No recent activity yet.', time:'—' });

  // ── Notifications from inventory ────────────────────────────
  const notifications = [
    ...inventory.filter(i => i.status === 'out-of-stock').map(i => ({
      urgent: true, stroke:'#ef4444', text:`Out of stock: ${i.name} (0 ${i.unit||'units'})`
    })),
    ...inventory.filter(i => i.status === 'low-stock').map(i => ({
      urgent: true, stroke:'#f59e0b', text:`Low stock: ${i.name} (${i.qty} ${i.unit||'units'} remaining)`
    })),
    ...(tasks.filter(t => !t.completed && t.due_date <= todayStr).slice(0,2).map(t => ({
      urgent: false, stroke:'#3b82f6', text:`Overdue task: ${t.title} — ${t.worker||''}`
    }))),
  ].slice(0, 5);

  if (!notifications.length) notifications.push({ urgent:false, stroke:'#22c55e', text:'All systems looking good!' });

  // ── Stat cards ───────────────────────────────────────────────
  const statCards = [
    { bg:'#eff6ff', stroke:'#3b82f6', color:'blue',   trendColor:'#22c55e', trend:`${lowStock} low · ${outStock} out`, num: totalInv.toLocaleString(), label:'Inventory Items' },
    { bg:'#fff7ed', stroke:'#f59e0b', color:'orange', trendColor: activeWorkers > 0 ? '#22c55e':'#ef4444', trend:`${activeWorkers} of ${workers.length} active`, num: activeWorkers, label:'Active Workers' },
    { bg:'#faf5ff', stroke:'#8b5cf6', color:'purple', trendColor:'#22c55e', trend:`${preds.length} predictions`, num: totalYield.toFixed(1)+'T', label:'Predicted Yield' },
    { bg:'#f0fdf4', stroke:'#2D5A27', color:'',       trendColor: compRate >= 70 ? '#22c55e':'#ef4444', trend:`${compRate}% completion`, num: totalTasks, label:'Total Tasks' },
  ];

  // ── Inject HTML ──────────────────────────────────────────────
  document.getElementById('pageContent').innerHTML = `

    <div style="display:flex;align-items:flex-start;justify-content:space-between;">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Farm overview and key metrics</p>
      </div>
      <div style="display:flex;align-items:center;gap:.6rem;margin-top:.2rem;">
        <span style="font-size:.75rem;color:var(--muted);background:var(--white);border:1px solid var(--border);padding:.3rem .75rem;border-radius:8px;">📅 ${todayLabel}</span>
        <button class="btn btn-primary" onclick="window.print()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
      </div>
    </div>

    <!-- STAT CARDS -->
    <div class="stats-row">
      ${statCards.map(s => `
        <div class="stat-card" style="text-align:left;display:flex;align-items:center;gap:1rem;">
          <div style="width:46px;height:46px;background:${s.bg};border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${s.stroke}" stroke-width="2">${statIcons[s.label]||statIcons['Inventory Items']}</svg>
          </div>
          <div>
            <div style="font-size:.7rem;color:${s.trendColor};font-weight:600;margin-bottom:.1rem;">${s.trend}</div>
            <div class="stat-num ${s.color}">${s.num}</div>
            <div class="stat-label">${s.label}</div>
          </div>
        </div>`).join('')}
    </div>

    <!-- KPI STRIP -->
    <p style="font-size:.68rem;font-weight:700;color:var(--muted);letter-spacing:.07em;text-transform:uppercase;margin:1.5rem 0 .6rem;">📊 Analytics Overview — Connected from All Modules</p>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.85rem;margin-bottom:1.5rem;">
      ${[
        { icon:'🌾', bg:'#f0fdf4', valColor:'#2D5A27', val: preds.length ? ytdYield.toFixed(1)+' T' : '—', name:'Total Yield YTD',  sub:'From AI Predictions' },
        { icon:'✅', bg:'#f0fdf4', valColor:'#22c55e', val: totalTasks ? compRate+'%' : '—',             name:'Task Completion',  sub: totalTasks ? `${doneTasks} of ${totalTasks} tasks done` : 'No tasks yet' },
        { icon:'👷', bg:'#eff6ff', valColor:'#3b82f6', val: attend.length ? avgPresent+'%' : '—',        name:'Avg Attendance',   sub:'Across all workers' },
        { icon:'📦', bg:'#fffbeb', valColor:'#f59e0b', val: inventory.length ? lowStock+outStock : '—',  name:'Inventory Alerts', sub: inventory.length ? `${lowStock} low · ${outStock} out of stock` : 'No inventory data' },
      ].map(k => `
        <div class="card" style="display:flex;align-items:center;gap:.85rem;padding:1rem 1.1rem;">
          <div style="width:40px;height:40px;background:${k.bg};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">${k.icon}</div>
          <div>
            <div style="font-size:1.2rem;font-weight:700;color:${k.valColor};line-height:1.1;">${k.val}</div>
            <div style="font-size:.7rem;font-weight:600;color:var(--text);margin-top:.05rem;">${k.name}</div>
            <div style="font-size:.65rem;color:var(--muted);">${k.sub}</div>
          </div>
        </div>`).join('')}
    </div>

    <!-- CHARTS ROW 1 -->
    <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:1rem;margin-bottom:1rem;">
      <div class="card">
        <div style="font-weight:700;font-size:1rem;margin-bottom:.15rem;">Yield Trends</div>
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:1rem;">Monthly yield vs target (tons)</div>
        ${preds.length
          ? `<canvas id="yieldChart" height="140"></canvas>`
          : `<div style="text-align:center;padding:3rem;color:var(--muted);font-size:.82rem;">No AI prediction data yet.</div>`}
      </div>
      <div class="card">
        <div style="font-weight:700;font-size:1rem;margin-bottom:.15rem;">CRM Contacts</div>
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:1rem;">Buyers · Suppliers · Partners</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:.85rem;">
          <div style="background:#eff6ff;border-radius:8px;padding:.5rem;text-align:center;">
            <div style="font-size:1.1rem;font-weight:700;color:#3b82f6;">${crmBuyers}</div>
            <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Buyers</div>
          </div>
          <div style="background:#f0fdf4;border-radius:8px;padding:.5rem;text-align:center;">
            <div style="font-size:1.1rem;font-weight:700;color:#22c55e;">${crmSuppliers}</div>
            <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Suppliers</div>
          </div>
          <div style="background:#faf5ff;border-radius:8px;padding:.5rem;text-align:center;">
            <div style="font-size:1.1rem;font-weight:700;color:#8b5cf6;">${crmPartners}</div>
            <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Partners</div>
          </div>
        </div>
        ${crm.length
          ? `<canvas id="crmChart" height="110"></canvas>`
          : `<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem;">No CRM contacts yet.</div>`}
      </div>
    </div>

    <!-- CHARTS ROW 2 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.15rem;">
          <div style="font-weight:700;font-size:1rem;">Task Completion Rate</div>
          <span class="badge badge-green">${compRate}% overall</span>
        </div>
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:.85rem;">Monthly completed vs pending · from Tasks</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:.85rem;">
          <div style="background:#f9fafb;border-radius:8px;padding:.5rem;text-align:center;">
            <div style="font-size:1.1rem;font-weight:700;">${totalTasks}</div>
            <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Total</div>
          </div>
          <div style="background:#f0fdf4;border-radius:8px;padding:.5rem;text-align:center;">
            <div style="font-size:1.1rem;font-weight:700;color:#22c55e;">${doneTasks}</div>
            <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Completed</div>
          </div>
          <div style="background:#fffbeb;border-radius:8px;padding:.5rem;text-align:center;">
            <div style="font-size:1.1rem;font-weight:700;color:#f59e0b;">${totalTasks - doneTasks}</div>
            <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Pending</div>
          </div>
        </div>
        ${tasks.length
          ? `<canvas id="taskCompChart" height="130"></canvas>`
          : `<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem;">No task data yet.</div>`}
      </div>
      <div class="card">
        <div style="font-weight:700;font-size:1rem;margin-bottom:.15rem;">Worker Attendance Rate</div>
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:.85rem;">Monthly attendance % · from Attendance records</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:.85rem;">
          <div style="background:#f0fdf4;border-radius:8px;padding:.5rem;text-align:center;">
            <div style="font-size:1.1rem;font-weight:700;color:#22c55e;">${avgPresent}%</div>
            <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Avg Present</div>
          </div>
          <div style="background:#fffbeb;border-radius:8px;padding:.5rem;text-align:center;">
            <div style="font-size:1.1rem;font-weight:700;color:#f59e0b;">${avgLate}%</div>
            <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Avg Late</div>
          </div>
          <div style="background:#fee2e2;border-radius:8px;padding:.5rem;text-align:center;">
            <div style="font-size:1.1rem;font-weight:700;color:#ef4444;">${avgAbsent}%</div>
            <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Avg Absent</div>
          </div>
        </div>
        ${attend.length
          ? `<canvas id="attendChart" height="130"></canvas>`
          : `<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem;">No attendance data yet.</div>`}
      </div>
    </div>

    <!-- CHARTS ROW 3 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
      <div class="card">
        <div style="font-weight:700;font-size:1rem;margin-bottom:.15rem;">Yield Over Time</div>
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:1rem;">Monthly crop yield in kg · from AI Predictions</div>
        ${preds.length
          ? `<canvas id="yieldTimeChart" height="130"></canvas>`
          : `<div style="text-align:center;padding:3rem;color:var(--muted);font-size:.82rem;">No AI prediction data yet.</div>`}
      </div>
      <div class="card">
        <div style="font-weight:700;font-size:1rem;margin-bottom:.15rem;">Inventory Stock Health</div>
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:1rem;">Current levels · 🟢 OK &nbsp;🟡 Low &nbsp;🔴 Out</div>
        ${inventory.length
          ? `<canvas id="inventoryChart" height="130"></canvas>`
          : `<div style="text-align:center;padding:3rem;color:var(--muted);font-size:.82rem;">No inventory items yet.</div>`}
      </div>
    </div>

    <!-- TODAY'S TASKS -->
    <p style="font-size:.68rem;font-weight:700;color:var(--muted);letter-spacing:.07em;text-transform:uppercase;margin-bottom:.6rem;">📋 Today's Deployed Tasks — ${todayLabel}</p>
    <div class="card" style="margin-bottom:1rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
        <div style="font-weight:700;font-size:1rem;">Tasks Deployed Today</div>
        <div style="display:flex;gap:.5rem;">
          <span class="badge badge-green">${todayTasks.filter(t=>t.status==='completed'||t.completed).length} completed</span>
          <span class="badge badge-blue">${todayTasks.filter(t=>t.status==='in-progress').length} in progress</span>
          <span class="badge badge-orange">${todayTasks.filter(t=>t.status==='pending'&&!t.completed).length} pending</span>
        </div>
      </div>
      ${todayTasks.length ? `
        <table>
          <thead>
            <tr><th>Task</th><th>Assigned Worker</th><th>Priority</th><th>Status</th><th>Time</th><th>Progress</th></tr>
          </thead>
          <tbody>
            ${todayTasks.map(t => `
              <tr>
                <td style="font-weight:500;">${t.title}</td>
                <td style="color:var(--muted);">${t.worker||'—'}</td>
                <td><span class="${prioClass[t.priority]||'priority-low'}">● ${t.priority||'Low'}</span></td>
                <td><span class="badge" style="background:${statusBg[t.status]||'#fef3c7'};color:${statusText[t.status]||'#92400e'};">${t.status||'pending'}</span></td>
                <td style="color:var(--muted);">${t.time||'—'}</td>
                <td style="min-width:110px;">
                  <div style="display:flex;align-items:center;gap:.5rem;">
                    <div class="progress-bar" style="flex:1;">
                      <div class="progress-fill${statusBar[t.status]||' red'}" style="width:${t.progress_pct||0}%;"></div>
                    </div>
                    <span style="font-size:.7rem;font-weight:600;color:var(--muted);min-width:28px;">${t.progress_pct||0}%</span>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>`
      : `<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.82rem;">No tasks deployed for today.</div>`}
    </div>

    <!-- BOTTOM ROW -->
    <div style="display:grid;grid-template-columns:1.5fr 1fr 0.9fr;gap:1rem;margin-bottom:1rem;">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
          <div style="font-weight:700;font-size:1rem;">Recent Activity</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:.85rem;">
          ${activity.map(a => `
            <div style="display:flex;align-items:flex-start;gap:.75rem;">
              <div style="width:8px;height:8px;border-radius:50%;background:${a.dot};flex-shrink:0;margin-top:5px;"></div>
              <div>
                <div style="font-size:.82rem;font-weight:500;line-height:1.4;">${a.text}</div>
                <div style="font-size:.72rem;color:var(--muted);">${a.time}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
          <div style="font-weight:700;font-size:1rem;">Notifications</div>
          <span class="badge badge-red">${notifications.filter(n=>n.urgent).length} urgent</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:.6rem;">
          ${notifications.map(n => `
            <div style="display:flex;align-items:flex-start;gap:.65rem;padding:.6rem .75rem;background:${n.urgent?'#fff5f5':'#fafafa'};border:1px solid ${n.urgent?'#fecaca':'var(--border)'};border-radius:8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${n.stroke}" stroke-width="2.5" style="flex-shrink:0;margin-top:1px;">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span style="font-size:.78rem;line-height:1.4;">${n.text}</span>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div style="font-weight:700;font-size:1rem;margin-bottom:.15rem;">Priority Breakdown</div>
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:.75rem;">All tasks by level</div>
        <div style="display:flex;align-items:center;justify-content:center;height:130px;">
          <canvas id="priorityChart" style="max-width:130px;max-height:130px;"></canvas>
        </div>
        <div style="display:flex;flex-direction:column;gap:.5rem;margin-top:.75rem;">
          ${[
            { color:'#ef4444', label:'High',   count: priorityCounts.High   },
            { color:'#f59e0b', label:'Medium', count: priorityCounts.Medium },
            { color:'#22c55e', label:'Low',    count: priorityCounts.Low    },
          ].map(p => `
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:.4rem;font-size:.78rem;">
                <span style="width:9px;height:9px;background:${p.color};border-radius:50%;display:inline-block;"></span>${p.label}
              </div>
              <span style="font-size:.78rem;font-weight:700;">${p.count} tasks</span>
            </div>`).join('')}
        </div>
      </div>
    </div>
  `;

  // ── CHARTS ───────────────────────────────────────────────────
  const cropColors  = { Rice:'#22c55e', Corn:'#3b82f6', Vegetables:'#f59e0b' };
  const extraColors = ['#8b5cf6','#ef4444','#f97316'];

  // Chart 1: Yield Trends (actual vs simple target)
  if (preds.length && document.getElementById('yieldChart')) {
    const yieldActual = new Array(12).fill(0);
    preds.forEach(p => {
      const m = new Date(p.created_at).getMonth();
      yieldActual[m] += (p.per_ha_yield||0) * (p.land_area||1);
    });
    const maxY = Math.max(...yieldActual.filter(v=>v>0)) || 5;
    const target = yieldActual.map((_,i) => parseFloat((maxY * 0.85 * (i+1)/12).toFixed(2)));
    new Chart(document.getElementById('yieldChart'), {
      type:'line',
      data:{
        labels: vm,
        datasets:[
          { label:'Actual Yield', data:yieldActual.slice(0,vm.length), borderColor:'#2D5A27', backgroundColor:'rgba(45,90,39,0.06)', tension:.4, pointRadius:4, pointBackgroundColor:'#2D5A27', fill:true, borderWidth:2 },
          { label:'Target',       data:target.slice(0,vm.length),      borderColor:'#A8C69F', borderDash:[5,5], tension:.4, pointRadius:3, pointBackgroundColor:'#A8C69F', borderWidth:1.5 },
        ]
      },
      options:{ plugins:{ legend:{ labels:{ font:cf, boxWidth:18, padding:14 }}, tooltip:tip }, scales:{ x:{ grid:{ display:false }, ticks:{ font:cf }}, y:{ grid:{ color:'#f3f4f6' }, ticks:{ font:cf }}}, responsive:true }
    });
  }

  // Chart 2: CRM Contacts by type (monthly)
  if (crm.length && document.getElementById('crmChart')) {
    const crmMonthly = { Buyer: new Array(12).fill(0), Supplier: new Array(12).fill(0), Partner: new Array(12).fill(0) };
    crm.forEach(c => {
      const m = new Date(c.created_at).getMonth();
      if (crmMonthly[c.type] !== undefined) crmMonthly[c.type][m]++;
    });
    new Chart(document.getElementById('crmChart'), {
      type: 'bar',
      data: {
        labels: vm,
        datasets: [
          { label:'Buyers',    data: crmMonthly.Buyer.slice(0,vm.length),    backgroundColor:'#3b82f6', borderRadius:4, borderSkipped:false },
          { label:'Suppliers', data: crmMonthly.Supplier.slice(0,vm.length), backgroundColor:'#22c55e', borderRadius:4, borderSkipped:false },
          { label:'Partners',  data: crmMonthly.Partner.slice(0,vm.length),  backgroundColor:'#8b5cf6', borderRadius:4, borderSkipped:false },
        ]
      },
      options:{ plugins:{ legend:{ labels:{ font:cf, boxWidth:12, padding:14 }}, tooltip:tip }, scales:{ x:{ grid:{ display:false }, ticks:{ font:cf }}, y:{ grid:{ color:'#f3f4f6' }, ticks:{ font:cf, stepSize:1 }}}, responsive:true }
    });
  }

  // Chart 3: Task Completion Rate — grouped bars
  if (tasks.length && document.getElementById('taskCompChart')) {
    new Chart(document.getElementById('taskCompChart'), {
      type:'bar',
      data:{
        labels: vm,
        datasets:[
          { label:'Completed', data:taskMonthly.completed.slice(0,vm.length), backgroundColor:'#22c55e', borderRadius:4, borderSkipped:false },
          { label:'Pending',   data:taskMonthly.pending.slice(0,vm.length),   backgroundColor:'#fbbf24', borderRadius:4, borderSkipped:false },
        ]
      },
      options:{
        plugins:{ legend:{ labels:{ font:cf, boxWidth:12, padding:12 }}, tooltip:tip },
        scales:{ x:{ grid:{ display:false }, ticks:{ font:cf }}, y:{ grid:{ color:'#f3f4f6' }, ticks:{ font:cf }}},
        responsive:true
      }
    });
  }

  // Chart 4: Worker Attendance — grouped bars
  if (attend.length && document.getElementById('attendChart')) {
    new Chart(document.getElementById('attendChart'), {
      type:'bar',
      data:{
        labels: vm,
        datasets:[
          { label:'Present', data:attendPercents.present.slice(0,vm.length), backgroundColor:'#22c55e', borderRadius:4, borderSkipped:false },
          { label:'Late',    data:attendPercents.late.slice(0,vm.length),    backgroundColor:'#f59e0b', borderRadius:4, borderSkipped:false },
          { label:'Absent',  data:attendPercents.absent.slice(0,vm.length),  backgroundColor:'#ef4444', borderRadius:4, borderSkipped:false },
        ]
      },
      options:{
        plugins:{ legend:{ labels:{ font:cf, boxWidth:12, padding:12 }}, tooltip:{ ...tip, callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` }}},
        scales:{ x:{ grid:{ display:false }, ticks:{ font:cf }}, y:{ grid:{ color:'#f3f4f6' }, ticks:{ font:cf, callback: v => v+'%' }, max:100 }},
        responsive:true
      }
    });
  }

  // Chart 5: Yield Over Time by crop
  if (preds.length && document.getElementById('yieldTimeChart')) {
    new Chart(document.getElementById('yieldTimeChart'), {
      type:'line',
      data:{
        labels: vm,
        datasets: crops.map((crop, i) => ({
          label: crop,
          data: yieldByCrop[crop].slice(0, vm.length),
          borderColor: cropColors[crop] || extraColors[i % extraColors.length],
          tension:.4, pointRadius:4,
          pointBackgroundColor: cropColors[crop] || extraColors[i % extraColors.length],
          borderWidth:2, fill:false,
        }))
      },
      options:{
        plugins:{ legend:{ labels:{ font:cf, boxWidth:16, padding:14 }}, tooltip:{ ...tip, callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} kg` }}},
        scales:{ x:{ grid:{ display:false }, ticks:{ font:cf }}, y:{ grid:{ color:'#f3f4f6' }, ticks:{ font:cf, callback: v => v>=1000?(v/1000).toFixed(1)+'k':v }}},
        responsive:true
      }
    });
  }

  // Chart 6: Inventory Stock Health
  if (inventory.length && document.getElementById('inventoryChart')) {
    new Chart(document.getElementById('inventoryChart'), {
      type:'bar',
      data:{
        labels: inventory.map(i => i.name.length > 18 ? i.name.slice(0,18)+'…' : i.name),
        datasets:[{
          label:'Qty',
          data: inventory.map(i => i.qty),
          backgroundColor: inventory.map(i =>
            i.status==='in-stock' ? '#22c55e' : i.status==='low-stock' ? '#f59e0b' : '#ef4444'
          ),
          borderRadius:4, borderSkipped:false
        }]
      },
      options:{ indexAxis:'y', plugins:{ legend:{ display:false }, tooltip:{ ...tip, callbacks:{ label: ctx => ` ${ctx.parsed.x} ${inventory[ctx.dataIndex]?.unit||''}` }}}, scales:{ x:{ grid:{ color:'#f3f4f6' }, ticks:{ font:cf }}, y:{ grid:{ display:false }, ticks:{ font:{ family:'Poppins', size:9 }}}}, responsive:true }
    });
  }

  // Chart 7: Priority Doughnut
  if (document.getElementById('priorityChart')) {
    new Chart(document.getElementById('priorityChart'), {
      type:'doughnut',
      data:{
        labels:['High','Medium','Low'],
        datasets:[{
          data:[priorityCounts.High, priorityCounts.Medium, priorityCounts.Low],
          backgroundColor:['#ef4444','#f59e0b','#22c55e'],
          borderWidth:2, borderColor:'#fff', hoverOffset:4
        }]
      },
      options:{ plugins:{ legend:{ display:false }, tooltip:tip }, cutout:'62%', responsive:true }
    });
  }

  // ── Real-time updates ────────────────────────────────────────
  ['tasks','attendance','inventory_items','ai_predictions','crm_contacts'].forEach(table => {
    db.channel(`dashboard-${table}`)
      .on('postgres_changes', { event:'*', schema:'public', table }, () => loadDashboard())
      .subscribe();
  });
}

// ── Kick off ─────────────────────────────────────────────────────
loadDashboard();