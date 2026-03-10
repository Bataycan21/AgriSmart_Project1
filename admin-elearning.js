// admin-elearning.js  —  AgriSmart Admin E-Learning (Supabase-connected)
// Replaces all hardcoded course arrays with live reads/writes to elearning_modules table.

document.addEventListener('DOMContentLoaded', async function () {

  renderShell('elearning');

  // ── STATE ──────────────────────────────────────────────────
  let courses        = [];   // loaded from Supabase
  let elFilter       = 'All';
  let activeModule   = null;
  let generatedCache = {};
  let adminTab       = 'modules';   // 'modules' | 'manage'
  let createModal    = false;
  let createLoading  = false;

  const courseProgress = {};

  // ── TAG COLOR OPTIONS ──────────────────────────────────────
  const TAG_COLORS = [
    { label:'Green',  value:'#2D5A27' },
    { label:'Orange', value:'#f59e0b' },
    { label:'Blue',   value:'#3b82f6' },
    { label:'Red',    value:'#ef4444' },
    { label:'Teal',   value:'#22c55e' },
    { label:'Purple', value:'#8b5cf6' },
  ];

  // ── SUPABASE HELPERS ───────────────────────────────────────

  /** Load all modules (admin sees ALL, including disabled) */
  async function loadModules() {
    const { data, error } = await window.db
      .from('elearning_modules')
      .select('*')
      .order('id');

    if (error) {
      console.error('[Admin eLearning] loadModules:', error.message);
      return;
    }

    // Map DB column "description" → local "desc" so render templates don't change
    courses = (data || []).map(row => ({
      id:       row.id,
      tag:      row.tag,
      tagColor: row.tag_color,
      accent:   row.accent,
      title:    row.title,
      desc:     row.description,
      hours:    row.hours,
      modules:  row.modules,
      enabled:  row.enabled,
    }));

    // Init progress tracker for any new course ids
    courses.forEach(c => {
      if (courseProgress[c.id] === undefined) courseProgress[c.id] = 0;
    });
  }

  /** Toggle enabled flag for a single module */
  async function toggleModule(id, newEnabled) {
    const { error } = await window.db
      .from('elearning_modules')
      .update({ enabled: newEnabled })
      .eq('id', id);

    if (error) {
      console.error('[Admin eLearning] toggle:', error.message);
      alert('Failed to update module visibility. Please try again.');
      // Revert local state
      const c = courses.find(c => c.id === id);
      if (c) c.enabled = !newEnabled;
      render();
    }
  }

  /** Delete a module */
  async function deleteModuleDB(id) {
    const { error } = await window.db
      .from('elearning_modules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Admin eLearning] delete:', error.message);
      alert('Failed to delete module. Please try again.');
      await loadModules();
      render();
    }
  }

  /** Insert a new module and return the created row */
  async function insertModule(payload) {
    const { data, error } = await window.db
      .from('elearning_modules')
      .insert({
        tag:         payload.tag,
        tag_color:   payload.tagColor,
        accent:      payload.accent,
        title:       payload.title,
        description: payload.desc,
        hours:       payload.hours,
        modules:     payload.modules,
        enabled:     true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // ── PROGRESS ───────────────────────────────────────────────
  function getStatus(id) {
    const p = courseProgress[id] || 0;
    if (p >= 100) return 'completed';
    if (p > 0)    return 'in-progress';
    return 'not-started';
  }

  function updateProgress(courseId, currentSlide, totalSlides) {
    const p = Math.min(Math.round(((currentSlide + 1) / (totalSlides + 1)) * 100), 99);
    courseProgress[courseId] = p;
    updateCardProgress(courseId);
  }

  function markComplete(courseId) {
    courseProgress[courseId] = 100;
    updateCardProgress(courseId);
  }

  function updateCardProgress(courseId) {
    const p      = courseProgress[courseId] || 0;
    const status = getStatus(courseId);
    const bar    = document.getElementById(`bar-${courseId}`);
    const pct    = document.getElementById(`pct-${courseId}`);
    const badge  = document.getElementById(`badge-${courseId}`);
    if (bar)   bar.style.width = `${p}%`;
    if (pct)   pct.textContent = `${p}%`;
    if (badge) badge.innerHTML = status === 'completed'
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
      : '';
  }

  // ── GEMINI API ─────────────────────────────────────────────
  async function callGemini(prompt) {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(`Gemini error: ${data.error.message}`);
    if (!data.candidates?.[0]) throw new Error('No response from Gemini');
    return data.candidates[0].content.parts[0].text;
  }

  function parseGeminiResponse(text) {
    const lines   = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const slides  = [];
    const summary = { title: 'Course Summary', overview: '', takeaways: [] };
    for (let i = 1; i <= 5; i++) slides.push({ slideNumber: i, title: '', content: '', keyPoints: [] });
    for (const line of lines) {
      const titleMatch    = line.match(/^SLIDE\s*(\d)\s*TITLE\s*:\s*(.+)/i);
      const contentMatch  = line.match(/^SLIDE\s*(\d)\s*CONTENT\s*:\s*(.+)/i);
      const pointsMatch   = line.match(/^SLIDE\s*(\d)\s*POINTS\s*:\s*(.+)/i);
      const overviewMatch = line.match(/^SUMMARY\s*OVERVIEW\s*:\s*(.+)/i);
      const takewayMatch  = line.match(/^SUMMARY\s*TAKEAWAYS\s*:\s*(.+)/i);
      if (titleMatch)    { const i=parseInt(titleMatch[1])-1;   if(slides[i]) slides[i].title    = titleMatch[2].trim(); }
      if (contentMatch)  { const i=parseInt(contentMatch[1])-1; if(slides[i]) slides[i].content  = contentMatch[2].trim(); }
      if (pointsMatch)   { const i=parseInt(pointsMatch[1])-1;  if(slides[i]) slides[i].keyPoints= pointsMatch[2].split('|').map(p=>p.trim()).filter(p=>p); }
      if (overviewMatch) { summary.overview  = overviewMatch[1].trim(); }
      if (takewayMatch)  { summary.takeaways = takewayMatch[1].split('|').map(t=>t.trim()).filter(t=>t); }
    }
    return { slides, summary };
  }

  async function generateModuleMeta(title, topic) {
    const prompt = `You are an agricultural training content designer.
Given this course title: "${title}"
And this topic/focus: "${topic}"

Reply ONLY in this exact format, no extra text:
DESC: <one sentence description of the course, max 20 words>
HOURS: <estimated hours e.g. "2 hours">
MODULES: <number of modules e.g. "6 modules">`;
    const raw  = await callGemini(prompt);
    const desc    = (raw.match(/^DESC:\s*(.+)/im)    || [])[1]?.trim() || title;
    const hours   = (raw.match(/^HOURS:\s*(.+)/im)   || [])[1]?.trim() || '2 hours';
    const modules = (raw.match(/^MODULES:\s*(.+)/im) || [])[1]?.trim() || '5 modules';
    return { desc, hours, modules };
  }

  // ── FILTER BUTTON ──────────────────────────────────────────
  function filterBtn(label) {
    const a = elFilter === label;
    return `<button onclick="EL.setFilter('${label}')" style="padding:.4rem 1rem;border-radius:8px;font-family:'Poppins',sans-serif;font-size:.8rem;font-weight:${a?'600':'500'};cursor:pointer;border:1.5px solid ${a?'var(--green-dark)':'var(--border)'};background:${a?'var(--green-dark)':'white'};color:${a?'white':'var(--muted)'};transition:all .2s;">${label}</button>`;
  }

  // ── MODULE OVERLAY ─────────────────────────────────────────
  function renderModuleOverlay() {
    const course       = courses.find(c => c.id === activeModule.courseId);
    const loading      = activeModule.loading;
    const error        = activeModule.error;
    const slides       = activeModule.slides       || [];
    const summary      = activeModule.summary      || {};
    const currentSlide = activeModule.currentSlide || 0;
    const showSummary  = activeModule.showSummary  || false;
    const isFirst      = currentSlide === 0;
    const isLast       = currentSlide === slides.length - 1;

    return `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:300;display:flex;align-items:center;justify-content:center;padding:1rem;">
        <div style="background:white;border-radius:20px;width:100%;max-width:720px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.25);">
          <div style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <div>
              <div style="font-size:.7rem;font-weight:600;color:${course.accent};margin-bottom:.2rem;">${course.tag}</div>
              <div style="font-size:1rem;font-weight:700;">${course.title}</div>
            </div>
            <button onclick="EL.closeModule()" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;border-radius:6px;">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style="flex:1;overflow-y:auto;padding:1.5rem;">
            ${loading ? `
              <div style="text-align:center;padding:3rem 1rem;">
                <div style="width:48px;height:48px;border:3px solid #e5e7eb;border-top-color:${course.accent};border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 1rem;"></div>
                <div style="font-size:.85rem;color:var(--muted);">Gemini AI is generating your lesson...</div>
              </div>
              <style>@keyframes spin{to{transform:rotate(360deg);}}</style>
            ` : error ? `
              <div style="text-align:center;padding:3rem 1rem;color:var(--red);">
                <div style="font-size:.85rem;">${error}</div>
                <button onclick="EL.openModule(${course.id})" class="btn btn-primary" style="margin-top:1rem;">Try Again</button>
              </div>
            ` : showSummary ? `
              <div style="text-align:center;margin-bottom:1.5rem;">
                <div style="width:64px;height:64px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto .75rem;">
                  <svg width="32" height="32" fill="none" stroke="#22c55e" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div style="font-size:1.1rem;font-weight:700;margin-bottom:.4rem;">Course Complete!</div>
                <div style="font-size:.82rem;color:var(--muted);">${summary.overview || ''}</div>
              </div>
              ${summary.takeaways?.length ? `
                <div style="background:#f9fafb;border-radius:12px;padding:1.25rem;">
                  <div style="font-size:.8rem;font-weight:700;margin-bottom:.75rem;">KEY TAKEAWAYS</div>
                  ${summary.takeaways.map(t=>`
                    <div style="display:flex;align-items:flex-start;gap:.5rem;margin-bottom:.5rem;font-size:.82rem;">
                      <span style="color:${course.accent};font-weight:700;flex-shrink:0;">✓</span><span>${t}</span>
                    </div>`).join('')}
                </div>` : ''}
            ` : (() => {
              const slide = slides[currentSlide];
              if (!slide) return '';
              return `
                <div style="margin-bottom:.5rem;font-size:.72rem;color:var(--muted);font-weight:600;">SLIDE ${slide.slideNumber} OF ${slides.length}</div>
                <h2 style="font-size:1.1rem;font-weight:700;margin-bottom:1rem;">${slide.title}</h2>
                <p style="font-size:.85rem;line-height:1.7;margin-bottom:1.25rem;">${slide.content}</p>
                ${slide.keyPoints?.length ? `
                  <div style="background:#f9fafb;border-radius:12px;padding:1.25rem;">
                    <div style="font-size:.78rem;font-weight:700;margin-bottom:.75rem;">KEY POINTS</div>
                    ${slide.keyPoints.map(kp=>`
                      <div style="display:flex;align-items:flex-start;gap:.5rem;font-size:.8rem;margin-bottom:.35rem;">
                        <span style="color:${course.accent};font-weight:700;flex-shrink:0;">•</span><span>${kp}</span>
                      </div>`).join('')}
                  </div>` : ''}
              `;
            })()}
          </div>
          ${!loading && !error ? `
            <div style="padding:1rem 1.5rem;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#fafafa;">
              <button onclick="EL.prevSlide()" class="btn btn-ghost" style="${isFirst?'opacity:.35;pointer-events:none;':''}" ${isFirst?'disabled':''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg> Previous
              </button>
              <div style="display:flex;gap:6px;align-items:center;">
                ${slides.map((_,i)=>`<div style="width:8px;height:8px;border-radius:50%;background:${i===currentSlide&&!showSummary?course.accent:'#e5e7eb'};"></div>`).join('')}
                <div style="width:8px;height:8px;border-radius:50%;background:${showSummary?course.accent:'#e5e7eb'};"></div>
              </div>
              ${showSummary
                ? `<button onclick="EL.closeModule()" class="btn btn-primary" style="background:${course.accent};">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Finish</button>`
                : `<button onclick="EL.nextSlide()" class="btn btn-primary" style="background:${course.accent};">
                    ${isLast ? 'View Summary' : 'Next'}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>`}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ── CREATE MODULE MODAL ────────────────────────────────────
  function renderCreateModal() {
    return `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:400;display:flex;align-items:center;justify-content:center;padding:1rem;" onclick="EL.closeCreate()">
        <div style="background:white;border-radius:16px;padding:1.75rem 2rem;width:100%;max-width:480px;box-shadow:0 8px 40px rgba(0,0,0,.18);animation:modalIn .22s ease;" onclick="event.stopPropagation()">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.4rem;">
            <div>
              <div style="font-size:1.05rem;font-weight:700;">Create New Module</div>
              <div style="font-size:.75rem;color:var(--muted);margin-top:2px;">Gemini AI will generate the lesson content</div>
            </div>
            <button onclick="EL.closeCreate()" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;border-radius:6px;">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style="display:flex;flex-direction:column;gap:1rem;">
            <div>
              <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">Module Title <span style="color:var(--red);">*</span></label>
              <input id="cm_title" type="text" placeholder="e.g. Advanced Soil Nutrient Management"
                style="width:100%;padding:.6rem .85rem;border:1.5px solid var(--border);border-radius:10px;font-family:'Poppins',sans-serif;font-size:.82rem;background:#f9fafb;outline:none;box-sizing:border-box;"/>
              <div id="cm_title_err" style="color:var(--red);font-size:.72rem;margin-top:3px;display:none;">Title is required.</div>
            </div>
            <div>
              <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">Topic / Focus <span style="color:var(--red);">*</span></label>
              <textarea id="cm_topic" placeholder="e.g. Cover nitrogen, phosphorus and potassium cycles in farming soil." rows="3"
                style="width:100%;padding:.6rem .85rem;border:1.5px solid var(--border);border-radius:10px;font-family:'Poppins',sans-serif;font-size:.82rem;background:#f9fafb;outline:none;resize:vertical;box-sizing:border-box;"></textarea>
              <div id="cm_topic_err" style="color:var(--red);font-size:.72rem;margin-top:3px;display:none;">Topic is required.</div>
            </div>
            <div>
              <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">Tag Label</label>
              <input id="cm_tag" type="text" placeholder="e.g. Soil Science"
                style="width:100%;padding:.6rem .85rem;border:1.5px solid var(--border);border-radius:10px;font-family:'Poppins',sans-serif;font-size:.82rem;background:#f9fafb;outline:none;box-sizing:border-box;"/>
            </div>
            <div>
              <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">Tag Color</label>
              <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
                ${TAG_COLORS.map(tc=>`
                  <button onclick="EL.pickColor('${tc.value}')" id="colorBtn_${tc.value.replace('#','')}"
                    style="width:28px;height:28px;border-radius:50%;background:${tc.value};border:3px solid ${tc.value};cursor:pointer;" title="${tc.label}"></button>`).join('')}
              </div>
              <input type="hidden" id="cm_color" value="#2D5A27"/>
            </div>
            <div style="background:#f0fdf4;border:1px solid #dcfce7;border-radius:10px;padding:.75rem 1rem;display:flex;align-items:center;gap:.6rem;">
              <svg width="16" height="16" fill="none" stroke="#2D5A27" stroke-width="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span style="font-size:.75rem;color:#2D5A27;font-weight:500;">Gemini AI will auto-generate the description, estimated hours, and module count.</span>
            </div>
            ${createLoading ? `
              <div style="text-align:center;padding:1rem;">
                <div style="width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:var(--green-dark);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto .5rem;"></div>
                <div style="font-size:.8rem;color:var(--muted);">Saving to database...</div>
              </div>
            ` : `
              <div style="display:flex;gap:.7rem;margin-top:.25rem;">
                <button onclick="EL.closeCreate()" style="flex:1;background:transparent;color:var(--muted);border:1.5px solid var(--border);padding:.5rem;border-radius:8px;font-family:'Poppins',sans-serif;font-size:.8rem;font-weight:600;cursor:pointer;">Cancel</button>
                <button onclick="EL.createModule()" class="btn btn-primary" style="flex:1;justify-content:center;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  Generate with AI
                </button>
              </div>
            `}
          </div>
        </div>
      </div>
      <style>
        @keyframes modalIn { from{opacity:0;transform:translateY(20px) scale(.97);}to{opacity:1;transform:translateY(0) scale(1);} }
        @keyframes spin    { to{transform:rotate(360deg);} }
      </style>
    `;
  }

  // ── MAIN RENDER ────────────────────────────────────────────
  function render() {
    const visibleCourses = courses.filter(c =>
      elFilter === 'All'          ? true :
      elFilter === 'In Progress'  ? getStatus(c.id) === 'in-progress' :
      elFilter === 'Completed'    ? getStatus(c.id) === 'completed'   :
      getStatus(c.id) === 'not-started'
    );
    const completed  = courses.filter(c => getStatus(c.id) === 'completed').length;
    const inProgress = courses.filter(c => getStatus(c.id) === 'in-progress').length;
    const total      = courses.length;
    const enabled    = courses.filter(c => c.enabled).length;
    const disabled   = courses.filter(c => !c.enabled).length;

    document.getElementById('pageContent').innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.25rem;">
        <div>
          <h1 class="page-title" style="margin-bottom:.2rem;">E-Learning</h1>
          <p class="page-subtitle">Manage and create AI-powered training modules</p>
        </div>
        <button class="btn btn-primary" onclick="EL.openCreate()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Module
        </button>
      </div>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:1rem;margin-bottom:1.5rem;">
        <div class="card" style="display:flex;align-items:center;gap:.75rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
          <div><div style="font-size:1.4rem;font-weight:700;line-height:1;">${completed}</div><div style="font-size:.72rem;color:var(--muted);">Completed</div></div>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:.75rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          <div><div style="font-size:1.4rem;font-weight:700;color:#f59e0b;line-height:1;">${inProgress}</div><div style="font-size:.72rem;color:var(--muted);">In Progress</div></div>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:.75rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          <div><div style="font-size:1.4rem;font-weight:700;color:#3b82f6;line-height:1;">${total}</div><div style="font-size:.72rem;color:var(--muted);">Total Modules</div></div>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:.75rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <div><div style="font-size:1.4rem;font-weight:700;color:#22c55e;line-height:1;">${enabled}</div><div style="font-size:.72rem;color:var(--muted);">Enabled</div></div>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:.75rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          <div><div style="font-size:1.4rem;font-weight:700;color:#ef4444;line-height:1;">${disabled}</div><div style="font-size:.72rem;color:var(--muted);">Disabled</div></div>
        </div>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:1.5rem;">
        <button onclick="EL.adminTab('modules')"
          style="padding:.6rem 1.25rem;border:none;background:none;font-family:'Poppins',sans-serif;font-size:.83rem;font-weight:600;cursor:pointer;border-bottom:2px solid ${adminTab==='modules'?'var(--green-dark)':'transparent'};color:${adminTab==='modules'?'var(--green-dark)':'var(--muted)'};margin-bottom:-2px;">
          Preview Modules
        </button>
        <button onclick="EL.adminTab('manage')"
          style="padding:.6rem 1.25rem;border:none;background:none;font-family:'Poppins',sans-serif;font-size:.83rem;font-weight:600;cursor:pointer;border-bottom:2px solid ${adminTab==='manage'?'var(--green-dark)':'transparent'};color:${adminTab==='manage'?'var(--green-dark)':'var(--muted)'};margin-bottom:-2px;">
          Manage Modules
        </button>
      </div>

      <!-- PREVIEW TAB -->
      ${adminTab === 'modules' ? `
        <div style="display:inline-flex;align-items:center;gap:.5rem;background:linear-gradient(135deg,#f0fdf4,#eff6ff);border:1px solid #dcfce7;border-radius:999px;padding:.35rem .9rem;margin-bottom:1.25rem;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span style="font-size:.75rem;font-weight:600;color:#2D5A27;">Powered by Gemini AI — lessons generated fresh for every session</span>
        </div>
        <div style="display:flex;gap:.5rem;margin-bottom:1.25rem;">
          ${['All','In Progress','Completed','Not Started'].map(filterBtn).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
          ${visibleCourses.map(c => {
            const p      = courseProgress[c.id] || 0;
            const status = getStatus(c.id);
            return `
              <div class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column;${!c.enabled?'opacity:.5;':''}">
                <div style="height:5px;background:${c.accent};"></div>
                <div style="padding:1.25rem;flex:1;display:flex;flex-direction:column;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem;">
                    <span style="font-size:.7rem;font-weight:600;color:${c.tagColor};">${c.tag}</span>
                    <div style="display:flex;align-items:center;gap:.4rem;">
                      ${!c.enabled ? `<span style="font-size:.65rem;font-weight:600;color:#ef4444;background:#fee2e2;padding:.1rem .45rem;border-radius:999px;">Hidden</span>` : ''}
                      <span id="badge-${c.id}">${status==='completed'?`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`:''}</span>
                    </div>
                  </div>
                  <h3 style="font-size:.88rem;font-weight:700;margin-bottom:.5rem;line-height:1.3;">${c.title}</h3>
                  <p style="font-size:.75rem;color:var(--muted);line-height:1.5;margin-bottom:.75rem;flex:1;">${c.desc}</p>
                  <div style="display:flex;gap:1rem;font-size:.72rem;color:var(--muted);margin-bottom:.75rem;">
                    <span>${c.hours}</span><span>${c.modules}</span>
                    <span style="color:#2D5A27;font-weight:600;">⚡ AI</span>
                  </div>
                  <div class="progress-wrap" style="margin-bottom:.85rem;">
                    <div class="progress-label"><span>Progress</span><span id="pct-${c.id}">${p}%</span></div>
                    <div class="progress-bar"><div id="bar-${c.id}" class="progress-fill" style="width:${p}%;background:${c.accent};transition:width .4s ease;"></div></div>
                  </div>
                  <button class="btn ${status==='completed'?'btn-ghost':status==='in-progress'?'btn-primary':'btn-outline'}"
                    style="width:100%;justify-content:center;${status==='in-progress'?`background:${c.accent};`:''}"
                    onclick="EL.openModule(${c.id})" ${!c.enabled?'disabled':''}>
                    ${status==='completed'?'Review Course &nbsp;›':status==='in-progress'?'Continue &nbsp;▷':'Start Course &nbsp;▷'}
                  </button>
                </div>
              </div>`;
          }).join('')}
        </div>
      ` : ''}

      <!-- MANAGE TAB -->
      ${adminTab === 'manage' ? `
        <div class="card" style="padding:0;overflow:hidden;">
          <table>
            <thead>
              <tr>
                <th style="padding-left:1.5rem;">Module Title</th>
                <th>Tag</th>
                <th>Hours</th>
                <th>Modules</th>
                <th>Status</th>
                <th style="text-align:center;">Visible to Workers</th>
                <th style="text-align:right;padding-right:1.5rem;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${courses.map(c=>`
                <tr>
                  <td style="padding-left:1.5rem;">
                    <div style="font-weight:600;font-size:.85rem;">${c.title}</div>
                    <div style="font-size:.72rem;color:var(--muted);margin-top:2px;">${c.desc.substring(0,60)}...</div>
                  </td>
                  <td><span style="font-size:.72rem;font-weight:600;color:${c.tagColor};background:${c.tagColor}18;padding:.2rem .55rem;border-radius:999px;">${c.tag}</span></td>
                  <td style="font-size:.82rem;color:var(--muted);">${c.hours}</td>
                  <td style="font-size:.82rem;color:var(--muted);">${c.modules}</td>
                  <td>
                    ${c.enabled
                      ? `<span class="badge badge-green">Enabled</span>`
                      : `<span class="badge badge-red">Disabled</span>`}
                  </td>
                  <td style="text-align:center;">
                    <label style="position:relative;display:inline-block;width:42px;height:22px;cursor:pointer;">
                      <input type="checkbox" ${c.enabled?'checked':''} onchange="EL.toggle(${c.id})"
                        style="opacity:0;width:0;height:0;position:absolute;"/>
                      <span style="position:absolute;inset:0;background:${c.enabled?'var(--green-dark)':'#d1d5db'};border-radius:999px;transition:background .2s;"></span>
                      <span style="position:absolute;top:3px;left:${c.enabled?'23px':'3px'};width:16px;height:16px;background:white;border-radius:50%;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2);"></span>
                    </label>
                  </td>
                  <td style="text-align:right;padding-right:1.5rem;">
                    <button onclick="EL.openModule(${c.id})" title="Preview" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;">
                      <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button onclick="EL.deleteModule(${c.id})" title="Delete" style="background:none;border:none;cursor:pointer;color:#ef4444;padding:4px;">
                      <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${activeModule ? renderModuleOverlay() : ''}
      ${createModal  ? renderCreateModal()   : ''}
    `;

    // Highlight selected color button in modal
    const colorVal = document.getElementById('cm_color')?.value;
    if (colorVal) {
      TAG_COLORS.forEach(tc => {
        const btn = document.getElementById(`colorBtn_${tc.value.replace('#','')}`);
        if (btn) btn.style.border = `3px solid ${tc.value === colorVal ? 'black' : tc.value}`;
      });
    }
  }

  // ── PUBLIC API ─────────────────────────────────────────────
  window.EL = {

    adminTab(t) { adminTab = t; render(); },
    setFilter(f) { elFilter = f; render(); },

    async toggle(id) {
      const c = courses.find(c => c.id === id);
      if (!c) return;
      c.enabled = !c.enabled;   // optimistic update
      render();
      await toggleModule(id, c.enabled);
    },

    async deleteModule(id) {
      if (!confirm('Delete this module? Workers will immediately lose access. This cannot be undone.')) return;
      courses = courses.filter(c => c.id !== id);
      delete courseProgress[id];
      delete generatedCache[id];
      render();
      await deleteModuleDB(id);
    },

    openCreate() {
      createModal = true;
      render();
      const btn = document.getElementById('colorBtn_2D5A27');
      if (btn) btn.style.border = '3px solid black';
    },

    closeCreate() {
      createModal   = false;
      createLoading = false;
      render();
    },

    pickColor(val) {
      const input = document.getElementById('cm_color');
      if (input) input.value = val;
      TAG_COLORS.forEach(tc => {
        const btn = document.getElementById(`colorBtn_${tc.value.replace('#','')}`);
        if (btn) btn.style.border = `3px solid ${tc.value === val ? 'black' : tc.value}`;
      });
    },

    async createModule() {
      const title = document.getElementById('cm_title')?.value.trim();
      const topic = document.getElementById('cm_topic')?.value.trim();
      const tag   = document.getElementById('cm_tag')?.value.trim()  || 'General';
      const color = document.getElementById('cm_color')?.value       || '#2D5A27';

      document.getElementById('cm_title_err').style.display = !title ? 'block' : 'none';
      document.getElementById('cm_topic_err').style.display = !topic ? 'block' : 'none';
      if (!title || !topic) return;

      createLoading = true;
      render();

      try {
        // 1. Ask Gemini for meta
        const meta = await generateModuleMeta(title, topic);

        // 2. Save to Supabase — get back the real DB id
        const row = await insertModule({
          tag,
          tagColor: color,
          accent:   color,
          title,
          desc:     meta.desc,
          hours:    meta.hours,
          modules:  meta.modules,
        });

        // 3. Add to local state using the DB-assigned id
        const newCourse = {
          id:       row.id,
          tag,
          tagColor: color,
          accent:   color,
          title,
          desc:     meta.desc,
          hours:    meta.hours,
          modules:  meta.modules,
          enabled:  true,
        };
        courses.push(newCourse);
        courseProgress[newCourse.id] = 0;

        createModal   = false;
        createLoading = false;
        adminTab      = 'manage';
        render();

      } catch (err) {
        createLoading = false;
        alert('Error: ' + err.message);
        render();
      }
    },

    async openModule(id) {
      const course = courses.find(c => c.id === id);
      if (!course) return;

      if (generatedCache[id]) {
        activeModule = { courseId: id, ...generatedCache[id], currentSlide: 0, showSummary: false };
        render();
        return;
      }

      activeModule = { courseId: id, loading: true };
      render();

      try {
        const prompt = `You are an expert agricultural trainer. Generate a 5-slide lesson for farm workers.
Course: "${course.title}"
Tag: "${course.tag}"

Reply ONLY in this exact format:
SLIDE 1 TITLE: <title>
SLIDE 1 CONTENT: <2-3 sentence explanation>
SLIDE 1 POINTS: <point1>|<point2>|<point3>
SLIDE 2 TITLE: <title>
SLIDE 2 CONTENT: <2-3 sentence explanation>
SLIDE 2 POINTS: <point1>|<point2>|<point3>
SLIDE 3 TITLE: <title>
SLIDE 3 CONTENT: <2-3 sentence explanation>
SLIDE 3 POINTS: <point1>|<point2>|<point3>
SLIDE 4 TITLE: <title>
SLIDE 4 CONTENT: <2-3 sentence explanation>
SLIDE 4 POINTS: <point1>|<point2>|<point3>
SLIDE 5 TITLE: <title>
SLIDE 5 CONTENT: <2-3 sentence explanation>
SLIDE 5 POINTS: <point1>|<point2>|<point3>
SUMMARY OVERVIEW: <one sentence summary>
SUMMARY TAKEAWAYS: <takeaway1>|<takeaway2>|<takeaway3>|<takeaway4>`;

        const raw    = await callGemini(prompt);
        const parsed = parseGeminiResponse(raw);
        generatedCache[id] = { slides: parsed.slides, summary: parsed.summary };
        activeModule = { courseId: id, ...generatedCache[id], currentSlide: 0, showSummary: false };
      } catch (err) {
        activeModule = { courseId: id, error: err.message };
      }
      render();
    },

    closeModule() { activeModule = null; render(); },

    nextSlide() {
      if (!activeModule) return;
      const slides = activeModule.slides || [];
      if (activeModule.currentSlide < slides.length - 1) {
        activeModule.currentSlide++;
        updateProgress(activeModule.courseId, activeModule.currentSlide, slides.length);
      } else {
        activeModule.showSummary = true;
        markComplete(activeModule.courseId);
      }
      render();
    },

    prevSlide() {
      if (!activeModule || activeModule.currentSlide <= 0) return;
      activeModule.showSummary = false;
      activeModule.currentSlide--;
      render();
    },
  };

  // ── INIT: load from Supabase then render ───────────────────
  await loadModules();
  render();

});