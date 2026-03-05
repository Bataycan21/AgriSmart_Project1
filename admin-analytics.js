// ================================================================
// admin-analytics.js  –  AgriSmart Unified Analytics
// Every module feeds into this page automatically.
// ================================================================
//
// ── SUPABASE TABLES USED ──────────────────────────────────────────
//
//  tasks            → completed, priority, created_at, worker
//  attendance       → status ('present'|'late'|'absent'), date, worker_id
//  inventory_items  → name, cat, qty, unit, status, last_updated
//  ai_predictions   → crop, per_ha_yield, land_area, created_at, confidence
//  crm_contacts     → id, enabled, rating, created_at
//  workers          → id, status ('active'|'inactive')
//
// ── SUPABASE CONNECTION (GitHub Copilot) ─────────────────────────
//
// TASKS:
//   const { data: taskRows } = await db.from('tasks')
//     .select('completed, priority, created_at, worker')
//
// ATTENDANCE:
//   const { data: attendRows } = await db.from('attendance')
//     .select('status, date').gte('date', `${currentYear}-01-01`)
//
// INVENTORY:
//   const { data: invRows } = await db.from('inventory_items')
//     .select('name, cat, qty, unit, status')
//
// YIELD:
//   const { data: yieldRows } = await db.from('ai_predictions')
//     .select('crop, per_ha_yield, land_area, created_at')
//     .gte('created_at', `${currentYear}-01-01`)
//
// After loading: assign results into RAW.tasks / RAW.attendance /
//   RAW.inventory / RAW.yields / RAW.crm  then call buildAll()
//   and re-init all 6 charts.
//
// REAL-TIME — subscribe so charts update the moment any module changes:
//   ['tasks','attendance','inventory_items','ai_predictions','crm_contacts']
//     .forEach(table => db.channel(`analytics-${table}`)
//       .on('postgres_changes',{event:'*',schema:'public',table}, () => location.reload())
//       .subscribe())
// ================================================================

renderShell('analytics');

// ── TODO: SUPABASE — replace static arrays with live queries ──────

const RAW = {

  // From tasks table
  tasks: [
    { completed:true,  priority:'High',   created_at:'2026-01-05', worker:'Juan Dela Cruz'  },
    { completed:false, priority:'High',   created_at:'2026-01-10', worker:'Maria Clara'     },
    { completed:true,  priority:'Medium', created_at:'2026-01-18', worker:'Pedro Santos'    },
    { completed:true,  priority:'Low',    created_at:'2026-02-02', worker:'Juan Dela Cruz'  },
    { completed:false, priority:'Medium', created_at:'2026-02-08', worker:'Carlos Garcia'   },
    { completed:true,  priority:'High',   created_at:'2026-02-14', worker:'Maria Clara'     },
    { completed:true,  priority:'Medium', created_at:'2026-02-20', worker:'Lisa Tan'        },
    { completed:false, priority:'Low',    created_at:'2026-03-01', worker:'Pedro Santos'    },
    { completed:true,  priority:'High',   created_at:'2026-03-05', worker:'Juan Dela Cruz'  },
    { completed:true,  priority:'Medium', created_at:'2026-03-10', worker:'Carlos Garcia'   },
    { completed:false, priority:'High',   created_at:'2026-03-15', worker:'Ana Reyes'       },
    { completed:true,  priority:'Low',    created_at:'2026-03-20', worker:'Lisa Tan'        },
    { completed:true,  priority:'Medium', created_at:'2026-04-03', worker:'Maria Clara'     },
    { completed:true,  priority:'High',   created_at:'2026-04-09', worker:'Juan Dela Cruz'  },
    { completed:false, priority:'Medium', created_at:'2026-04-15', worker:'Pedro Santos'    },
    { completed:true,  priority:'Low',    created_at:'2026-04-22', worker:'Carlos Garcia'   },
    { completed:true,  priority:'High',   created_at:'2026-05-02', worker:'Ana Reyes'       },
    { completed:true,  priority:'Medium', created_at:'2026-05-08', worker:'Maria Clara'     },
    { completed:false, priority:'Low',    created_at:'2026-05-14', worker:'Lisa Tan'        },
    { completed:true,  priority:'High',   created_at:'2026-05-20', worker:'Juan Dela Cruz'  },
    { completed:true,  priority:'Medium', created_at:'2026-06-03', worker:'Pedro Santos'    },
    { completed:true,  priority:'High',   created_at:'2026-06-10', worker:'Carlos Garcia'   },
    { completed:false, priority:'Medium', created_at:'2026-06-18', worker:'Maria Clara'     },
    { completed:true,  priority:'Low',    created_at:'2026-06-25', worker:'Ana Reyes'       },
    { completed:true,  priority:'High',   created_at:'2026-07-04', worker:'Lisa Tan'        },
    { completed:true,  priority:'Medium', created_at:'2026-07-11', worker:'Juan Dela Cruz'  },
    { completed:false, priority:'High',   created_at:'2026-07-19', worker:'Pedro Santos'    },
    { completed:true,  priority:'Medium', created_at:'2026-07-27', worker:'Carlos Garcia'   },
    { completed:true,  priority:'Low',    created_at:'2026-08-02', worker:'Maria Clara'     },
    { completed:true,  priority:'High',   created_at:'2026-08-08', worker:'Ana Reyes'       },
    { completed:false, priority:'Medium', created_at:'2026-08-15', worker:'Juan Dela Cruz'  },
    { completed:true,  priority:'High',   created_at:'2026-08-22', worker:'Lisa Tan'        },
  ],

  // From attendance table
  attendance: (() => {
    const out = [];
    const pattern = ['present','present','present','present','present','present','late','late','absent'];
    for (let m = 0; m < 8; m++) {
      pattern.forEach((s, d) => {
        out.push({ status:s, date:`2026-${String(m+1).padStart(2,'0')}-${String(d+1).padStart(2,'0')}` });
      });
    }
    return out;
  })(),

  // From inventory_items table
  inventory: [
    { name:'Rice Seeds (IR64)',     cat:'Seeds',      qty:500, unit:'kg',     status:'in-stock'    },
    { name:'Urea Fertilizer',       cat:'Fertilizer', qty:35,  unit:'bags',   status:'low-stock'   },
    { name:'Corn Seeds (Hybrid)',   cat:'Seeds',      qty:320, unit:'kg',     status:'in-stock'    },
    { name:'Organic Pesticide',     cat:'Pesticide',  qty:0,   unit:'liters', status:'out-of-stock'},
    { name:'Tractor Fuel',          cat:'Equipment',  qty:150, unit:'liters', status:'in-stock'    },
    { name:'Drip Irrigation Tubes', cat:'Equipment',  qty:80,  unit:'meters', status:'in-stock'    },
    { name:'NPK Fertilizer',        cat:'Fertilizer', qty:22,  unit:'bags',   status:'low-stock'   },
    { name:'Vegetable Seeds Mix',   cat:'Seeds',      qty:100, unit:'kg',     status:'in-stock'    },
  ],

  // From ai_predictions table (per_ha_yield × land_area × 1000 = kg)
  yields: [
    { crop:'Rice',       per_ha_yield:3.8,  land_area:2, created_at:'2026-01-15' },
    { crop:'Corn',       per_ha_yield:4.5,  land_area:2, created_at:'2026-01-20' },
    { crop:'Vegetables', per_ha_yield:12,   land_area:1, created_at:'2026-02-10' },
    { crop:'Rice',       per_ha_yield:3.9,  land_area:2, created_at:'2026-02-18' },
    { crop:'Corn',       per_ha_yield:4.7,  land_area:2, created_at:'2026-03-05' },
    { crop:'Rice',       per_ha_yield:4.0,  land_area:2, created_at:'2026-03-14' },
    { crop:'Vegetables', per_ha_yield:12.5, land_area:1, created_at:'2026-04-02' },
    { crop:'Corn',       per_ha_yield:4.8,  land_area:2, created_at:'2026-04-20' },
    { crop:'Rice',       per_ha_yield:4.1,  land_area:2, created_at:'2026-05-05' },
    { crop:'Corn',       per_ha_yield:5.0,  land_area:2, created_at:'2026-05-18' },
    { crop:'Vegetables', per_ha_yield:13,   land_area:1, created_at:'2026-06-08' },
    { crop:'Rice',       per_ha_yield:4.2,  land_area:2, created_at:'2026-06-22' },
    { crop:'Corn',       per_ha_yield:5.2,  land_area:2, created_at:'2026-07-10' },
    { crop:'Vegetables', per_ha_yield:13.5, land_area:1, created_at:'2026-07-25' },
    { crop:'Rice',       per_ha_yield:4.0,  land_area:2, created_at:'2026-08-05' },
    { crop:'Corn',       per_ha_yield:5.5,  land_area:2, created_at:'2026-08-20' },
  ],

  // From crm_contacts table
  crm: [
    { enabled:true,  rating:5, created_at:'2026-01-10' },
    { enabled:true,  rating:4, created_at:'2026-02-15' },
    { enabled:false, rating:3, created_at:'2026-03-20' },
    { enabled:true,  rating:5, created_at:'2026-04-05' },
    { enabled:true,  rating:4, created_at:'2026-05-12' },
    { enabled:true,  rating:3, created_at:'2026-06-18' },
    { enabled:false, rating:2, created_at:'2026-07-22' },
    { enabled:true,  rating:5, created_at:'2026-08-01' },
  ],
};

// ── DATA PROCESSORS ───────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'];

function buildTaskData() {
  const done = new Array(8).fill(0), pending = new Array(8).fill(0);
  RAW.tasks.forEach(t => {
    const m = new Date(t.created_at).getMonth();
    if (m < 8) t.completed ? done[m]++ : pending[m]++;
  });
  return { done, pending };
}

function buildPriorityData() {
  const counts = { High:0, Medium:0, Low:0 };
  RAW.tasks.forEach(t => counts[t.priority]++);
  return counts;
}

function buildAttendData() {
  const buckets = Array.from({length:8}, () => ({present:0,late:0,absent:0,total:0}));
  RAW.attendance.forEach(r => {
    const m = new Date(r.date).getMonth();
    if (m < 8) { buckets[m][r.status]++; buckets[m].total++; }
  });
  return {
    present: buckets.map(b => b.total ? Math.round((b.present/b.total)*100) : 0),
    late:    buckets.map(b => b.total ? Math.round((b.late/b.total)*100)    : 0),
    absent:  buckets.map(b => b.total ? Math.round((b.absent/b.total)*100)  : 0),
  };
}

function buildYieldData() {
  const data = { Rice: new Array(8).fill(0), Corn: new Array(8).fill(0), Vegetables: new Array(8).fill(0) };
  RAW.yields.forEach(y => {
    const m = new Date(y.created_at).getMonth();
    if (m < 8 && data[y.crop] !== undefined)
      data[y.crop][m] += Math.round(y.per_ha_yield * y.land_area * 1000);
  });
  // Forward-fill zeros for smooth lines
  Object.keys(data).forEach(c => {
    let last = 0;
    data[c] = data[c].map(v => { if (v > 0) last = v; return v > 0 ? v : last; });
  });
  return data;
}

function buildInvCatData() {
  const counts = {};
  RAW.inventory.forEach(i => { counts[i.cat] = (counts[i.cat]||0) + 1; });
  return counts;
}

function buildStockHealth() {
  return {
    inStock:    RAW.inventory.filter(i => i.status==='in-stock').length,
    lowStock:   RAW.inventory.filter(i => i.status==='low-stock').length,
    outOfStock: RAW.inventory.filter(i => i.status==='out-of-stock').length,
  };
}

// ── COMPUTE ───────────────────────────────────────────────────────
const taskMonthly  = buildTaskData();
const priorityData = buildPriorityData();
const attendData   = buildAttendData();
const yieldData    = buildYieldData();
const invCatData   = buildInvCatData();
const stockHealth  = buildStockHealth();

const totalDone    = taskMonthly.done.reduce((a,b) => a+b, 0);
const totalPending = taskMonthly.pending.reduce((a,b) => a+b, 0);
const totalTasks   = totalDone + totalPending;
const compRate     = totalTasks ? Math.round((totalDone/totalTasks)*100) : 0;
const avgAttend    = attendData.present.reduce((a,b)=>a+b,0) / attendData.present.length;
const totalYieldKg = RAW.yields.reduce((s,y) => s + y.per_ha_yield * y.land_area * 1000, 0);

// ── CHART STYLE DEFAULTS ──────────────────────────────────────────
const cf = { family:'Poppins', size:10 };
const gc = '#f3f4f6';
const tooltip = {
  backgroundColor:'#fff', titleColor:'#1a1a1a', bodyColor:'#6b7280',
  borderColor:'#e5e7eb', borderWidth:1, padding:10,
  titleFont:{family:'Poppins',weight:'600',size:12},
  bodyFont:{family:'Poppins',size:11},
};

// ── RENDER ────────────────────────────────────────────────────────
const INV_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ef4444'];

document.getElementById('pageContent').innerHTML = `

  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.5rem;">
    <div>
      <h1 class="page-title" style="margin-bottom:0;">Analytics</h1>
      <p class="page-subtitle" style="margin-bottom:0;">Live farm performance — all modules connected</p>
    </div>
    <button class="btn btn-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Export Report
    </button>
  </div>

  <div style="display:flex;gap:.75rem;margin-bottom:1.25rem;">
    <div style="position:relative;">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"
        style="position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      <select style="padding:.5rem 1.75rem .5rem 2rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;background:white;cursor:pointer;appearance:none;">
        <option>Year 2026</option><option>Year 2025</option>
      </select>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"
        style="position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none;">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
    <div style="position:relative;">
      <select style="padding:.5rem 1.75rem .5rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;background:white;cursor:pointer;appearance:none;">
        <option>All Crops</option><option>Rice</option><option>Corn</option><option>Vegetables</option>
      </select>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"
        style="position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none;">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  </div>

  <!-- KPI Strip -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.85rem;margin-bottom:1.25rem;">
    ${[
      { icon:'🌾', label:'Total Yield (YTD)',   value:(totalYieldKg/1000).toFixed(1)+' tons', sub:'From AI Predictions',                       color:'#2D5A27', bg:'#f0fdf4' },
      { icon:'✅', label:'Task Completion Rate', value:compRate+'%',                           sub:`${totalDone} of ${totalTasks} tasks done`,   color:'#22c55e', bg:'#f0fdf4' },
      { icon:'👷', label:'Avg Attendance Rate',  value:Math.round(avgAttend)+'%',              sub:'Across all workers',                         color:'#3b82f6', bg:'#eff6ff' },
      { icon:'📦', label:'Inventory Alerts',     value:stockHealth.lowStock+stockHealth.outOfStock, sub:`${stockHealth.lowStock} low · ${stockHealth.outOfStock} out of stock`, color:'#f59e0b', bg:'#fffbeb' },
    ].map(k=>`
      <div class="card" style="display:flex;align-items:center;gap:.85rem;padding:1rem 1.1rem;">
        <div style="width:42px;height:42px;background:${k.bg};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex-shrink:0;">${k.icon}</div>
        <div style="min-width:0;">
          <div style="font-size:1.25rem;font-weight:700;color:${k.color};line-height:1.1;">${k.value}</div>
          <div style="font-size:.7rem;font-weight:600;color:var(--text);margin-top:.1rem;">${k.label}</div>
          <div style="font-size:.65rem;color:var(--muted);margin-top:.05rem;">${k.sub}</div>
        </div>
      </div>`).join('')}
  </div>

  <!-- Row 1: Yield + Resource Usage -->
  <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:1rem;margin-bottom:1rem;">
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:.1rem;">Yield Over Time</div>
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:1rem;">Monthly crop yield in kg · from AI Predictions</div>
      <canvas id="yieldTimeChart" height="150"></canvas>
    </div>
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:.1rem;">Resource Usage</div>
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:1rem;">Inventory items by category</div>
      <canvas id="resourceChart" height="130"></canvas>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-top:.75rem;">
        ${Object.entries(invCatData).map(([cat,count],i) => `
          <div style="display:flex;align-items:center;gap:.4rem;font-size:.7rem;color:var(--muted);">
            <span style="width:10px;height:10px;background:${INV_COLORS[i]};border-radius:2px;flex-shrink:0;"></span>
            ${cat} (${Math.round((count/RAW.inventory.length)*100)}%)
          </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- Row 2: Tasks + Attendance -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.1rem;">
        <div style="font-weight:700;font-size:1rem;">Task Completion Rate</div>
        <span style="background:#f0fdf4;color:var(--green-dark);font-size:.68rem;font-weight:700;padding:.2rem .6rem;border-radius:999px;">${compRate}% overall</span>
      </div>
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:.8rem;">Monthly completed vs pending · from Tasks</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:.85rem;">
        <div style="background:#f9fafb;border-radius:8px;padding:.5rem;text-align:center;">
          <div style="font-size:1.15rem;font-weight:700;color:var(--text);line-height:1;">${totalTasks}</div>
          <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Total</div>
        </div>
        <div style="background:#f0fdf4;border-radius:8px;padding:.5rem;text-align:center;">
          <div style="font-size:1.15rem;font-weight:700;color:#22c55e;line-height:1;">${totalDone}</div>
          <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Completed</div>
        </div>
        <div style="background:#fffbeb;border-radius:8px;padding:.5rem;text-align:center;">
          <div style="font-size:1.15rem;font-weight:700;color:#f59e0b;line-height:1;">${totalPending}</div>
          <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Pending</div>
        </div>
      </div>
      <canvas id="taskCompletionChart" height="155"></canvas>
    </div>
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:.1rem;">Worker Attendance Rate</div>
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:.8rem;">Monthly attendance % · from Attendance records</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:.85rem;">
        <div style="background:#f0fdf4;border-radius:8px;padding:.5rem;text-align:center;">
          <div style="font-size:1.15rem;font-weight:700;color:#22c55e;line-height:1;">${Math.round(avgAttend)}%</div>
          <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Avg Present</div>
        </div>
        <div style="background:#fffbeb;border-radius:8px;padding:.5rem;text-align:center;">
          <div style="font-size:1.15rem;font-weight:700;color:#f59e0b;line-height:1;">${Math.round(attendData.late.reduce((a,b)=>a+b,0)/8)}%</div>
          <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Avg Late</div>
        </div>
        <div style="background:#fef2f2;border-radius:8px;padding:.5rem;text-align:center;">
          <div style="font-size:1.15rem;font-weight:700;color:#ef4444;line-height:1;">${Math.round(attendData.absent.reduce((a,b)=>a+b,0)/8)}%</div>
          <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Avg Absent</div>
        </div>
      </div>
      <canvas id="attendChart" height="155"></canvas>
    </div>
  </div>

  <!-- Row 3: Inventory Stock Health + Task Priority Breakdown -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:.1rem;">Inventory Stock Health</div>
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:.85rem;">Current stock levels · 🟢 OK &nbsp;🟡 Low &nbsp;🔴 Out · from Inventory</div>
      <canvas id="inventoryChart" height="160"></canvas>
    </div>
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:.1rem;">Task Priority Breakdown</div>
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:.85rem;">All tasks by priority level · from Tasks</div>
      <div style="display:flex;align-items:center;gap:1.5rem;height:160px;">
        <div style="flex:0 0 150px;height:150px;">
          <canvas id="priorityChart"></canvas>
        </div>
        <div style="display:flex;flex-direction:column;gap:.75rem;">
          ${[
            { label:'High',   color:'#ef4444', count:priorityData.High   },
            { label:'Medium', color:'#f59e0b', count:priorityData.Medium },
            { label:'Low',    color:'#22c55e', count:priorityData.Low    },
          ].map(p=>`
            <div>
              <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.15rem;">
                <span style="width:10px;height:10px;background:${p.color};border-radius:50%;flex-shrink:0;"></span>
                <span style="font-size:.78rem;font-weight:600;">${p.label} Priority</span>
              </div>
              <div style="font-size:1.1rem;font-weight:700;color:var(--text);margin-left:1.3rem;">
                ${p.count} <span style="font-size:.7rem;color:var(--muted);font-weight:400;">tasks</span>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>
  </div>
`;

// ── CHART 1: Yield Over Time ──────────────────────────────────────
new Chart(document.getElementById('yieldTimeChart'), {
  type:'line',
  data:{
    labels: MONTHS,
    datasets:[
      { label:'Rice',       data:yieldData['Rice'],       borderColor:'#22c55e', tension:.4, pointRadius:4, pointBackgroundColor:'#22c55e', borderWidth:2, fill:false },
      { label:'Corn',       data:yieldData['Corn'],       borderColor:'#3b82f6', tension:.4, pointRadius:4, pointBackgroundColor:'#3b82f6', borderWidth:2, fill:false },
      { label:'Vegetables', data:yieldData['Vegetables'], borderColor:'#f59e0b', tension:.4, pointRadius:4, pointBackgroundColor:'#f59e0b', borderWidth:2, fill:false },
    ],
  },
  options:{
    responsive:true,
    plugins:{
      legend:{ labels:{ font:cf, boxWidth:16, padding:14 } },
      tooltip:{ ...tooltip, callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} kg` } },
    },
    scales:{
      x:{ grid:{ display:false }, ticks:{ font:cf } },
      y:{ grid:{ color:gc }, ticks:{ font:cf, callback: v => v>=1000?(v/1000).toFixed(1)+'k':v } },
    },
  },
});

// ── CHART 2: Resource Usage (Inventory categories) ────────────────
new Chart(document.getElementById('resourceChart'), {
  type:'doughnut',
  data:{
    labels: Object.keys(invCatData),
    datasets:[{ data:Object.values(invCatData), backgroundColor:INV_COLORS, borderWidth:0, hoverOffset:6 }],
  },
  options:{ plugins:{ legend:{ display:false }, tooltip:{ ...tooltip } }, cutout:'65%', responsive:true },
});

// ── CHART 3: Task Completion Rate ─────────────────────────────────
new Chart(document.getElementById('taskCompletionChart'), {
  type:'bar',
  data:{
    labels: MONTHS,
    datasets:[
      { label:'Completed', data:taskMonthly.done,    backgroundColor:'#22c55e', borderRadius:5, borderSkipped:false },
      { label:'Pending',   data:taskMonthly.pending, backgroundColor:'#fde68a', borderRadius:5, borderSkipped:false },
    ],
  },
  options:{
    responsive:true,
    plugins:{
      legend:{ labels:{ font:cf, boxWidth:12, padding:12 } },
      tooltip:{ ...tooltip, callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} tasks` } },
    },
    scales:{
      x:{ grid:{ display:false }, ticks:{ font:cf } },
      y:{ beginAtZero:true, grid:{ color:gc }, ticks:{ font:cf, stepSize:2, precision:0 } },
    },
  },
});

// ── CHART 4: Worker Attendance Rate ──────────────────────────────
new Chart(document.getElementById('attendChart'), {
  type:'bar',
  data:{
    labels: MONTHS,
    datasets:[
      { label:'Present', data:attendData.present, backgroundColor:'#22c55e', borderRadius:4, borderSkipped:false },
      { label:'Late',    data:attendData.late,    backgroundColor:'#f59e0b', borderRadius:4, borderSkipped:false },
      { label:'Absent',  data:attendData.absent,  backgroundColor:'#ef4444', borderRadius:4, borderSkipped:false },
    ],
  },
  options:{
    responsive:true,
    plugins:{ legend:{ labels:{ font:cf, boxWidth:12, padding:12 } }, tooltip:{ ...tooltip } },
    scales:{
      x:{ grid:{ display:false }, ticks:{ font:cf }, stacked:true },
      y:{ grid:{ color:gc }, ticks:{ font:cf }, stacked:true, max:100 },
    },
  },
});

// ── CHART 5: Inventory Stock Health (horizontal bar) ──────────────
new Chart(document.getElementById('inventoryChart'), {
  type:'bar',
  data:{
    labels: RAW.inventory.map(i => i.name.length > 20 ? i.name.slice(0,20)+'…' : i.name),
    datasets:[{
      label:'Quantity',
      data:  RAW.inventory.map(i => i.qty),
      backgroundColor: RAW.inventory.map(i =>
        i.status==='in-stock' ? '#22c55e' : i.status==='low-stock' ? '#f59e0b' : '#ef4444'
      ),
      borderRadius:5, borderSkipped:false,
    }],
  },
  options:{
    indexAxis:'y', responsive:true,
    plugins:{
      legend:{ display:false },
      tooltip:{ ...tooltip, callbacks:{ label: ctx => ` ${ctx.parsed.x} ${RAW.inventory[ctx.dataIndex]?.unit||''}` } },
    },
    scales:{
      x:{ grid:{ color:gc }, ticks:{ font:cf } },
      y:{ grid:{ display:false }, ticks:{ font:cf } },
    },
  },
});

// ── CHART 6: Task Priority Doughnut ──────────────────────────────
new Chart(document.getElementById('priorityChart'), {
  type:'doughnut',
  data:{
    labels:['High','Medium','Low'],
    datasets:[{
      data:[priorityData.High, priorityData.Medium, priorityData.Low],
      backgroundColor:['#ef4444','#f59e0b','#22c55e'],
      borderWidth:0, hoverOffset:5,
    }],
  },
  options:{
    plugins:{ legend:{ display:false }, tooltip:{ ...tooltip } },
    cutout:'60%', responsive:true, maintainAspectRatio:false,
  },
});