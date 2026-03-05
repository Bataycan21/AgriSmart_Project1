// ============================================================
// SUPABASE SETUP INSTRUCTIONS FOR GITHUB COPILOT
// ============================================================
// TABLE: elearning_modules
// - id           (int8, primary key, auto increment)
// - tag          (text)
// - tag_color    (text) — hex color string
// - accent       (text) — hex color string
// - title        (text)
// - desc         (text)
// - hours        (text) e.g. '2 hours'
// - modules      (text) e.g. '6 modules'
// - enabled      (bool, default true)
// - created_at   (timestamptz, default now())
//
// TODO: SUPABASE — on page load fetch modules:
// const { data: courses } = await supabase.from('elearning_modules').select('*').order('id')
//
// TODO: SUPABASE — on toggle enabled:
// await supabase.from('elearning_modules').update({ enabled }).eq('id', id)
//
// TODO: SUPABASE — on create module (after Gemini generates desc/hours/modules):
// await supabase.from('elearning_modules').insert({ tag, tag_color, accent, title, desc, hours, modules, enabled: true })
//
// TODO: SUPABASE — on delete module:
// await supabase.from('elearning_modules').delete().eq('id', id)
//
// RLS: admin/supervisor = ALL | workers = SELECT WHERE enabled = true
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

  renderShell('elearning');


  // TODO: SUPABASE — replace this array with fetch from elearning_modules table
  let courses = [
    { id:1, tag:'Soil Science',     tagColor:'#2D5A27', accent:'#2D5A27', title:'Soil Health Assessment Fundamentals',  desc:'Learn how to assess soil quality, understand pH levels, and optimize soil conditions for different crops.',       hours:'2 hours',   modules:'6 modules',  enabled:true  },
    { id:2, tag:'Farming Methods',  tagColor:'#f59e0b', accent:'#f59e0b', title:'Organic Farming Techniques',            desc:'Master organic farming methods including composting, natural pest control, and crop rotation strategies.',         hours:'3 hours',   modules:'8 modules',  enabled:true  },
    { id:3, tag:'Water Management', tagColor:'#3b82f6', accent:'#3b82f6', title:'Irrigation Systems & Water Management', desc:'Understand different irrigation methods, water conservation techniques, and smart irrigation scheduling.',        hours:'2.5 hours', modules:'7 modules',  enabled:true  },
    { id:4, tag:'Crop Protection',  tagColor:'#ef4444', accent:'#ef4444', title:'Pest & Disease Identification',          desc:'Identify common crop pests and diseases. Learn prevention and treatment strategies for healthy crops.',            hours:'2 hours',   modules:'5 modules',  enabled:true  },
    { id:5, tag:'Sustainability',   tagColor:'#22c55e', accent:'#22c55e', title:'Sustainable Agriculture Practices',     desc:'Explore sustainable farming practices aligned with SDG 2 and SDG 12 for responsible production.',                  hours:'4 hours',   modules:'10 modules', enabled:true  },
    { id:6, tag:'Safety',           tagColor:'#f59e0b', accent:'#f59e0b', title:'Farm Equipment Safety & Maintenance',   desc:'Safety protocols for operating farm equipment and routine maintenance procedures to prevent accidents.',         hours:'1.5 hours', modules:'4 modules',  enabled:false },
  ];

  const courseProgress = {};
  courses.forEach(c => { courseProgress[c.id] = 0; });

  let elFilter       = 'All';
  let activeModule   = null;
  let generatedCache = {};
  let adminTab       = 'modules';   // 'modules' | 'manage'
  let createModal    = false;
  let createLoading  = false;
  let nextId         = 7;

  // ── TAG COLOR OPTIONS ──────────────────────────────────────
  const TAG_COLORS = [
    { label:'Green',  value:'#2D5A27' },
    { label:'Orange', value:'#f59e0b' },
    { label:'Blue',   value:'#3b82f6' },
    { label:'Red',    value:'#ef4444' },
    { label:'Teal',   value:'#22c55e' },
    { label:'Purple', value:'#8b5cf6' },
  ];

  // ── HELPERS ────────────────────────────────────────────────
  function getStatus(id) {
    const p = courseProgress[id] || 0;
    if (p >= 100) return 'completed';
    if (p > 0)    return 'in-progress';
    return 'not-started';
  }

  function updateProgress(courseId, currentSlide, totalSlides) {
    const totalSteps = totalSlides + 1;
    const p = Math.round(((currentSlide + 1) / totalSteps) * 100);
    courseProgress[courseId] = Math.min(p, 99);
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

  function filterBtn(label) {
    const a = elFilter === label;
    return `<button onclick="EL.setFilter('${label}')" style="padding:.4rem 1rem;border-radius:8px;font-family:'Poppins',sans-serif;font-size:.8rem;font-weight:${a?'600':'500'};cursor:pointer;border:1.5px solid ${a?'var(--green-dark)':'var(--border)'};background:${a?'var(--green-dark)':'white'};color:${a?'white':'var(--muted)'};transition:all .2s;">${label}</button>`;
  }

  // ── GEMINI API ─────────────────────────────────────────────
  async function callGemini(prompt) {
    const res = await fetch(
      '/api/gemini',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    );
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
      if (overviewMatch) { summary.overview   = overviewMatch[1].trim(); }
      if (takewayMatch)  { summary.takeaways  = takewayMatch[1].split('|').map(t=>t.trim()).filter(t=>t); }
    }
    return { slides, summary };
  }

  // ── Gemini: generate module META (desc, hours, modules count) for Create Modal
  async function generateModuleMeta(title, topic) {
    const prompt = `You are an agricultural training content designer.
Given this course title: "${title}"
And this topic/focus: "${topic}"

Reply ONLY in this exact format, no extra text:
DESC: <one sentence description of the course, max 20 words>
HOURS: <estimated hours e.g. "2 hours">
MODULES: <number of modules e.g. "6 modules">`;
    const raw = await callGemini(prompt);
    const desc    = (raw.match(/^DESC:\s*(.+)/im)    || [])[1]?.trim() || title;
    const hours   = (raw.match(/^HOURS:\s*(.+)/im)   || [])[1]?.trim() || '2 hours';
    const modules = (raw.match(/^MODULES:\s*(.+)/im) || [])[1]?.trim() || '5 modules';
    return { desc, hours, modules };
  }

  // ── MODULE OVERLAY (same as worker) ───────────────────────
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

          <!-- Header -->
          <div style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <div>
              <div style="font-size:.7rem;font-weight:600;color:${course.accent};margin-bottom:.2rem;">${course.tag}</div>
              <div style="font-size:1rem;font-weight:700;">${course.title}</div>
            </div>
            <button onclick="EL.closeModule()" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;border-radius:6px;">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Body -->
          <div style="flex:1;overflow-y:auto;padding:1.5rem;">
            ${loading ? `
              <div style="text-align:center;padding:3rem 1rem;">
                <div style="width:48px;height:48px;border:3px solid #e5e7eb;border-top-color:${course.accent};border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 1rem;"></div>
                <div style="font-size:.85rem;color:var(--muted);">Gemini AI is generating your lesson...</div>
              </div>
              <style>@keyframes spin{to{transform:rotate(360deg);}}</style>
            ` : error ? `
              <div style="text-align:center;padding:3rem 1rem;color:var(--red);">
                <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin:0 auto .75rem;display:block;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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
                  <div style="font-size:.8rem;font-weight:700;color:var(--text);margin-bottom:.75rem;display:flex;align-items:center;gap:.4rem;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${course.accent}" stroke-width="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    KEY TAKEAWAYS
                  </div>
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
                <h2 style="font-size:1.1rem;font-weight:700;margin-bottom:1rem;color:var(--text);">${slide.title}</h2>
                <p style="font-size:.85rem;line-height:1.7;color:#374151;margin-bottom:1.25rem;">${slide.content}</p>
                ${slide.keyPoints?.length ? `
                  <div style="background:#f9fafb;border-radius:12px;padding:1.25rem;">
                    <div style="font-size:.78rem;font-weight:700;color:var(--text);margin-bottom:.75rem;display:flex;align-items:center;gap:.4rem;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      KEY POINTS
                    </div>
                    ${slide.keyPoints.map(kp=>`
                      <div style="display:flex;align-items:flex-start;gap:.5rem;font-size:.8rem;margin-bottom:.35rem;">
                        <span style="color:${course.accent};font-weight:700;flex-shrink:0;">•</span><span>${kp}</span>
                      </div>`).join('')}
                  </div>` : ''}
              `;
            })()}
          </div>

          <!-- Footer -->
          ${!loading && !error ? `
            <div style="padding:1rem 1.5rem;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#fafafa;">
              <button onclick="EL.prevSlide()" class="btn btn-ghost" style="${isFirst?'opacity:.35;pointer-events:none;':''}" ${isFirst?'disabled':''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                Previous
              </button>
              <div style="display:flex;gap:6px;align-items:center;">
                ${slides.map((_,i)=>`<div style="width:8px;height:8px;border-radius:50%;background:${i===currentSlide&&!showSummary?course.accent:'#e5e7eb'};transition:background .2s;"></div>`).join('')}
                <div style="width:8px;height:8px;border-radius:50%;background:${showSummary?course.accent:'#e5e7eb'};transition:background .2s;"></div>
              </div>
              <button onclick="${showSummary?'EL.closeModule()':'EL.nextSlide()'}" class="btn btn-primary" style="background:${course.accent};">
                ${showSummary ? 'Finish Course' : isLast ? 'View Summary' : 'Next'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="${showSummary?'20 6 9 17 4 12':'9 18 15 12 9 6'}"/></svg>
              </button>
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
              <div style="font-size:1.05rem;font-weight:700;color:var(--text);">Create New Module</div>
              <div style="font-size:.75rem;color:var(--muted);margin-top:2px;">Gemini AI will generate the lesson content</div>
            </div>
            <button onclick="EL.closeCreate()" style="background:none;border:none;cursor:pointer;color:var(--muted);display:flex;padding:4px;border-radius:6px;">
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
              <textarea id="cm_topic" placeholder="e.g. Cover the importance of nitrogen, phosphorus and potassium cycles in farming soil. Include practical testing methods." rows="3"
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
                    style="width:28px;height:28px;border-radius:50%;background:${tc.value};border:3px solid ${tc.value};cursor:pointer;transition:border .15s;"
                    title="${tc.label}"></button>`).join('')}
              </div>
              <input type="hidden" id="cm_color" value="#2D5A27"/>
            </div>

            <div style="background:#f0fdf4;border:1px solid #dcfce7;border-radius:10px;padding:.75rem 1rem;display:flex;align-items:center;gap:.6rem;">
              <svg width="16" height="16" fill="none" stroke="#2D5A27" stroke-width="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span style="font-size:.75rem;color:#2D5A27;font-weight:500;">Gemini AI will auto-generate the description, estimated hours, and module count based on your title and topic.</span>
            </div>

            ${createLoading ? `
              <div style="text-align:center;padding:1rem;">
                <div style="width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:var(--green-dark);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto .5rem;"></div>
                <div style="font-size:.8rem;color:var(--muted);">Gemini is building your module...</div>
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
      elFilter === 'All'         ? true :
      elFilter === 'In Progress' ? getStatus(c.id) === 'in-progress' :
      elFilter === 'Completed'   ? getStatus(c.id) === 'completed'   :
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

      <!-- Admin Tabs -->
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

      <!-- PREVIEW TAB — same as worker view -->
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
                    <span style="display:flex;align-items:center;gap:.25rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${c.hours}</span>
                    <span style="display:flex;align-items:center;gap:.25rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>${c.modules}</span>
                    <span style="display:flex;align-items:center;gap:.25rem;color:#2D5A27;font-weight:600;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>AI</span>
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

      <!-- MANAGE TAB — toggle/delete/create -->
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
                    <!-- Toggle switch -->
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

    // Highlight selected color button
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

    toggle(id) {
      // TODO: SUPABASE — await supabase.from('elearning_modules').update({ enabled: !course.enabled }).eq('id', id)
      const c = courses.find(c => c.id === id);
      if (c) { c.enabled = !c.enabled; render(); }
    },

    deleteModule(id) {
      if (!confirm('Delete this module? This cannot be undone.')) return;
      // TODO: SUPABASE — await supabase.from('elearning_modules').delete().eq('id', id)
      courses = courses.filter(c => c.id !== id);
      delete courseProgress[id];
      delete generatedCache[id];
      render();
    },

    openCreate() {
      createModal = true;
      render();
      // Set default color highlight
      const btn = document.getElementById('colorBtn_2D5A27');
      if (btn) btn.style.border = '3px solid black';
    },

    closeCreate() {
      createModal = false;
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
        const meta = await generateModuleMeta(title, topic);

        const newCourse = {
          id:       nextId++,
          tag:      tag,
          tagColor: color,
          accent:   color,
          title:    title,
          desc:     meta.desc,
          hours:    meta.hours,
          modules:  meta.modules,
          enabled:  true,
        };

        // TODO: SUPABASE — replace courses.push() with:
        // const { data } = await supabase.from('elearning_modules').insert({
        //   tag, tag_color: color, accent: color, title, desc: meta.desc,
        //   hours: meta.hours, modules: meta.modules, enabled: true
        // }).select().single()
        // newCourse.id = data.id
        courses.push(newCourse);
        courseProgress[newCourse.id] = 0;

        createModal   = false;
        createLoading = false;
        adminTab      = 'manage';
        render();

      } catch (err) {
        createLoading = false;
        alert('Gemini error: ' + err.message);
        render();
      }
    },

    async openModule(id) {
      const course = courses.find(c => c.id === id);
      if (!course) return;

      // use cache so re-opening doesn't re-generate
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

        const raw  = await callGemini(prompt);
        const parsed = parseGeminiResponse(raw);
        generatedCache[id] = { slides: parsed.slides, summary: parsed.summary };
        activeModule = { courseId: id, slides: parsed.slides, summary: parsed.summary, currentSlide: 0, showSummary: false };
      } catch (err) {
        activeModule = { courseId: id, error: err.message };
      }
      render();
    },

    closeModule() {
      activeModule = null;
      render();
    },

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

  // Also add to admin nav if missing — ensure elearning is in ADMIN_NAV
  // TODO: make sure admin.js ADMIN_NAV has: { id:'elearning', label:'E-Learning', href:'admin-elearning.html', icon:... }

  render();

});