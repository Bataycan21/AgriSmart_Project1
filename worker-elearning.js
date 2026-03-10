// worker-elearning.js  —  AgriSmart Worker E-Learning (Supabase-connected)
// Fetches only enabled=true modules from elearning_modules table.
// Admin hide/show/add actions are instantly reflected here on next page load.

document.addEventListener('DOMContentLoaded', async function () {

  renderShell('elearning');

  const session = Auth.getSession();

  // ── LOAD MODULES FROM SUPABASE ─────────────────────────────
  // RLS ensures workers only receive rows where enabled = true
  let courses = [];

  async function loadModules() {
    const { data, error } = await window.db
      .from('elearning_modules')
      .select('id, tag, tag_color, accent, title, description, hours, modules')
      .order('id');

    if (error) {
      console.error('[Worker eLearning] loadModules:', error.message);
      return;
    }

    courses = (data || []).map(row => ({
      id:       row.id,
      tag:      row.tag,
      tagColor: row.tag_color,
      accent:   row.accent,
      title:    row.title,
      desc:     row.description,
      hours:    row.hours,
      modules:  row.modules,
    }));
  }

  // ── PROGRESS ───────────────────────────────────────────────
  const courseProgress = {};

  async function loadProgress() {
    const { data, error } = await window.db
      .from('elearning_progress')
      .select('module_id, progress')
      .eq('worker_id', session.worker_id);

    if (error) { console.error('[Worker eLearning] loadProgress:', error.message); return; }
    (data || []).forEach(row => { courseProgress[row.module_id] = row.progress; });
  }

  async function saveProgress(courseId, pct) {
    const { error } = await window.db
      .from('elearning_progress')
      .upsert({
        worker_id:  session.worker_id,
        module_id:  courseId,
        progress:   pct,
        completed:  pct >= 100,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'worker_id,module_id' });

    if (error) console.error('[Worker eLearning] saveProgress:', error.message);
  }

  // ── STATE ──────────────────────────────────────────────────
  let elFilter       = 'All';
  let activeModule   = null;
  let generatedCache = {};

  function getStatus(id) {
    const p = courseProgress[id] || 0;
    if (p >= 100) return 'completed';
    if (p > 0)    return 'in-progress';
    return 'not-started';
  }

  function updateProgress(courseId, currentSlide, totalSlides) {
    const p = Math.min(Math.round(((currentSlide + 1) / (totalSlides + 1)) * 100), 99);
    courseProgress[courseId] = p;
    saveProgress(courseId, p);
    updateCardProgress(courseId);
  }

  function markComplete(courseId) {
    courseProgress[courseId] = 100;
    saveProgress(courseId, 100);
    updateCardProgress(courseId);
  }

  function updateCardProgress(courseId) {
    const p      = courseProgress[courseId] || 0;
    const status = getStatus(courseId);
    const bar    = document.getElementById(`bar-${courseId}`);
    const pct    = document.getElementById(`pct-${courseId}`);
    const badge  = document.getElementById(`badge-${courseId}`);
    if (bar)   bar.style.width   = `${p}%`;
    if (pct)   pct.textContent   = `${p}%`;
    if (badge) badge.innerHTML   = status === 'completed'
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
      : '';
  }

  function filterBtn(label) {
    const a = elFilter === label;
    return `<button onclick="elSetFilter('${label}')" style="padding:0.4rem 1rem;border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.8rem;font-weight:${a?'600':'500'};cursor:pointer;border:1.5px solid ${a?'var(--green-dark)':'var(--border)'};background:${a?'var(--green-dark)':'white'};color:${a?'white':'var(--muted)'};transition:all 0.2s;">${label}</button>`;
  }

  // ── GEMINI API ─────────────────────────────────────────────
  async function callGemini(prompt) {
    const res = await fetch('/api/gemini', {
      method:  'POST',
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
      if (titleMatch)    { const i = parseInt(titleMatch[1])-1;   if(slides[i]) slides[i].title    = titleMatch[2].trim(); }
      if (contentMatch)  { const i = parseInt(contentMatch[1])-1; if(slides[i]) slides[i].content  = contentMatch[2].trim(); }
      if (pointsMatch)   { const i = parseInt(pointsMatch[1])-1;  if(slides[i]) slides[i].keyPoints= pointsMatch[2].split('|').map(p=>p.trim()).filter(p=>p); }
      if (overviewMatch) { summary.overview  = overviewMatch[1].trim(); }
      if (takewayMatch)  { summary.takeaways = takewayMatch[1].split('|').map(t=>t.trim()).filter(t=>t); }
    }
    slides.forEach((s, i) => {
      if (!s.title)            s.title     = `Lesson ${i + 1}`;
      if (!s.content)          s.content   = 'Content is being prepared. Please try again.';
      if (!s.keyPoints.length) s.keyPoints = ['Key point 1', 'Key point 2', 'Key point 3'];
    });
    if (!summary.overview)         summary.overview  = 'This course covered essential agricultural practices.';
    if (!summary.takeaways.length) summary.takeaways = ['Apply what you learned','Practice regularly','Share with fellow workers','Review the slides again','Ask your supervisor for guidance'];
    return { slides, summary };
  }

  async function generateModule(course) {
    if (generatedCache[course.id]) return generatedCache[course.id];
    const prompt = `You are an expert agricultural trainer for farm workers in the Philippines.

Create a 5-slide training module for this course:
Course Title: "${course.title}"
Course Topic: "${course.desc}"

Reply using EXACTLY this format, line by line. Do not add any extra text, greetings, or explanation outside of these lines:

SLIDE 1 TITLE: (write the slide title here)
SLIDE 1 CONTENT: (write 2-3 sentences of practical lesson content for Filipino farm workers in simple English)
SLIDE 1 POINTS: (point 1) | (point 2) | (point 3)

SLIDE 2 TITLE: (write the slide title here)
SLIDE 2 CONTENT: (write 2-3 sentences of practical lesson content)
SLIDE 2 POINTS: (point 1) | (point 2) | (point 3)

SLIDE 3 TITLE: (write the slide title here)
SLIDE 3 CONTENT: (write 2-3 sentences of practical lesson content)
SLIDE 3 POINTS: (point 1) | (point 2) | (point 3)

SLIDE 4 TITLE: (write the slide title here)
SLIDE 4 CONTENT: (write 2-3 sentences of practical lesson content)
SLIDE 4 POINTS: (point 1) | (point 2) | (point 3)

SLIDE 5 TITLE: (write the slide title here)
SLIDE 5 CONTENT: (write 2-3 sentences of practical lesson content)
SLIDE 5 POINTS: (point 1) | (point 2) | (point 3)

SUMMARY OVERVIEW: (write 2 sentences summarizing the whole course)
SUMMARY TAKEAWAYS: (takeaway 1) | (takeaway 2) | (takeaway 3) | (takeaway 4) | (takeaway 5)`;

    const raw    = await callGemini(prompt);
    const parsed = parseGeminiResponse(raw);
    generatedCache[course.id] = parsed;
    return parsed;
  }

  // ── MODULE OVERLAY ─────────────────────────────────────────
  function renderModuleOverlay() {
    const { course, slides, currentSlide, loading, error, summary, showSummary } = activeModule;
    const total    = slides.length;
    const isFirst  = currentSlide === 0 && !showSummary;
    const isLast   = currentSlide === slides.length - 1;
    const progress = showSummary ? 100 : total > 0 ? Math.round(((currentSlide + 1) / (total + 1)) * 100) : 0;

    return `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;" onclick="elCloseModule()">
        <div style="background:white;border-radius:20px;width:100%;max-width:760px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.2);overflow:hidden;" onclick="event.stopPropagation()">

          <div style="background:${course.accent};padding:1.25rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              </div>
              <div>
                <div style="color:white;font-weight:700;font-size:0.95rem;line-height:1.2;">${course.title}</div>
                <div style="color:rgba(255,255,255,0.75);font-size:0.72rem;">${course.tag}</div>
              </div>
            </div>
            <button onclick="elCloseModule()" style="background:rgba(255,255,255,0.2);border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div style="height:4px;background:#f3f4f6;flex-shrink:0;">
            <div style="height:100%;background:${course.accent};width:${progress}%;transition:width 0.4s ease;"></div>
          </div>

          <div style="flex:1;overflow-y:auto;padding:1.75rem;">
            ${loading ? `
              <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem;text-align:center;">
                <div style="width:56px;height:56px;border:3px solid #f3f4f6;border-top-color:${course.accent};border-radius:50%;animation:elSpin 0.8s linear infinite;margin-bottom:1.25rem;"></div>
                <div style="font-weight:700;font-size:1rem;margin-bottom:0.4rem;">Generating your lesson...</div>
                <div style="font-size:0.8rem;color:var(--muted);">Gemini AI is preparing your personalized module</div>
              </div>
              <style>@keyframes elSpin { to { transform:rotate(360deg) } }</style>
            ` : error ? `
              <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem;text-align:center;">
                <div style="width:56px;height:56px;background:#fff5f5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:1rem;">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div style="font-weight:700;font-size:1rem;color:#ef4444;margin-bottom:0.4rem;">Failed to load module</div>
                <div style="font-size:0.8rem;color:var(--muted);margin-bottom:1rem;">${error}</div>
                <button onclick="elRetry(${course.id})" class="btn btn-primary" style="background:${course.accent};">Try Again</button>
              </div>
            ` : showSummary ? `
              <div>
                <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:1.5rem;">
                  <div style="width:38px;height:38px;background:${course.accent}22;border-radius:10px;display:flex;align-items:center;justify-content:center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${course.accent}" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
                  </div>
                  <div>
                    <div style="font-weight:700;font-size:1.1rem;">${summary.title}</div>
                    <div style="font-size:0.75rem;color:var(--muted);">Course complete!</div>
                  </div>
                  <span class="badge badge-green" style="margin-left:auto;">✓ Completed</span>
                </div>
                <div style="background:#f8fffe;border:1px solid #dcfce7;border-radius:12px;padding:1.25rem;margin-bottom:1.25rem;">
                  <div style="font-size:0.85rem;line-height:1.7;color:var(--text);">${summary.overview}</div>
                </div>
                <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.85rem;">Key Takeaways</div>
                <div style="display:flex;flex-direction:column;gap:0.6rem;">
                  ${summary.takeaways.map((t, i) => `
                    <div style="display:flex;align-items:flex-start;gap:0.75rem;padding:0.75rem 1rem;background:#fafafa;border-radius:10px;border:1px solid var(--border);">
                      <div style="width:24px;height:24px;background:${course.accent};border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.7rem;font-weight:700;color:white;">${i + 1}</div>
                      <span style="font-size:0.83rem;line-height:1.5;">${t}</span>
                    </div>`).join('')}
                </div>
              </div>
            ` : (() => {
              const slide = slides[currentSlide];
              return `
                <div>
                  <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1.25rem;">
                    <span style="font-size:0.72rem;font-weight:600;color:${course.accent};background:${course.accent}18;padding:0.2rem 0.65rem;border-radius:999px;">Slide ${currentSlide + 1} of ${total}</span>
                  </div>
                  <h2 style="font-size:1.15rem;font-weight:700;margin-bottom:1rem;line-height:1.3;">${slide.title}</h2>
                  <div style="font-size:0.85rem;line-height:1.8;color:var(--text);margin-bottom:1.25rem;">${slide.content}</div>
                  <div style="background:${course.accent}0d;border-left:3px solid ${course.accent};border-radius:0 10px 10px 0;padding:1rem 1.25rem;">
                    <div style="font-size:0.78rem;font-weight:700;color:${course.accent};margin-bottom:0.6rem;">KEY POINTS</div>
                    <div style="display:flex;flex-direction:column;gap:0.4rem;">
                      ${slide.keyPoints.map(kp => `
                        <div style="display:flex;align-items:flex-start;gap:0.5rem;font-size:0.8rem;">
                          <span style="color:${course.accent};font-weight:700;flex-shrink:0;">•</span>
                          <span>${kp}</span>
                        </div>`).join('')}
                    </div>
                  </div>
                </div>
              `;
            })()}
          </div>

          ${!loading && !error ? `
            <div style="padding:1rem 1.5rem;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#fafafa;">
              <button onclick="elPrevSlide()" class="btn btn-ghost" style="${isFirst?'opacity:0.35;pointer-events:none;':''}" ${isFirst?'disabled':''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg> Previous
              </button>
              <div style="display:flex;gap:6px;align-items:center;">
                ${slides.map((_, i) => `<div style="width:8px;height:8px;border-radius:50%;background:${i === currentSlide && !showSummary ? course.accent : '#e5e7eb'};transition:background 0.2s;"></div>`).join('')}
                <div style="width:8px;height:8px;border-radius:50%;background:${showSummary ? course.accent : '#e5e7eb'};transition:background 0.2s;"></div>
              </div>
              ${showSummary
                ? `<button onclick="elCloseModule()" class="btn btn-primary" style="background:${course.accent};">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Finish</button>`
                : `<button onclick="elNextSlide()" class="btn btn-primary" style="background:${course.accent};">
                    ${isLast ? 'Finish' : 'Next'}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>`}
            </div>
          ` : ''}

        </div>
      </div>
    `;
  }

  // ── MAIN RENDER ────────────────────────────────────────────
  function renderElearning() {
    const vis = elFilter === 'All'         ? courses
      : elFilter === 'In Progress'         ? courses.filter(c => getStatus(c.id) === 'in-progress')
      : elFilter === 'completed'           ? courses.filter(c => getStatus(c.id) === 'completed')
      : courses.filter(c => getStatus(c.id) === 'not-started');

    document.getElementById('pageContent').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.2rem;">
        <h1 class="page-title" style="margin-bottom:0;">E-Learning</h1>
        <div style="display:flex;gap:0.5rem;">
          ${filterBtn('All')} ${filterBtn('In Progress')} ${filterBtn('completed')}
        </div>
      </div>
      <p class="page-subtitle" style="margin-bottom:1.5rem;">AI-powered training modules for farm workers</p>

      ${courses.length === 0 ? `
        <div style="text-align:center;padding:4rem 2rem;color:var(--muted);">
          <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin:0 auto 1rem;display:block;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          <div style="font-size:.95rem;font-weight:600;margin-bottom:.4rem;">No modules available</div>
          <div style="font-size:.82rem;">Your admin hasn't enabled any training modules yet.</div>
        </div>
      ` : `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
          ${vis.map(c => {
            const p      = courseProgress[c.id] || 0;
            const status = getStatus(c.id);
            return `
            <div class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column;">
              <div style="height:5px;background:${c.accent};"></div>
              <div style="padding:1.25rem;flex:1;display:flex;flex-direction:column;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
                  <span style="font-size:0.7rem;font-weight:600;color:${c.tagColor};">${c.tag}</span>
                  <span id="badge-${c.id}">
                    ${status === 'completed' ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` : ''}
                  </span>
                </div>
                <h3 style="font-size:0.88rem;font-weight:700;margin-bottom:0.5rem;line-height:1.3;">${c.title}</h3>
                <p style="font-size:0.75rem;color:var(--muted);line-height:1.5;margin-bottom:0.75rem;flex:1;">${c.desc}</p>
                <div style="display:flex;gap:1rem;font-size:0.72rem;color:var(--muted);margin-bottom:0.75rem;">
                  <span>${c.hours}</span>
                  <span>${c.modules}</span>
                  <span style="color:#2D5A27;font-weight:600;">⚡ AI</span>
                </div>
                <div class="progress-wrap" style="margin-bottom:0.85rem;">
                  <div class="progress-label">
                    <span>Progress</span>
                    <span id="pct-${c.id}">${p}%</span>
                  </div>
                  <div class="progress-bar">
                    <div id="bar-${c.id}" class="progress-fill" style="width:${p}%;background:${c.accent};transition:width 0.4s ease;"></div>
                  </div>
                </div>
                <button class="btn ${status === 'completed' ? 'btn-ghost' : status === 'in-progress' ? 'btn-primary' : 'btn-outline'}"
                  style="width:100%;justify-content:center;${status === 'in-progress' ? `background:${c.accent};` : ''}"
                  onclick="elOpenModule(${c.id})">
                  ${status === 'completed' ? 'Review Course &nbsp;›' : status === 'in-progress' ? 'Continue &nbsp;▷' : 'Start Course &nbsp;▷'}
                </button>
              </div>
            </div>`;
          }).join('')}
        </div>
      `}

      ${activeModule ? renderModuleOverlay() : ''}
    `;
  }

  // ── NAVIGATION ─────────────────────────────────────────────
  window.elOpenModule = async (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    activeModule = { course, slides: [], currentSlide: 0, loading: true, error: null, summary: null, showSummary: false };
    renderElearning();
    try {
      const data           = await generateModule(course);
      activeModule.slides  = data.slides;
      activeModule.summary = data.summary;
      activeModule.loading = false;
      updateProgress(courseId, 0, data.slides.length);
      renderElearning();
    } catch (err) {
      activeModule.loading = false;
      activeModule.error   = err.message || 'Failed to load module. Please try again.';
      renderElearning();
    }
  };

  window.elCloseModule = () => { activeModule = null; renderElearning(); };
  window.elSetFilter   = f  => { elFilter = f; renderElearning(); };

  window.elNextSlide = () => {
    if (!activeModule || activeModule.showSummary) return;
    if (activeModule.currentSlide < activeModule.slides.length - 1) {
      activeModule.currentSlide++;
      updateProgress(activeModule.course.id, activeModule.currentSlide, activeModule.slides.length);
    } else {
      activeModule.showSummary = true;
      markComplete(activeModule.course.id);
    }
    renderElearning();
  };

  window.elPrevSlide = () => {
    if (!activeModule) return;
    if (activeModule.showSummary) {
      activeModule.showSummary = false;
    } else if (activeModule.currentSlide > 0) {
      activeModule.currentSlide--;
      updateProgress(activeModule.course.id, activeModule.currentSlide, activeModule.slides.length);
    }
    renderElearning();
  };

  window.elRetry = async (courseId) => {
    delete generatedCache[courseId];
    await elOpenModule(courseId);
  };

  // ── INIT ───────────────────────────────────────────────────
  await loadModules();
  await loadProgress();
  renderElearning();

});