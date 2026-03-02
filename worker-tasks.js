document.addEventListener('DOMContentLoaded', function () {

renderShell('tasks');

const tasks = [
  { id:1, priority:'High',   completed:false, title:'Irrigate Rice Paddies – Section A',  desc:'Complete irrigation cycle for rice paddies in Section A. Ensure water level reaches 5cm depth.',          due:'Feb 20, 2026', by:'Maria Santos' },
  { id:2, priority:'Medium', completed:true,  title:'Apply Fertilizer to Corn Fields',    desc:'Apply NPK fertilizer (14-14-14) at recommended rate of 2 bags per hectare.',                               due:'Feb 20, 2026', by:'Maria Santos' },
  { id:3, priority:'Low',    completed:false, title:'Check Pest Traps',                   desc:'Inspect and replace pest traps in the vegetable garden area. Record pest count.',                           due:'Feb 20, 2026', by:'Admin' },
  { id:4, priority:'High',   completed:false, title:'Harvest Ripe Tomatoes',              desc:'Harvest tomatoes that have reached maturity in greenhouse section B.',                                       due:'Feb 21, 2026', by:'Maria Santos' },
  { id:5, priority:'Medium', completed:true,  title:'Equipment Maintenance Check',        desc:'Perform routine maintenance check on tractor and irrigation pumps.',                                        due:'Feb 19, 2026', by:'Admin' },
  { id:6, priority:'Medium', completed:false, title:'Soil Sample Collection',             desc:'Collect soil samples from Sections A, B, and C for laboratory analysis.',                                   due:'Feb 22, 2026', by:'Maria Santos' },
];

let filter = 'All Tasks';

const priorityStyle = {
  High:   { badge: 'badge-red',    dot: '#ef4444' },
  Medium: { badge: 'badge-orange', dot: '#f59e0b' },
  Low:    { badge: 'badge-gray',   dot: '#6b7280' },
};

function iconFor(t) {
  if (t.completed) return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
  const c = priorityStyle[t.priority].dot;
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
}

function renderTasks() {
  let visible = tasks;
  if (filter === 'Pending')   visible = tasks.filter(t => !t.completed);
  if (filter === 'Completed') visible = tasks.filter(t =>  t.completed);
  const pending = tasks.filter(t => !t.completed).length;

  document.getElementById('pageContent').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.2rem;">
      <h1 class="page-title" style="margin-bottom:0;">My Tasks</h1>
      <div style="position:relative;">
        <select id="filterSelect" onchange="setFilter(this.value)" style="padding:0.45rem 2rem 0.45rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.78rem;background:white;cursor:pointer;appearance:none;outline:none;">
          <option>All Tasks</option><option>Pending</option><option>Completed</option>
        </select>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--muted);"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </div>
    <p class="page-subtitle">${pending} task${pending !== 1 ? 's' : ''} pending</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
      ${visible.map(t => `
        <div class="card" style="opacity:${t.completed ? '0.75' : '1'};">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:0.5rem;">
            <div style="display:flex;align-items:center;gap:0.5rem;flex:1;">
              ${iconFor(t)}
              <span style="font-size:0.88rem;font-weight:600;${t.completed ? 'text-decoration:line-through;color:var(--muted);' : ''}">${t.title}</span>
            </div>
            <span class="badge ${priorityStyle[t.priority].badge}" style="flex-shrink:0;margin-left:0.5rem;">${t.priority}</span>
          </div>
          <p style="font-size:0.78rem;color:var(--muted);margin-bottom:0.75rem;margin-left:1.7rem;">${t.desc}</p>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-left:1.7rem;">
            <div style="font-size:0.72rem;color:var(--muted);">Due: <strong style="color:var(--text);">${t.due}</strong> &nbsp; By: <strong style="color:var(--text);">${t.by}</strong></div>
            ${t.completed
              ? `<span style="font-size:0.78rem;color:#22c55e;font-weight:600;">Completed</span>`
              : `<button class="btn btn-primary" onclick="completeTask(${t.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Complete</button>`}
          </div>
        </div>`).join('')}
    </div>
  `;
  document.getElementById('filterSelect').value = filter;
}

window.setFilter = function(val) { filter = val; renderTasks(); }
window.completeTask = function(id) { const t = tasks.find(t => t.id === id); if (t) { t.completed = true; renderTasks(); } }

renderTasks();

}); // end DOMContentLoaded