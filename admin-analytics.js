// ================================================================
// admin-analytics.js  –  AgriSmart Unified Analytics
// Fully connected to Supabase — all data is live.
// ================================================================

renderShell('analytics');

const currentYear = new Date().getFullYear();

// ── CHART STYLE DEFAULTS ──────────────────────────────────────────
const cf = { family:'Poppins', size:10 };
const gc = '#f3f4f6';
const tooltip = {
  backgroundColor:'#fff', titleColor:'#1a1a1a', bodyColor:'#6b7280',
  borderColor:'#e5e7eb', borderWidth:1, padding:10,
  titleFont:{family:'Poppins',weight:'600',size:12},
  bodyFont:{family:'Poppins',size:11},
};
const INV_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ef4444'];

// ── DATA PROCESSORS ───────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildTaskData(tasks) {
  const done = new Array(12).fill(0), pending = new Array(12).fill(0);
  tasks.forEach(t => {
    const m = new Date(t.created_at).getMonth();
    t.completed ? done[m]++ : pending[m]++;
  });
  return { done, pending };
}

function buildPriorityData(tasks) {
  const counts = { High:0, Medium:0, Low:0 };
  tasks.forEach(t => { if (counts[t.priority] !== undefined) counts[t.priority]++; });
  return counts;
}

function buildAttendData(attendance) {
  const buckets = Array.from({length:12}, () => ({present:0,late:0,absent:0,total:0}));
  attendance.forEach(r => {
    const m = new Date(r.date + 'T00:00:00').getMonth();
    if (buckets[m]) { buckets[m][r.status] = (buckets[m][r.status]||0) + 1; buckets[m].total++; }
  });
  return {
    present: buckets.map(b => b.total ? Math.round((b.present/b.total)*100) : 0),
    late:    buckets.map(b => b.total ? Math.round((b.late/b.total)*100)    : 0),
    absent:  buckets.map(b => b.total ? Math.round((b.absent/b.total)*100)  : 0),
  };
}

// ── Yield from yield_records ──────────────────────────────────────
const toKg = r => r.yield_unit === 'tons' ? r.yield_value * 1000 : r.yield_value;

function buildYieldData(yieldRecs) {
  const crops = [...new Set(yieldRecs.map(r => r.crop_type))];
  const data = {};
  crops.forEach(c => data[c] = new Array(12).fill(0));
  yieldRecs.forEach(r => {
    if (!r.harvest_date) return;
    const m = new Date(r.harvest_date + 'T00:00:00').getMonth();
    if (data[r.crop_type] !== undefined)
      data[r.crop_type][m] += toKg(r);
  });
  return data;
}

function buildInvCatData(inventory) {
  const counts = {};
  inventory.forEach(i => { counts[i.cat] = (counts[i.cat]||0) + 1; });
  return counts;
}

function buildStockHealth(inventory) {
  return {
    inStock:    inventory.filter(i => i.status==='in-stock').length,
    lowStock:   inventory.filter(i => i.status==='low-stock').length,
    outOfStock: inventory.filter(i => i.status==='out-of-stock').length,
  };
}

function getVisibleMonths() {
  return MONTHS.slice(0, new Date().getMonth() + 1);
}

// ── MAIN INIT ─────────────────────────────────────────────────────
async function initAnalytics() {
  const db = window.db;

  document.getElementById('pageContent').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:60vh;color:var(--muted);font-size:.9rem;gap:.75rem;">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="animation:spin 1s linear infinite;">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Loading analytics…
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg);}}</style>
  `;

  // ── Fetch all data in parallel ────────────────────────────────
  const [
    { data: taskRows,    error: e1 },
    { data: attendRows,  error: e2 },
    { data: invRows,     error: e3 },
    { data: yieldRows,   error: e4 },
    { data: crmRows,     error: e5 },
  ] = await Promise.all([
    db.from('tasks').select('completed, priority, created_at, worker, worker_id').gte('created_at', `${currentYear}-01-01`),
    db.from('attendance').select('status, date').gte('date', `${currentYear}-01-01`),
    db.from('inventory_items').select('name, cat, qty, unit, status'),
    db.from('yield_records').select('yield_value, yield_unit, crop_type, harvest_date'),
    db.from('crm_contacts').select('id, enabled, stars, created_at'),
  ]);

  if (e1) console.error('[Analytics] tasks:', e1.message);
  if (e2) console.error('[Analytics] attendance:', e2.message);
  if (e3) console.error('[Analytics] inventory:', e3.message);
  if (e4) console.error('[Analytics] yield_records:', e4.message);
  if (e5) console.error('[Analytics] crm_contacts:', e5.message);

  const RAW = {
    tasks:      taskRows   || [],
    attendance: attendRows || [],
    inventory:  invRows    || [],
    yieldRecs:  yieldRows  || [],
    crm:        crmRows    || [],
  };

  // ── Compute ───────────────────────────────────────────────────
  const visMonths    = getVisibleMonths();
  const vm           = visMonths.length;

  const taskMonthly  = buildTaskData(RAW.tasks);
  const priorityData = buildPriorityData(RAW.tasks);
  const attendData   = buildAttendData(RAW.attendance);
  const yieldData    = buildYieldData(RAW.yieldRecs);
  const invCatData   = buildInvCatData(RAW.inventory);
  const stockHealth  = buildStockHealth(RAW.inventory);

  const totalDone    = taskMonthly.done.reduce((a,b) => a+b, 0);
  const totalPending = taskMonthly.pending.reduce((a,b) => a+b, 0);
  const totalTasks   = totalDone + totalPending;
  const compRate     = totalTasks ? Math.round((totalDone/totalTasks)*100) : 0;

  const presentVals  = attendData.present.slice(0, vm).filter(v => v > 0);
  const avgAttend    = presentVals.length ? Math.round(presentVals.reduce((a,b)=>a+b,0) / presentVals.length) : 0;

  const totalYieldKg = RAW.yieldRecs.reduce((s, r) => s + toKg(r), 0);
  const totalYieldVal = totalYieldKg >= 1000
    ? (totalYieldKg / 1000).toFixed(1) + ' tons'
    : totalYieldKg.toFixed(0) + ' kg';

  const crops = Object.keys(yieldData);

  // ── Render HTML ───────────────────────────────────────────────
  document.getElementById('pageContent').innerHTML = `

    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.5rem;">
      <div>
        <h1 class="page-title" style="margin-bottom:0;">Analytics</h1>
        <p class="page-subtitle" style="margin-bottom:0;">Live farm performance — all modules connected</p>
      </div>
      <button class="btn btn-primary" onclick="window.print()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export Report
      </button>
    </div>

    <!-- KPI Strip -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.85rem;margin-bottom:1.25rem;">
      ${[
        { icon:'🌾', label:'Total Yield (YTD)',   value: RAW.yieldRecs.length ? totalYieldVal : '—',         sub: RAW.yieldRecs.length ? `${RAW.yieldRecs.length} harvest records` : 'No yield data yet', color:'#2D5A27', bg:'#f0fdf4' },
        { icon:'✅', label:'Task Completion Rate', value: totalTasks ? compRate+'%' : '—',                    sub: totalTasks ? `${totalDone} of ${totalTasks} tasks done` : 'No tasks yet',              color:'#22c55e', bg:'#f0fdf4' },
        { icon:'👷', label:'Avg Attendance Rate',  value: RAW.attendance.length ? avgAttend+'%' : '—',        sub:'Across all workers',                                                                    color:'#3b82f6', bg:'#eff6ff' },
        { icon:'📦', label:'Inventory Alerts',     value: RAW.inventory.length ? stockHealth.lowStock+stockHealth.outOfStock : '—', sub: RAW.inventory.length ? `${stockHealth.lowStock} low · ${stockHealth.outOfStock} out of stock` : 'No inventory data', color:'#f59e0b', bg:'#fffbeb' },
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

    <!-- Row 1: Yield Over Time + Resource Usage -->
    <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:1rem;margin-bottom:1rem;">
      <div class="card">
        <div style="font-weight:700;font-size:1rem;margin-bottom:.1rem;">Yield Over Time</div>
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:1rem;">Monthly harvest yield in kg · from Yield Management</div>
        ${RAW.yieldRecs.length
          ? `<canvas id="yieldTimeChart" height="150"></canvas>`
          : `<div style="text-align:center;padding:3rem 1rem;color:var(--muted);font-size:.82rem;">No yield records yet. Add records in Yield Management.</div>`}
      </div>
      <div class="card">
        <div style="font-weight:700;font-size:1rem;margin-bottom:.1rem;">Resource Usage</div>
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:1rem;">Inventory items by category</div>
        ${RAW.inventory.length
          ? `<canvas id="resourceChart" height="130"></canvas>
             <div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-top:.75rem;">
               ${Object.entries(invCatData).map(([cat,count],i) => `
                 <div style="display:flex;align-items:center;gap:.4rem;font-size:.7rem;color:var(--muted);">
                   <span style="width:10px;height:10px;background:${INV_COLORS[i%INV_COLORS.length]};border-radius:2px;flex-shrink:0;"></span>
                   ${cat} (${Math.round((count/RAW.inventory.length)*100)}%)
                 </div>`).join('')}
             </div>`
          : `<div style="text-align:center;padding:3rem 1rem;color:var(--muted);font-size:.82rem;">No inventory data yet.</div>`}
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
        ${RAW.tasks.length
          ? `<canvas id="taskCompletionChart" height="155"></canvas>`
          : `<div style="text-align:center;padding:2rem 1rem;color:var(--muted);font-size:.82rem;">No task data yet.</div>`}
      </div>
      <div class="card">
        <div style="font-weight:700;font-size:1rem;margin-bottom:.1rem;">Worker Attendance Rate</div>
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:.8rem;">Monthly attendance % · from Attendance records</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:.85rem;">
          <div style="background:#f0fdf4;border-radius:8px;padding:.5rem;text-align:center;">
            <div style="font-size:1.15rem;font-weight:700;color:#22c55e;line-height:1;">${avgAttend}%</div>
            <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Avg Present</div>
          </div>
          <div style="background:#fffbeb;border-radius:8px;padding:.5rem;text-align:center;">
            <div style="font-size:1.15rem;font-weight:700;color:#f59e0b;line-height:1;">${Math.round(attendData.late.slice(0,vm).reduce((a,b)=>a+b,0)/Math.max(vm,1))}%</div>
            <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Avg Late</div>
          </div>
          <div style="background:#fef2f2;border-radius:8px;padding:.5rem;text-align:center;">
            <div style="font-size:1.15rem;font-weight:700;color:#ef4444;line-height:1;">${Math.round(attendData.absent.slice(0,vm).reduce((a,b)=>a+b,0)/Math.max(vm,1))}%</div>
            <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">Avg Absent</div>
          </div>
        </div>
        ${RAW.attendance.length
          ? `<canvas id="attendChart" height="155"></canvas>`
          : `<div style="text-align:center;padding:2rem 1rem;color:var(--muted);font-size:.82rem;">No attendance data yet.</div>`}
      </div>
    </div>

    <!-- Row 3: Inventory Stock Health + Task Priority Breakdown -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
      <div class="card">
        <div style="font-weight:700;font-size:1rem;margin-bottom:.1rem;">Inventory Stock Health</div>
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:.85rem;">Current stock levels · 🟢 OK &nbsp;🟡 Low &nbsp;🔴 Out · from Inventory</div>
        ${RAW.inventory.length
          ? `<canvas id="inventoryChart" height="160"></canvas>`
          : `<div style="text-align:center;padding:3rem 1rem;color:var(--muted);font-size:.82rem;">No inventory items yet.</div>`}
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

  // ── CHART 1: Yield Over Time — from yield_records ───────────────
  if (RAW.yieldRecs.length && document.getElementById('yieldTimeChart')) {
    const cropColors = { Rice:'#22c55e', Corn:'#3b82f6', Vegetables:'#f59e0b', Wheat:'#8b5cf6', Tomatoes:'#ef4444', Sugarcane:'#f97316', Banana:'#eab308', Coconut:'#14b8a6' };
    const defaultColors = ['#8b5cf6','#ef4444','#f97316','#06b6d4','#84cc16'];
    new Chart(document.getElementById('yieldTimeChart'), {
      type:'line',
      data:{
        labels: visMonths,
        datasets: crops.map((crop, i) => ({
          label: crop,
          data: yieldData[crop].slice(0, vm),
          borderColor: cropColors[crop] || defaultColors[i % defaultColors.length],
          tension:.4, pointRadius:4,
          pointBackgroundColor: cropColors[crop] || defaultColors[i % defaultColors.length],
          borderWidth:2, fill:false,
        })),
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
  }

  // ── CHART 2: Resource Usage (Inventory categories) ──────────────
  if (RAW.inventory.length && document.getElementById('resourceChart')) {
    new Chart(document.getElementById('resourceChart'), {
      type:'doughnut',
      data:{
        labels: Object.keys(invCatData),
        datasets:[{ data:Object.values(invCatData), backgroundColor:INV_COLORS, borderWidth:0, hoverOffset:6 }],
      },
      options:{ plugins:{ legend:{ display:false }, tooltip:{ ...tooltip } }, cutout:'65%', responsive:true },
    });
  }

  // ── CHART 3: Task Completion Rate ───────────────────────────────
  if (RAW.tasks.length && document.getElementById('taskCompletionChart')) {
    new Chart(document.getElementById('taskCompletionChart'), {
      type:'bar',
      data:{
        labels: visMonths,
        datasets:[
          { label:'Completed', data:taskMonthly.done.slice(0,vm),    backgroundColor:'#22c55e', borderRadius:5, borderSkipped:false },
          { label:'Pending',   data:taskMonthly.pending.slice(0,vm), backgroundColor:'#fde68a', borderRadius:5, borderSkipped:false },
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
          y:{ beginAtZero:true, grid:{ color:gc }, ticks:{ font:cf, stepSize:1, precision:0 } },
        },
      },
    });
  }

  // ── CHART 4: Worker Attendance Rate ─────────────────────────────
  if (RAW.attendance.length && document.getElementById('attendChart')) {
    new Chart(document.getElementById('attendChart'), {
      type:'bar',
      data:{
        labels: visMonths,
        datasets:[
          { label:'Present', data:attendData.present.slice(0,vm), backgroundColor:'#22c55e', borderRadius:4, borderSkipped:false },
          { label:'Late',    data:attendData.late.slice(0,vm),    backgroundColor:'#f59e0b', borderRadius:4, borderSkipped:false },
          { label:'Absent',  data:attendData.absent.slice(0,vm),  backgroundColor:'#ef4444', borderRadius:4, borderSkipped:false },
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
  }

  // ── CHART 5: Inventory Stock Health (horizontal bar) ────────────
  if (RAW.inventory.length && document.getElementById('inventoryChart')) {
    new Chart(document.getElementById('inventoryChart'), {
      type:'bar',
      data:{
        labels: RAW.inventory.map(i => i.name.length > 22 ? i.name.slice(0,22)+'…' : i.name),
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
  }

  // ── CHART 6: Task Priority Doughnut ─────────────────────────────
  if (document.getElementById('priorityChart')) {
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
  }

  // ── Real-time: reload when any module changes ──────────────────
  ['tasks','attendance','inventory_items','yield_records','crm_contacts'].forEach(table => {
    db.channel(`analytics-${table}`)
      .on('postgres_changes', { event:'*', schema:'public', table }, () => initAnalytics())
      .subscribe();
  });
}

// ── Kick off ───────────────────────────────────────────────────────
initAnalytics();