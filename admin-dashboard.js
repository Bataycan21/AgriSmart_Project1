// ================================================================
// admin-dashboard.js  –  AgriSmart Admin Dashboard
// ================================================================
//
// ── SUPABASE TABLES USED ─────────────────────────────────────────
//
//  crops            → id, name, created_at
//  inventory_items  → id, name, cat, qty, unit, status
//  workers          → id, name, status ('active'|'inactive')
//  ai_predictions   → id, crop, per_ha_yield, land_area, created_at
//  tasks            → id, title, worker, priority, status, created_at, time
//  attendance       → id, worker_id, status ('present'|'late'|'absent'), date
//  activity_log     → id, text, dot_color, created_at
//  notifications    → id, text, stroke_color, urgent, created_at
//
// ── SUPABASE CONNECTION ──────────────────────────────────────────
//
// TODO: import your supabase client at the top:
//   import { createClient } from '@supabase/supabase-js'
//   const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
//
// ── STAT CARDS ───────────────────────────────────────────────────
//
// Total Crops:
//   const { count: totalCrops } = await db
//     .from('crops')
//     .select('*', { count: 'exact', head: true })
//   → replace DATA.stats[0].num with totalCrops
//
// Inventory Items:
//   const { count: totalInv } = await db
//     .from('inventory_items')
//     .select('*', { count: 'exact', head: true })
//   → replace DATA.stats[1].num with totalInv.toLocaleString()
//
// Active Workers:
//   const { count: activeWorkers } = await db
//     .from('workers')
//     .select('*', { count: 'exact', head: true })
//     .eq('status', 'active')
//   → replace DATA.stats[2].num with activeWorkers
//
// Predicted Yield:
//   const { data: predictions } = await db
//     .from('ai_predictions')
//     .select('per_ha_yield, land_area')
//   const totalYield = predictions.reduce((s,p) => s + p.per_ha_yield * p.land_area, 0)
//   → replace DATA.stats[3].num with totalYield.toFixed(1) + 'T'
//
// ── KPI STRIP ────────────────────────────────────────────────────
//
// Total Yield YTD:
//   const { data: yieldRows } = await db
//     .from('ai_predictions')
//     .select('per_ha_yield, land_area, created_at')
//     .gte('created_at', `${new Date().getFullYear()}-01-01`)
//   const ytd = yieldRows.reduce((s,p) => s + p.per_ha_yield * p.land_area, 0)
//   → replace DATA.kpis[0].val with ytd.toFixed(1) + ' T'
//
// Task Completion Rate:
//   const { count: totalTasks } = await db
//     .from('tasks')
//     .select('*', { count: 'exact', head: true })
//   const { count: doneTasks } = await db
//     .from('tasks')
//     .select('*', { count: 'exact', head: true })
//     .eq('status', 'completed')
//   const rate = Math.round((doneTasks / totalTasks) * 100)
//   → replace DATA.kpis[1].val with rate + '%'
//   → replace DATA.kpis[1].sub with `${doneTasks} of ${totalTasks} tasks done`
//
// Avg Attendance Rate:
//   const { data: attendRows } = await db
//     .from('attendance')
//     .select('status')
//   const present = attendRows.filter(r => r.status === 'present').length
//   const avgAtt  = Math.round((present / attendRows.length) * 100)
//   → replace DATA.kpis[2].val with avgAtt + '%'
//
// Inventory Alerts:
//   const { count: lowStock } = await db
//     .from('inventory_items')
//     .select('*', { count: 'exact', head: true })
//     .eq('status', 'low-stock')
//   const { count: outStock } = await db
//     .from('inventory_items')
//     .select('*', { count: 'exact', head: true })
//     .eq('status', 'out-of-stock')
//   → replace DATA.kpis[3].val with (lowStock + outStock)
//   → replace DATA.kpis[3].sub with `${lowStock} low · ${outStock} out of stock`
//
// ── CHARTS ───────────────────────────────────────────────────────
//
// Yield Trends (actual vs target):
//   const { data: yieldTrend } = await db
//     .from('ai_predictions')
//     .select('per_ha_yield, land_area, created_at')
//     .order('created_at', { ascending: true })
//   Group by month → map to DATA.charts.yield.actual[]
//   Target line is your own static goal array or a separate 'yield_targets' table
//
// Production Costs:
//   const { data: costs } = await db
//     .from('production_costs')
//     .select('month, equipment, labor, seeds')
//     .order('month', { ascending: true })
//   → map to DATA.charts.costs.equipment[], .labor[], .seeds[]
//
// Task Completion Rate chart:
//   const { data: taskRows } = await db
//     .from('tasks')
//     .select('status, created_at')
//   Group by month → count completed vs pending per month
//   → map to DATA.charts.taskComp.completed[], .pending[]
//
// Worker Attendance chart:
//   const { data: attendMonthly } = await db
//     .from('attendance')
//     .select('status, date')
//     .gte('date', `${new Date().getFullYear()}-01-01`)
//   Group by month → calculate present/late/absent %
//   → map to DATA.charts.attendance.present[], .late[], .absent[]
//
// Yield Over Time by crop:
//   const { data: cropYield } = await db
//     .from('ai_predictions')
//     .select('crop, per_ha_yield, land_area, created_at')
//     .order('created_at', { ascending: true })
//   Group by crop + month → sum per_ha_yield * land_area * 1000
//   → map to DATA.charts.yieldByC.rice[], .corn[], .vegetables[]
//
// Inventory Stock Health:
//   const { data: invItems } = await db
//     .from('inventory_items')
//     .select('name, qty, status')
//   → map names  to DATA.charts.inventory.labels[]
//   → map qty    to DATA.charts.inventory.data[]
//   → map status to DATA.charts.inventory.colors[]
//     ('in-stock' → '#22c55e', 'low-stock' → '#f59e0b', 'out-of-stock' → '#ef4444')
//
// Priority Breakdown donut:
//   const { data: prioRows } = await db
//     .from('tasks')
//     .select('priority')
//   Count per priority level
//   → replace DATA.priority.High, .Medium, .Low
//
// ── TODAY'S TASKS ────────────────────────────────────────────────
//
//   const today = new Date().toISOString().split('T')[0]
//   const { data: todayTasks } = await db
//     .from('tasks')
//     .select('title, worker, priority, status, time, progress_pct')
//     .eq('date', today)
//     .order('time', { ascending: true })
//   → replace DATA.tasks[] with todayTasks
//     (map: title → task, progress_pct → pct)
//
// ── RECENT ACTIVITY ──────────────────────────────────────────────
//
//   const { data: actRows } = await db
//     .from('activity_log')
//     .select('text, dot_color, created_at')
//     .order('created_at', { ascending: false })
//     .limit(6)
//   → replace DATA.activity[] with actRows
//     (map: dot_color → dot, created_at → human-readable time)
//
// ── NOTIFICATIONS ────────────────────────────────────────────────
//
//   const { data: notifRows } = await db
//     .from('notifications')
//     .select('text, stroke_color, urgent, created_at')
//     .order('urgent', { ascending: false })
//     .order('created_at', { ascending: false })
//     .limit(5)
//   → replace DATA.notifications[] with notifRows
//     (map: stroke_color → stroke)
//
// ── REAL-TIME UPDATES ────────────────────────────────────────────
//
//   ['tasks','attendance','inventory_items','ai_predictions','activity_log','notifications']
//     .forEach(table => db.channel(`dashboard-${table}`)
//       .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
//         // re-fetch the affected DATA section and call the matching render function
//         // e.g. for tasks: re-fetch → update DATA.tasks → re-render tbody + badges
//       })
//       .subscribe()
//     )
//
// ── SUGGESTED LOAD PATTERN ───────────────────────────────────────
//
//   async function loadDashboard() {
//     await Promise.all([
//       fetchStats(),        // fills DATA.stats nums
//       fetchKpis(),         // fills DATA.kpis vals
//       fetchChartData(),    // fills DATA.charts
//       fetchTodayTasks(),   // fills DATA.tasks
//       fetchActivity(),     // fills DATA.activity
//       fetchNotifications() // fills DATA.notifications
//     ])
//     renderAll()            // calls renderShell + injects pageContent
//     initCharts()           // calls all new Chart(...)
//   }
//
//   loadDashboard()
//
// ================================================================

renderShell('dashboard');

// ══════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════

const DATA = {
  stats: [
    { bg:'#f0fdf4', stroke:'#2D5A27', color:'',       trend:'▲ +3 this month',   trendColor:'#22c55e', num:'24',    label:'Total Crops'      },
    { bg:'#eff6ff', stroke:'#3b82f6', color:'blue',   trend:'▲ +12% this month', trendColor:'#22c55e', num:'1,247', label:'Inventory Items'  },
    { bg:'#fff7ed', stroke:'#f59e0b', color:'orange',  trend:'▼ -2 this month',   trendColor:'#ef4444', num:'38',    label:'Active Workers'   },
    { bg:'#faf5ff', stroke:'#8b5cf6', color:'purple',  trend:'▲ +8% forecast',    trendColor:'#22c55e', num:'4.2T',  label:'Predicted Yield'  },
  ],

  statIcons: {
    'Total Crops':     `<path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2"/>`,
    'Inventory Items': `<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>`,
    'Active Workers':  `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
    'Predicted Yield': `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>`,
  },

  kpis: [
    { icon:'🌾', bg:'#f0fdf4', valColor:'#2D5A27', val:'152.4 T', name:'Total Yield YTD',  sub:'From AI Predictions'    },
    { icon:'✅', bg:'#f0fdf4', valColor:'#22c55e', val:'76%',     name:'Task Completion',  sub:'26 of 34 tasks done'    },
    { icon:'👷', bg:'#eff6ff', valColor:'#3b82f6', val:'83%',     name:'Avg Attendance',   sub:'Across all workers'     },
    { icon:'📦', bg:'#fffbeb', valColor:'#f59e0b', val:'3',       name:'Inventory Alerts', sub:'2 low · 1 out of stock' },
  ],

  // TODO: SUPABASE — replace with live query:
  // const today = new Date().toISOString().split('T')[0]
  // const { data } = await db.from('tasks')
  //   .select('title, worker, priority, status, time, progress_pct')
  //   .eq('date', today).order('time', { ascending: true })
  // map: title → task, progress_pct → pct
  tasks: [
    { task:'Apply Fertilizer to Corn Fields',   worker:'Juan Dela Cruz', priority:'High',   status:'completed',   time:'6:00 AM',  pct:100 },
    { task:'Irrigation Check – Rice Paddies',   worker:'Maria Clara',    priority:'High',   status:'completed',   time:'7:30 AM',  pct:100 },
    { task:'Harvest Vegetables – Block C',      worker:'Pedro Santos',   priority:'Medium', status:'completed',   time:'8:00 AM',  pct:100 },
    { task:'Pest Inspection – Corn Season 2',   worker:'Carlos Garcia',  priority:'High',   status:'in-progress', time:'9:00 AM',  pct:65  },
    { task:'Restock Urea Fertilizer',           worker:'Ana Reyes',      priority:'Medium', status:'in-progress', time:'10:00 AM', pct:40  },
    { task:'Update Inventory – Rice Seeds',     worker:'Lisa Tan',       priority:'Low',    status:'completed',   time:'11:00 AM', pct:100 },
    { task:'Attendance Verification – Workers', worker:'Admin',          priority:'Medium', status:'pending',     time:'—',        pct:0   },
  ],

  // TODO: SUPABASE — replace with live query:
  // const { data } = await db.from('activity_log')
  //   .select('text, dot_color, created_at')
  //   .order('created_at', { ascending: false }).limit(6)
  // map: dot_color → dot, created_at → human-readable time
  activity: [
    { dot:'#22c55e', text:'Inventory updated: 500kg Rice Seeds added',       time:'2 min ago'   },
    { dot:'#3b82f6', text:'Worker Juan marked Time In at 7:02 AM',           time:'1 hour ago'  },
    { dot:'#f59e0b', text:'Low stock alert: Organic Pesticide at 0 units',   time:'2 hours ago' },
    { dot:'#8b5cf6', text:'AI Prediction generated for Corn Season 2',       time:'3 hours ago' },
    { dot:'#22c55e', text:'Task completed: Apply Fertilizer to Corn Fields', time:'5 hours ago' },
    { dot:'#ef4444', text:'3 workers pending attendance verification',        time:'Yesterday'   },
  ],

  // TODO: SUPABASE — replace with live query:
  // const { data } = await db.from('notifications')
  //   .select('text, stroke_color, urgent, created_at')
  //   .order('urgent', { ascending: false })
  //   .order('created_at', { ascending: false }).limit(5)
  // map: stroke_color → stroke
  notifications: [
    { urgent:true,  stroke:'#ef4444', text:'Low inventory: Fertilizer stock below 50 units' },
    { urgent:true,  stroke:'#ef4444', text:'Weather alert: Heavy rain expected tomorrow'    },
    { urgent:false, stroke:'#f59e0b', text:'3 workers pending attendance verification'      },
    { urgent:false, stroke:'#3b82f6', text:'New AI yield prediction ready for review'       },
    { urgent:false, stroke:'#6b7280', text:'Monthly analytics report is available'          },
  ],

  // TODO: SUPABASE — replace with live query:
  // const { data } = await db.from('tasks').select('priority')
  // count each priority level → replace High, Medium, Low below
  priority: { High: 12, Medium: 13, Low: 9 },

  charts: {
    // TODO: SUPABASE — ai_predictions grouped by month
    // actual: group by month → sum per_ha_yield * land_area
    // target: from 'yield_targets' table or static array
    yield: {
      actual: [2.5,2.8,3.0,2.9,3.3,3.5,3.7,4.0],
      target: [2.2,2.6,2.9,3.1,3.2,3.4,3.6,3.8],
    },

    // TODO: SUPABASE — production_costs table
    // select month, equipment, labor, seeds → order by month asc
    costs: {
      equipment: [4500,4200,3800,3200,4000,4800],
      labor:     [12000,13000,14000,12000,12500,16000],
      seeds:     [8000,9500,8500,7500,7800,8200],
    },

    // TODO: SUPABASE — tasks table
    // select status, created_at → group by month
    // count completed vs (pending + in-progress) per month
    taskComp: {
      completed: [3,3,4,4,5,4,4,3],
      pending:   [1,1,1,1,1,1,1,1],
    },

    // TODO: SUPABASE — attendance table
    // select status, date → group by month
    // calculate present/late/absent as % of total per month
    attendance: {
      present: [83,83,83,83,83,83,83,83],
      late:    [11,11,11,11,11,11,11,11],
      absent:  [6,6,6,6,6,6,6,6],
    },

    // TODO: SUPABASE — ai_predictions table
    // select crop, per_ha_yield, land_area, created_at
    // group by crop + month → sum per_ha_yield * land_area * 1000
    yieldByC: {
      rice:       [7600,7800,8000,8000,8200,8400,8000,8000],
      corn:       [9000,9000,9400,9600,10000,10000,10400,11000],
      vegetables: [12000,12000,12000,12500,12500,13000,13000,13500],
    },

    // TODO: SUPABASE — inventory_items table
    // select name, qty, status
    // colors: 'in-stock' → '#22c55e', 'low-stock' → '#f59e0b', 'out-of-stock' → '#ef4444'
    inventory: {
      labels: ['Rice Seeds','Urea Fert.','Corn Seeds','Org. Pesticide','Tractor Fuel','Irrig. Tubes','NPK Fert.','Veg. Seeds'],
      data:   [500, 35, 320, 0, 150, 80, 22, 100],
      colors: ['#22c55e','#f59e0b','#22c55e','#ef4444','#22c55e','#22c55e','#f59e0b','#22c55e'],
    },
  },
};

// ══════════════════════════════════════════════════
// RENDER HELPERS
// ══════════════════════════════════════════════════

const statusBg   = { completed:'#dcfce7', 'in-progress':'#dbeafe', pending:'#fef3c7' };
const statusText = { completed:'#166534', 'in-progress':'#1e40af', pending:'#92400e' };
const statusBar  = { completed:'',        'in-progress':' orange', pending:' red'    };
const prioClass  = { High:'priority-high', Medium:'priority-med',  Low:'priority-low' };

function renderStatCards() {
  return DATA.stats.map(s => `
    <div class="stat-card" style="text-align:left;display:flex;align-items:center;gap:1rem;">
      <div style="width:46px;height:46px;background:${s.bg};border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${s.stroke}" stroke-width="2">${DATA.statIcons[s.label]}</svg>
      </div>
      <div>
        <div style="font-size:.7rem;color:${s.trendColor};font-weight:600;margin-bottom:.1rem;">${s.trend}</div>
        <div class="stat-num ${s.color}">${s.num}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    </div>`).join('');
}

function renderKpis() {
  return DATA.kpis.map(k => `
    <div class="card" style="display:flex;align-items:center;gap:.85rem;padding:1rem 1.1rem;">
      <div style="width:40px;height:40px;background:${k.bg};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">${k.icon}</div>
      <div>
        <div style="font-size:1.2rem;font-weight:700;color:${k.valColor};line-height:1.1;">${k.val}</div>
        <div style="font-size:.7rem;font-weight:600;color:var(--text);margin-top:.05rem;">${k.name}</div>
        <div style="font-size:.65rem;color:var(--muted);">${k.sub}</div>
      </div>
    </div>`).join('');
}

function renderTasks() {
  return DATA.tasks.map(t => `
    <tr>
      <td style="font-weight:500;">${t.task}</td>
      <td style="color:var(--muted);">${t.worker}</td>
      <td><span class="${prioClass[t.priority]}">● ${t.priority}</span></td>
      <td><span class="badge" style="background:${statusBg[t.status]};color:${statusText[t.status]};">${t.status}</span></td>
      <td style="color:var(--muted);">${t.time}</td>
      <td style="min-width:110px;">
        <div style="display:flex;align-items:center;gap:.5rem;">
          <div class="progress-bar" style="flex:1;">
            <div class="progress-fill${statusBar[t.status]}" style="width:${t.pct}%;"></div>
          </div>
          <span style="font-size:.7rem;font-weight:600;color:var(--muted);min-width:28px;">${t.pct}%</span>
        </div>
      </td>
    </tr>`).join('');
}

function renderActivity() {
  return DATA.activity.map(a => `
    <div style="display:flex;align-items:flex-start;gap:.75rem;">
      <div style="width:8px;height:8px;border-radius:50%;background:${a.dot};flex-shrink:0;margin-top:5px;"></div>
      <div>
        <div style="font-size:.82rem;font-weight:500;line-height:1.4;">${a.text}</div>
        <div style="font-size:.72rem;color:var(--muted);">${a.time}</div>
      </div>
    </div>`).join('');
}

function renderNotifications() {
  return DATA.notifications.map(n => `
    <div style="display:flex;align-items:flex-start;gap:.65rem;padding:.6rem .75rem;background:${n.urgent?'#fff5f5':'#fafafa'};border:1px solid ${n.urgent?'#fecaca':'var(--border)'};border-radius:8px;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${n.stroke}" stroke-width="2.5" style="flex-shrink:0;margin-top:1px;">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span style="font-size:.78rem;line-height:1.4;">${n.text}</span>
    </div>`).join('');
}

function renderPriorityLegend() {
  return [
    { color:'#ef4444', label:'High',   count: DATA.priority.High   },
    { color:'#f59e0b', label:'Medium', count: DATA.priority.Medium },
    { color:'#22c55e', label:'Low',    count: DATA.priority.Low    },
  ].map(p => `
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:.4rem;font-size:.78rem;">
        <span style="width:9px;height:9px;background:${p.color};border-radius:50%;display:inline-block;"></span>${p.label}
      </div>
      <span style="font-size:.78rem;font-weight:700;">${p.count} tasks</span>
    </div>`).join('');
}

function taskBadges() {
  const done = DATA.tasks.filter(t => t.status === 'completed').length;
  const prog = DATA.tasks.filter(t => t.status === 'in-progress').length;
  const pend = DATA.tasks.filter(t => t.status === 'pending').length;
  return `
    <span class="badge badge-green">${done} completed</span>
    <span class="badge badge-blue">${prog} in progress</span>
    <span class="badge badge-orange">${pend} pending</span>`;
}

// ══════════════════════════════════════════════════
// INJECT HTML
// ══════════════════════════════════════════════════

document.getElementById('pageContent').innerHTML = `

  <div style="display:flex;align-items:flex-start;justify-content:space-between;">
    <div>
      <h1 class="page-title">Dashboard</h1>
      <p class="page-subtitle">Farm overview and key metrics</p>
    </div>
    <div style="display:flex;align-items:center;gap:.6rem;margin-top:.2rem;">
      <span style="font-size:.75rem;color:var(--muted);background:var(--white);border:1px solid var(--border);padding:.3rem .75rem;border-radius:8px;">📅 March 5, 2026</span>
      <button class="btn btn-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export
      </button>
    </div>
  </div>

  <!-- STAT CARDS -->
  <div class="stats-row">${renderStatCards()}</div>

  <!-- KPI STRIP -->
  <p style="font-size:.68rem;font-weight:700;color:var(--muted);letter-spacing:.07em;text-transform:uppercase;margin:1.5rem 0 .6rem;">📊 Analytics Overview — Connected from All Modules</p>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.85rem;margin-bottom:1.5rem;">${renderKpis()}</div>

  <!-- CHARTS ROW 1 -->
  <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:1rem;margin-bottom:1rem;">
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:.15rem;">Yield Trends</div>
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:1rem;">Monthly yield vs target (tons)</div>
      <canvas id="yieldChart" height="140"></canvas>
    </div>
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:.15rem;">Production Costs</div>
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:1rem;">Monthly cost breakdown (PHP)</div>
      <canvas id="costChart" height="140"></canvas>
    </div>
  </div>

  <!-- CHARTS ROW 2 -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.15rem;">
        <div style="font-weight:700;font-size:1rem;">Task Completion Rate</div>
        <span class="badge badge-green">76% overall</span>
      </div>
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:.85rem;">Monthly completed vs pending · from Tasks</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:.85rem;">
        <div style="background:#f9fafb;border-radius:8px;padding:.5rem;text-align:center;">
          <div style="font-size:1.1rem;font-weight:700;">${DATA.tasks.length}</div>
          <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Total</div>
        </div>
        <div style="background:#f0fdf4;border-radius:8px;padding:.5rem;text-align:center;">
          <div style="font-size:1.1rem;font-weight:700;color:#22c55e;">${DATA.tasks.filter(t=>t.status==='completed').length}</div>
          <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Completed</div>
        </div>
        <div style="background:#fffbeb;border-radius:8px;padding:.5rem;text-align:center;">
          <div style="font-size:1.1rem;font-weight:700;color:#f59e0b;">${DATA.tasks.filter(t=>t.status!=='completed').length}</div>
          <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Pending</div>
        </div>
      </div>
      <canvas id="taskCompChart" height="130"></canvas>
    </div>
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:.15rem;">Worker Attendance Rate</div>
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:.85rem;">Monthly attendance % · from Attendance records</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:.85rem;">
        <div style="background:#f0fdf4;border-radius:8px;padding:.5rem;text-align:center;">
          <div style="font-size:1.1rem;font-weight:700;color:#22c55e;">83%</div>
          <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Avg Present</div>
        </div>
        <div style="background:#fffbeb;border-radius:8px;padding:.5rem;text-align:center;">
          <div style="font-size:1.1rem;font-weight:700;color:#f59e0b;">11%</div>
          <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Avg Late</div>
        </div>
        <div style="background:#fee2e2;border-radius:8px;padding:.5rem;text-align:center;">
          <div style="font-size:1.1rem;font-weight:700;color:#ef4444;">6%</div>
          <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Avg Absent</div>
        </div>
      </div>
      <canvas id="attendChart" height="130"></canvas>
    </div>
  </div>

  <!-- CHARTS ROW 3 -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:.15rem;">Yield Over Time</div>
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:1rem;">Monthly crop yield in kg · from AI Predictions</div>
      <canvas id="yieldTimeChart" height="130"></canvas>
    </div>
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:.15rem;">Inventory Stock Health</div>
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:1rem;">Current levels · 🟢 OK &nbsp;🟡 Low &nbsp;🔴 Out</div>
      <canvas id="inventoryChart" height="130"></canvas>
    </div>
  </div>

  <!-- TODAY'S TASKS -->
  <p style="font-size:.68rem;font-weight:700;color:var(--muted);letter-spacing:.07em;text-transform:uppercase;margin-bottom:.6rem;">📋 Today's Deployed Tasks — March 5, 2026</p>
  <div class="card" style="margin-bottom:1rem;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
      <div style="font-weight:700;font-size:1rem;">Tasks Deployed Today</div>
      <div style="display:flex;gap:.5rem;">${taskBadges()}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Task</th><th>Assigned Worker</th><th>Priority</th>
          <th>Status</th><th>Time</th><th>Progress</th>
        </tr>
      </thead>
      <tbody>${renderTasks()}</tbody>
    </table>
  </div>

  <!-- BOTTOM ROW -->
  <div style="display:grid;grid-template-columns:1.5fr 1fr 0.9fr;gap:1rem;margin-bottom:1rem;">
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
        <div style="font-weight:700;font-size:1rem;">Recent Activity</div>
        <a href="#" style="font-size:.78rem;color:var(--green-dark);font-weight:600;text-decoration:none;">View All</a>
      </div>
      <div style="display:flex;flex-direction:column;gap:.85rem;">${renderActivity()}</div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
        <div style="font-weight:700;font-size:1rem;">Notifications</div>
        <span class="badge badge-red">${DATA.notifications.filter(n=>n.urgent).length} urgent</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:.6rem;">${renderNotifications()}</div>
    </div>
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:.15rem;">Priority Breakdown</div>
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:.75rem;">All tasks by level</div>
      <div style="display:flex;align-items:center;justify-content:center;height:130px;">
        <canvas id="priorityChart" style="max-width:130px;max-height:130px;"></canvas>
      </div>
      <div style="display:flex;flex-direction:column;gap:.5rem;margin-top:.75rem;">${renderPriorityLegend()}</div>
    </div>
  </div>
`;

// ══════════════════════════════════════════════════
// CHARTS
// ══════════════════════════════════════════════════

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'];
const cf  = { family:'Poppins', size:10 };
const tip = {
  backgroundColor:'#fff', titleColor:'#1a1a1a', bodyColor:'#6b7280',
  borderColor:'#e5e7eb', borderWidth:1, padding:10,
  titleFont:{ family:'Poppins', weight:'600', size:12 },
  bodyFont:{ family:'Poppins', size:11 }
};

// TODO: SUPABASE — after connecting, call initCharts() inside loadDashboard()
// once all DATA.charts arrays have been filled from live queries

new Chart(document.getElementById('yieldChart'), {
  type: 'line',
  data: {
    labels: MONTHS,
    datasets: [
      { label:'Actual Yield', data: DATA.charts.yield.actual, borderColor:'#2D5A27', backgroundColor:'rgba(45,90,39,0.06)', tension:0.4, pointRadius:4, pointBackgroundColor:'#2D5A27', fill:true, borderWidth:2 },
      { label:'Target',       data: DATA.charts.yield.target, borderColor:'#A8C69F', borderDash:[5,5], tension:0.4, pointRadius:3, pointBackgroundColor:'#A8C69F', borderWidth:1.5 },
    ]
  },
  options: { plugins:{ legend:{ labels:{ font:cf, boxWidth:18, padding:14 }}, tooltip:tip }, scales:{ x:{ grid:{ display:false }, ticks:{ font:cf }}, y:{ grid:{ color:'#f3f4f6' }, ticks:{ font:cf }}}, responsive:true }
});

new Chart(document.getElementById('costChart'), {
  type: 'bar',
  data: {
    labels: ['Jan','Feb','Mar','Apr','May','Jun'],
    datasets: [
      { label:'Equipment', data: DATA.charts.costs.equipment, backgroundColor:'#f59e0b', borderRadius:3, borderSkipped:false },
      { label:'Labor',     data: DATA.charts.costs.labor,     backgroundColor:'#2D5A27', borderRadius:3, borderSkipped:false },
      { label:'Seeds',     data: DATA.charts.costs.seeds,     backgroundColor:'#3b82f6', borderRadius:3, borderSkipped:false },
    ]
  },
  options: { plugins:{ legend:{ labels:{ font:cf, boxWidth:12, padding:14 }}, tooltip:tip }, scales:{ x:{ grid:{ display:false }, ticks:{ font:cf }}, y:{ grid:{ color:'#f3f4f6' }, ticks:{ font:cf }}}, responsive:true }
});

new Chart(document.getElementById('taskCompChart'), {
  type: 'bar',
  data: {
    labels: MONTHS,
    datasets: [
      { label:'Completed', data: DATA.charts.taskComp.completed, backgroundColor:'#22c55e', borderRadius:4, borderSkipped:false },
      { label:'Pending',   data: DATA.charts.taskComp.pending,   backgroundColor:'#fbbf24', borderRadius:4, borderSkipped:false },
    ]
  },
  options: { plugins:{ legend:{ labels:{ font:cf, boxWidth:12, padding:12 }}, tooltip:tip }, scales:{ x:{ grid:{ display:false }, ticks:{ font:cf }, stacked:true }, y:{ grid:{ color:'#f3f4f6' }, ticks:{ font:cf }, stacked:true }}, responsive:true }
});

new Chart(document.getElementById('attendChart'), {
  type: 'bar',
  data: {
    labels: MONTHS,
    datasets: [
      { label:'Present', data: DATA.charts.attendance.present, backgroundColor:'#22c55e', borderRadius:4, borderSkipped:false },
      { label:'Late',    data: DATA.charts.attendance.late,    backgroundColor:'#f59e0b', borderRadius:4, borderSkipped:false },
      { label:'Absent',  data: DATA.charts.attendance.absent,  backgroundColor:'#ef4444', borderRadius:4, borderSkipped:false },
    ]
  },
  options: {
    plugins:{ legend:{ labels:{ font:cf, boxWidth:12, padding:12 }}, tooltip:{ ...tip, callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` }}},
    scales:{ x:{ grid:{ display:false }, ticks:{ font:cf }, stacked:true }, y:{ grid:{ color:'#f3f4f6' }, ticks:{ font:cf, callback: v => v+'%' }, stacked:true, max:100 }},
    responsive:true
  }
});

new Chart(document.getElementById('yieldTimeChart'), {
  type: 'line',
  data: {
    labels: MONTHS,
    datasets: [
      { label:'Rice',       data: DATA.charts.yieldByC.rice,       borderColor:'#22c55e', tension:.4, pointRadius:4, pointBackgroundColor:'#22c55e', borderWidth:2, fill:false },
      { label:'Corn',       data: DATA.charts.yieldByC.corn,       borderColor:'#3b82f6', tension:.4, pointRadius:4, pointBackgroundColor:'#3b82f6', borderWidth:2, fill:false },
      { label:'Vegetables', data: DATA.charts.yieldByC.vegetables, borderColor:'#f59e0b', tension:.4, pointRadius:4, pointBackgroundColor:'#f59e0b', borderWidth:2, fill:false },
    ]
  },
  options: {
    plugins:{ legend:{ labels:{ font:cf, boxWidth:16, padding:14 }}, tooltip:{ ...tip, callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} kg` }}},
    scales:{ x:{ grid:{ display:false }, ticks:{ font:cf }}, y:{ grid:{ color:'#f3f4f6' }, ticks:{ font:cf, callback: v => (v/1000).toFixed(0)+'k' }}},
    responsive:true
  }
});

new Chart(document.getElementById('inventoryChart'), {
  type: 'bar',
  data: {
    labels: DATA.charts.inventory.labels,
    datasets: [{
      label: 'Qty',
      data:  DATA.charts.inventory.data,
      backgroundColor: DATA.charts.inventory.colors,
      borderRadius: 4,
      borderSkipped: false
    }]
  },
  options: { indexAxis:'y', plugins:{ legend:{ display:false }, tooltip:tip }, scales:{ x:{ grid:{ color:'#f3f4f6' }, ticks:{ font:cf }}, y:{ grid:{ display:false }, ticks:{ font:{ family:'Poppins', size:9 }}}}, responsive:true }
});

new Chart(document.getElementById('priorityChart'), {
  type: 'doughnut',
  data: {
    labels: ['High','Medium','Low'],
    datasets: [{
      data: [DATA.priority.High, DATA.priority.Medium, DATA.priority.Low],
      backgroundColor: ['#ef4444','#f59e0b','#22c55e'],
      borderWidth: 2,
      borderColor: '#fff',
      hoverOffset: 4
    }]
  },
  options: { plugins:{ legend:{ display:false }, tooltip:tip }, cutout:'62%', responsive:true }
});