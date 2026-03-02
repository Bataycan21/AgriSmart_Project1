renderShell('analytics');

document.getElementById('pageContent').innerHTML = `
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.5rem;">
    <div>
      <h1 class="page-title" style="margin-bottom:0;">Analytics</h1>
      <p class="page-subtitle" style="margin-bottom:0;">Farm performance insights and reports</p>
    </div>
    <button class="btn btn-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Export Report
    </button>
  </div>

  <div style="display:flex;gap:0.75rem;margin-bottom:1.25rem;">
    <div style="position:relative;">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <select style="padding:0.5rem 1.75rem 0.5rem 2rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;background:white;cursor:pointer;appearance:none;">
        <option>Year 2026</option><option>Year 2025</option>
      </select>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <div style="position:relative;">
      <select style="padding:0.5rem 1.75rem 0.5rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;background:white;cursor:pointer;appearance:none;">
        <option>All Crops</option><option>Rice</option><option>Corn</option><option>Vegetables</option>
      </select>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:1rem;margin-bottom:1.25rem;">
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:0.15rem;">Yield Over Time</div>
      <div style="font-size:0.75rem;color:var(--muted);margin-bottom:1rem;">Monthly crop yield in tons</div>
      <canvas id="yieldTimeChart" height="150"></canvas>
    </div>
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:0.15rem;">Resource Usage</div>
      <div style="font-size:0.75rem;color:var(--muted);margin-bottom:1rem;">Distribution by category</div>
      <canvas id="resourceChart" height="150"></canvas>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;margin-top:0.75rem;">
        ${[
          {color:'#3b82f6', label:'Water (35%)'},
          {color:'#22c55e', label:'Fertilizer (25%)'},
          {color:'#f59e0b', label:'Labor (20%)'},
          {color:'#8b5cf6', label:'Equipment (12%)'},
          {color:'#ef4444', label:'Seeds (8%)'},
        ].map(l=>`<div style="display:flex;align-items:center;gap:0.4rem;font-size:0.7rem;color:var(--muted);">
          <span style="width:10px;height:10px;background:${l.color};border-radius:2px;flex-shrink:0;"></span>${l.label}
        </div>`).join('')}
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:0.15rem;">Cost Breakdown</div>
      <div style="font-size:0.75rem;color:var(--muted);margin-bottom:1rem;">Quarterly cost comparison (PHP)</div>
      <canvas id="costBreakChart" height="160"></canvas>
    </div>
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:0.15rem;">Worker Attendance Rate</div>
      <div style="font-size:0.75rem;color:var(--muted);margin-bottom:1rem;">Monthly attendance % by status</div>
      <canvas id="attendChart" height="160"></canvas>
    </div>
  </div>
`;

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'];
const cf = {family:'Poppins', size:10};
const gc = '#f3f4f6';

new Chart(document.getElementById('yieldTimeChart'), {
  type:'line',
  data:{
    labels:months,
    datasets:[
      {label:'Corn',       data:[2.1,2.3,2.6,2.8,3.0,3.2,3.5,4.0], borderColor:'#3b82f6', tension:0.4, pointRadius:4, pointBackgroundColor:'#3b82f6', borderWidth:2, fill:false},
      {label:'Rice',       data:[1.9,2.2,2.5,2.7,2.9,3.1,3.3,3.1], borderColor:'#22c55e', tension:0.4, pointRadius:4, pointBackgroundColor:'#22c55e', borderWidth:2, fill:false},
      {label:'Vegetables', data:[0.9,1.1,1.2,1.1,1.3,1.4,1.5,1.7], borderColor:'#f59e0b', tension:0.4, pointRadius:4, pointBackgroundColor:'#f59e0b', borderWidth:2, fill:false},
    ]
  },
  options:{plugins:{legend:{labels:{font:cf,boxWidth:16,padding:14}}},scales:{x:{grid:{display:false},ticks:{font:cf}},y:{grid:{color:gc},ticks:{font:cf}}},responsive:true}
});

new Chart(document.getElementById('resourceChart'), {
  type:'doughnut',
  data:{
    labels:['Water','Fertilizer','Labor','Equipment','Seeds'],
    datasets:[{data:[35,25,20,12,8], backgroundColor:['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ef4444'], borderWidth:0, hoverOffset:6}]
  },
  options:{plugins:{legend:{display:false}}, cutout:'65%', responsive:true}
});

new Chart(document.getElementById('costBreakChart'), {
  type:'bar',
  data:{
    labels:['Q1','Q2','Q3','Q4'],
    datasets:[
      {label:'Equipment', data:[13000,11000,14000,16000], backgroundColor:'#f59e0b', borderRadius:4, borderSkipped:false},
      {label:'Labor',     data:[38000,41000,39000,44000], backgroundColor:'#2D5A27', borderRadius:4, borderSkipped:false},
      {label:'Seeds',     data:[24000,26000,22000,28000], backgroundColor:'#3b82f6', borderRadius:4, borderSkipped:false},
    ]
  },
  options:{plugins:{legend:{labels:{font:cf,boxWidth:12,padding:12}}},scales:{x:{grid:{display:false},ticks:{font:cf}},y:{grid:{color:gc},ticks:{font:cf}}},responsive:true}
});

new Chart(document.getElementById('attendChart'), {
  type:'bar',
  data:{
    labels:months,
    datasets:[
      {label:'Present', data:[88,85,90,87,92,89,91,90], backgroundColor:'#22c55e', borderRadius:4, borderSkipped:false},
      {label:'Late',    data:[7,10,6,8,5,7,6,7],         backgroundColor:'#f59e0b', borderRadius:4, borderSkipped:false},
      {label:'Absent',  data:[5,5,4,5,3,4,3,3],          backgroundColor:'#ef4444', borderRadius:4, borderSkipped:false},
    ]
  },
  options:{plugins:{legend:{labels:{font:cf,boxWidth:12,padding:12}}},scales:{x:{grid:{display:false},ticks:{font:cf},stacked:true},y:{grid:{color:gc},ticks:{font:cf},stacked:true,max:100}},responsive:true}
});