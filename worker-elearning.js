renderShell('elearning');

const courses = [
  { id:1, tag:'Soil Science',      tagColor:'#2D5A27', accentColor:'#2D5A27', title:'Soil Health Assessment Fundamentals',   desc:'Learn how to assess soil quality, understand pH levels, and optimize soil conditions for different crops.',                                           hours:'2 hours',   modules:'6 modules',  progress:100, status:'completed'   },
  { id:2, tag:'Farming Methods',   tagColor:'#f59e0b', accentColor:'#f59e0b', title:'Organic Farming Techniques',             desc:'Master organic farming methods including composting, natural pest control, and crop rotation strategies.',                                           hours:'3 hours',   modules:'8 modules',  progress:63,  status:'in-progress' },
  { id:3, tag:'Water Management',  tagColor:'#3b82f6', accentColor:'#3b82f6', title:'Irrigation Systems & Water Management',  desc:'Understand different irrigation methods, water conservation techniques, and smart irrigation scheduling.',                                       hours:'2.5 hours', modules:'7 modules',  progress:0,   status:'not-started' },
  { id:4, tag:'Crop Protection',   tagColor:'#ef4444', accentColor:'#ef4444', title:'Pest & Disease Identification',          desc:'Identify common crop pests and diseases. Learn prevention and treatment strategies.',                                                             hours:'2 hours',   modules:'5 modules',  progress:0,   status:'not-started' },
  { id:5, tag:'Sustainability',    tagColor:'#22c55e', accentColor:'#22c55e', title:'Sustainable Agriculture Practices',      desc:'Explore sustainable farming practices aligned with SDG 2 and SDG 12 for responsible production.',                                                 hours:'4 hours',   modules:'10 modules', progress:100, status:'completed'   },
  { id:6, tag:'Safety',            tagColor:'#f59e0b', accentColor:'#f59e0b', title:'Farm Equipment Safety & Maintenance',    desc:'Safety protocols for operating farm equipment and routine maintenance procedures.',                                                           hours:'1.5 hours', modules:'4 modules',  progress:50,  status:'in-progress' },
];

let activeFilter = 'All';

function filterBtn(label) {
  const a = activeFilter === label;
  return `<button onclick="setFilter('${label}')" style="padding:0.4rem 1rem;border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.8rem;font-weight:${a?'600':'500'};cursor:pointer;border:1.5px solid ${a?'var(--green-dark)':'var(--border)'};background:${a?'var(--green-dark)':'white'};color:${a?'white':'var(--muted)'};transition:all 0.2s;">${label}</button>`;
}

function courseBtn(c) {
  if (c.status === 'completed')   return `<button class="btn btn-ghost" style="width:100%;justify-content:center;">Review Course &nbsp;›</button>`;
  if (c.status === 'in-progress') return `<button class="btn btn-primary" style="width:100%;justify-content:center;background:${c.accentColor};">Continue &nbsp;▷</button>`;
  return `<button class="btn btn-outline" style="width:100%;justify-content:center;">Start Course &nbsp;▷</button>`;
}

function renderCourses() {
  let visible = courses;
  if (activeFilter === 'In Progress')  visible = courses.filter(c => c.status === 'in-progress');
  if (activeFilter === 'Completed')    visible = courses.filter(c => c.status === 'completed');
  if (activeFilter === 'Not Started')  visible = courses.filter(c => c.status === 'not-started');

  const completed  = courses.filter(c => c.status === 'completed').length;
  const inProgress = courses.filter(c => c.status === 'in-progress').length;
  const total      = courses.length;

  document.getElementById('pageContent').innerHTML = `
    <h1 class="page-title">E-Learning</h1>
    <p class="page-subtitle">Agricultural training courses and modules</p>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.25rem;">
      <div class="card" style="display:flex;align-items:center;gap:0.75rem;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2"><path d="M12 15l-2-5H6l4 5"/><path d="M18 15l-2-5h-4l4 5"/><path d="M12 3L2 9l10 6 10-6-10-6z"/></svg>
        <div><div style="font-size:1.4rem;font-weight:700;line-height:1;">${completed}</div><div style="font-size:0.72rem;color:var(--muted);">Courses Completed</div></div>
      </div>
      <div class="card" style="display:flex;align-items:center;gap:0.75rem;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        <div><div style="font-size:1.4rem;font-weight:700;color:#f59e0b;line-height:1;">${inProgress}</div><div style="font-size:0.72rem;color:var(--muted);">In Progress</div></div>
      </div>
      <div class="card" style="display:flex;align-items:center;gap:0.75rem;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        <div><div style="font-size:1.4rem;font-weight:700;color:#3b82f6;line-height:1;">${total}</div><div style="font-size:0.72rem;color:var(--muted);">Total Courses</div></div>
      </div>
    </div>

    <div style="display:flex;gap:0.5rem;margin-bottom:1.25rem;">
      ${['All','In Progress','Completed','Not Started'].map(filterBtn).join('')}
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
      ${visible.map(c => `
        <div class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column;">
          <div style="height:5px;background:${c.accentColor};"></div>
          <div style="padding:1.25rem;flex:1;display:flex;flex-direction:column;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.6rem;">
              <span style="font-size:0.7rem;font-weight:600;color:${c.tagColor};">${c.tag}</span>
              ${c.status === 'completed' ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` : ''}
            </div>
            <h3 style="font-size:0.88rem;font-weight:700;margin-bottom:0.5rem;">${c.title}</h3>
            <p style="font-size:0.75rem;color:var(--muted);line-height:1.5;margin-bottom:0.75rem;flex:1;">${c.desc}</p>
            <div style="display:flex;gap:1rem;font-size:0.72rem;color:var(--muted);margin-bottom:0.75rem;">
              <span style="display:flex;align-items:center;gap:0.25rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${c.hours}</span>
              <span style="display:flex;align-items:center;gap:0.25rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>${c.modules}</span>
            </div>
            <div class="progress-wrap" style="margin-bottom:0.85rem;">
              <div class="progress-label"><span>Progress</span><span>${c.progress}%</span></div>
              <div class="progress-bar"><div class="progress-fill" style="width:${c.progress}%;background:${c.accentColor};"></div></div>
            </div>
            ${courseBtn(c)}
          </div>
        </div>`).join('')}
    </div>
  `;
}

function setFilter(f) { activeFilter = f; renderCourses(); }
renderCourses();
