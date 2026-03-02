renderShell('dashboard');

document.getElementById('pageContent').innerHTML = `
  <h1 class="page-title">Dashboard</h1>
  <p class="page-subtitle">Farm overview and key metrics</p>

  <div class="stats-row" style="margin-bottom:1.25rem;">
    <div class="stat-card" style="text-align:left;display:flex;align-items:center;gap:1rem;padding:1.25rem;">
      <div style="width:46px;height:46px;background:#f0fdf4;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 0 0 7-1 8 5-2-1-8-1-8 5 3-1 6 0 6 5-1-4-10-5-11 0 1-1 2.5-1 3 0-1 0-2.5.5-3 2 1-1 3-1 4 0-1-2-6-3-8 0 2-2 4-3 5-8 1-5 3-8 5-10z"/></svg>
      </div>
      <div>
        <div style="font-size:0.7rem;color:var(--muted);margin-bottom:0.15rem;display:flex;align-items:center;gap:0.3rem;">
          <span style="color:#22c55e;font-weight:600;">▲ +3 this month</span>
        </div>
        <div class="stat-num" style="font-size:1.8rem;margin-bottom:0.1rem;">24</div>
        <div class="stat-label">Total Crops</div>
      </div>
    </div>
    <div class="stat-card" style="text-align:left;display:flex;align-items:center;gap:1rem;padding:1.25rem;">
      <div style="width:46px;height:46px;background:#eff6ff;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
      </div>
      <div>
        <div style="font-size:0.7rem;color:var(--muted);margin-bottom:0.15rem;">
          <span style="color:#22c55e;font-weight:600;">▲ +12% this month</span>
        </div>
        <div class="stat-num blue" style="font-size:1.8rem;margin-bottom:0.1rem;">1,247</div>
        <div class="stat-label">Inventory Items</div>
      </div>
    </div>
    <div class="stat-card" style="text-align:left;display:flex;align-items:center;gap:1rem;padding:1.25rem;">
      <div style="width:46px;height:46px;background:#fff7ed;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </div>
      <div>
        <div style="font-size:0.7rem;margin-bottom:0.15rem;">
          <span style="color:#ef4444;font-weight:600;">▼ -2 this month</span>
        </div>
        <div class="stat-num orange" style="font-size:1.8rem;margin-bottom:0.1rem;">38</div>
        <div class="stat-label">Active Workers</div>
      </div>
    </div>
    <div class="stat-card" style="text-align:left;display:flex;align-items:center;gap:1rem;padding:1.25rem;">
      <div style="width:46px;height:46px;background:#faf5ff;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
      </div>
      <div>
        <div style="font-size:0.7rem;margin-bottom:0.15rem;">
          <span style="color:#22c55e;font-weight:600;">▲ +8% forecast</span>
        </div>
        <div class="stat-num purple" style="font-size:1.8rem;margin-bottom:0.1rem;">4.2T</div>
        <div class="stat-label">Predicted Yield</div>
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:1rem;margin-bottom:1.25rem;">
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:0.15rem;">Yield Trends</div>
      <div style="font-size:0.75rem;color:var(--muted);margin-bottom:1rem;">Monthly yield vs target (tons)</div>
      <canvas id="yieldChart" height="140"></canvas>
    </div>
    <div class="card">
      <div style="font-weight:700;font-size:1rem;margin-bottom:0.15rem;">Production Costs</div>
      <div style="font-size:0.75rem;color:var(--muted);margin-bottom:1rem;">Monthly cost breakdown (PHP)</div>
      <canvas id="costChart" height="140"></canvas>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:1rem;">
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
        <div style="font-weight:700;font-size:1rem;">Recent Activity</div>
        <a href="#" style="font-size:0.78rem;color:var(--green-dark);font-weight:600;text-decoration:none;">View All</a>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.85rem;">
        ${[
          {dot:'#22c55e', text:'Inventory updated: 500kg Rice Seeds added',        time:'2 min ago'},
          {dot:'#3b82f6', text:'Worker Juan marked Time In at 7:02 AM',            time:'1 hour ago'},
          {dot:'#f59e0b', text:'Low stock alert: Organic Pesticide at 0 units',    time:'2 hours ago'},
          {dot:'#8b5cf6', text:'AI Prediction generated for Corn Season 2',        time:'3 hours ago'},
          {dot:'#22c55e', text:'Task completed: Apply Fertilizer to Corn Fields',  time:'5 hours ago'},
          {dot:'#ef4444', text:'3 workers pending attendance verification',         time:'Yesterday'},
        ].map(a=>`
          <div style="display:flex;align-items:flex-start;gap:0.75rem;">
            <div style="width:8px;height:8px;border-radius:50%;background:${a.dot};flex-shrink:0;margin-top:5px;"></div>
            <div>
              <div style="font-size:0.8rem;font-weight:500;line-height:1.4;">${a.text}</div>
              <div style="font-size:0.7rem;color:var(--muted);">${a.time}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
        <div style="font-weight:700;font-size:1rem;">Notifications</div>
        <span class="badge badge-red">2 urgent</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.6rem;">
        ${[
          {urgent:true,  stroke:'#ef4444', text:'Low inventory: Fertilizer stock below 50 units'},
          {urgent:true,  stroke:'#ef4444', text:'Weather alert: Heavy rain expected tomorrow'},
          {urgent:false, stroke:'#f59e0b', text:'3 workers pending attendance verification'},
          {urgent:false, stroke:'#3b82f6', text:'New AI yield prediction ready for review'},
          {urgent:false, stroke:'#6b7280', text:'Monthly analytics report is available'},
        ].map(n=>`
          <div style="display:flex;align-items:flex-start;gap:0.65rem;padding:0.6rem 0.75rem;background:${n.urgent?'#fff5f5':'#fafafa'};border:1px solid ${n.urgent?'#fecaca':'var(--border)'};border-radius:8px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${n.stroke}" stroke-width="2.5" style="flex-shrink:0;margin-top:1px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span style="font-size:0.78rem;line-height:1.4;">${n.text}</span>
          </div>`).join('')}
      </div>
    </div>
  </div>
`;

new Chart(document.getElementById('yieldChart'), {
  type:'line',
  data:{
    labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'],
    datasets:[
      {label:'Actual Yield',data:[2.5,2.8,3.0,2.9,3.3,3.5,3.7,4.0],borderColor:'#2D5A27',backgroundColor:'rgba(45,90,39,0.06)',tension:0.4,pointRadius:4,pointBackgroundColor:'#2D5A27',fill:true,borderWidth:2},
      {label:'Target',      data:[2.2,2.6,2.9,3.1,3.2,3.4,3.6,3.8],borderColor:'#a8c69f',borderDash:[5,5],tension:0.4,pointRadius:3,pointBackgroundColor:'#a8c69f',borderWidth:1.5},
    ]
  },
  options:{plugins:{legend:{labels:{font:{family:'Poppins',size:11},boxWidth:18,padding:14}}},scales:{x:{grid:{display:false},ticks:{font:{family:'Poppins',size:10}}},y:{grid:{color:'#f3f4f6'},ticks:{font:{family:'Poppins',size:10}}}},responsive:true}
});

new Chart(document.getElementById('costChart'), {
  type:'bar',
  data:{
    labels:['Jan','Feb','Mar','Apr','May','Jun'],
    datasets:[
      {label:'Equipment',data:[4500,4200,3800,3200,4000,4800],backgroundColor:'#f59e0b',borderRadius:3,borderSkipped:false},
      {label:'Labor',    data:[12000,13000,14000,12000,12500,16000],backgroundColor:'#2D5A27',borderRadius:3,borderSkipped:false},
      {label:'Seeds',    data:[8000,9500,8500,7500,7800,8200],backgroundColor:'#3b82f6',borderRadius:3,borderSkipped:false},
    ]
  },
  options:{plugins:{legend:{labels:{font:{family:'Poppins',size:11},boxWidth:12,padding:14}}},scales:{x:{grid:{display:false},ticks:{font:{family:'Poppins',size:10}}},y:{grid:{color:'#f3f4f6'},ticks:{font:{family:'Poppins',size:10}}}},responsive:true}
});