renderShell('elearning');


// ── Course Data ────────────────────────────────────────────
// All start at 0% and 'not-started' — progress tracked live
const courses = [
  { id:1, tag:'Soil Science',     tagColor:'#2D5A27', accent:'#2D5A27', title:'Soil Health Assessment Fundamentals',  desc:'Learn how to assess soil quality, understand pH levels, and optimize soil conditions for different crops.',       hours:'2 hours',   modules:'6 modules' },
  { id:2, tag:'Farming Methods',  tagColor:'#f59e0b', accent:'#f59e0b', title:'Organic Farming Techniques',            desc:'Master organic farming methods including composting, natural pest control, and crop rotation strategies.',         hours:'3 hours',   modules:'8 modules' },
  { id:3, tag:'Water Management', tagColor:'#3b82f6', accent:'#3b82f6', title:'Irrigation Systems & Water Management', desc:'Understand different irrigation methods, water conservation techniques, and smart irrigation scheduling.',        hours:'2.5 hours', modules:'7 modules' },
  { id:4, tag:'Crop Protection',  tagColor:'#ef4444', accent:'#ef4444', title:'Pest & Disease Identification',          desc:'Identify common crop pests and diseases. Learn prevention and treatment strategies for healthy crops.',            hours:'2 hours',   modules:'5 modules' },
  { id:5, tag:'Sustainability',   tagColor:'#22c55e', accent:'#22c55e', title:'Sustainable Agriculture Practices',     desc:'Explore sustainable farming practices aligned with SDG 2 and SDG 12 for responsible production.',                  hours:'4 hours',   modules:'10 modules'},
  { id:6, tag:'Safety',           tagColor:'#f59e0b', accent:'#f59e0b', title:'Farm Equipment Safety & Maintenance',   desc:'Safety protocols for operating farm equipment and routine maintenance procedures to prevent accidents.',         hours:'1.5 hours', modules:'4 modules' },
];

// ── Progress tracker (0–100 per course id) ─────────────────
// This is what drives the card progress bars
const courseProgress = { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };

// ── State ──────────────────────────────────────────────────
let elFilter       = 'All';
let activeModule   = null;
let generatedCache = {};

// ── Progress helpers ───────────────────────────────────────
function getStatus(id) {
  const p = courseProgress[id];
  if (p >= 100) return 'completed';
  if (p > 0)    return 'in-progress';
  return 'not-started';
}

// Called every time the slide changes inside the module
function updateProgress(courseId, currentSlide, totalSlides) {
  // +1 because summary slide counts as the final step
  const totalSteps = totalSlides + 1;
  const p = Math.round(((currentSlide + 1) / totalSteps) * 100);
  courseProgress[courseId] = Math.min(p, 99); // 99% until summary is reached
  // Re-render the card progress bars without closing the modal
  updateCardProgress(courseId);
}

function markComplete(courseId) {
  courseProgress[courseId] = 100;
  updateCardProgress(courseId);
}

// Updates just the progress bar and badge on the card — no full re-render
function updateCardProgress(courseId) {
  const p      = courseProgress[courseId];
  const status = getStatus(courseId);
  const bar    = document.getElementById(`bar-${courseId}`);
  const pct    = document.getElementById(`pct-${courseId}`);
  const badge  = document.getElementById(`badge-${courseId}`);
  if (bar)   bar.style.width   = `${p}%`;
  if (pct)   pct.textContent   = `${p}%`;
  if (badge) {
    if (status === 'completed') {
      badge.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    } else {
      badge.innerHTML = '';
    }
  }
}

// ── Filter button ──────────────────────────────────────────
function filterBtn(label) {
  const a = elFilter === label;
  return `<button onclick="elSetFilter('${label}')" style="padding:0.4rem 1rem;border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.8rem;font-weight:${a?'600':'500'};cursor:pointer;border:1.5px solid ${a?'var(--green-dark)':'var(--border)'};background:${a?'var(--green-dark)':'white'};color:${a?'white':'var(--muted)'};transition:all 0.2s;">${label}</button>`;
}

// ── Gemini API call ────────────────────────────────────────
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
  if (!data.candidates || !data.candidates[0]) throw new Error('No response from Gemini');
  return data.candidates[0].content.parts[0].text;
}

// ── Parse plain text response into slides ─────────────────
function parseGeminiResponse(text) {
  const lines   = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const slides  = [];
  const summary = { title: 'Course Summary', overview: '', takeaways: [] };

  for (let i = 1; i <= 5; i++) {
    slides.push({ slideNumber: i, title: '', content: '', keyPoints: [] });
  }

  for (const line of lines) {
    const titleMatch    = line.match(/^SLIDE\s*(\d)\s*TITLE\s*:\s*(.+)/i);
    const contentMatch  = line.match(/^SLIDE\s*(\d)\s*CONTENT\s*:\s*(.+)/i);
    const pointsMatch   = line.match(/^SLIDE\s*(\d)\s*POINTS\s*:\s*(.+)/i);
    const overviewMatch = line.match(/^SUMMARY\s*OVERVIEW\s*:\s*(.+)/i);
    const takewayMatch  = line.match(/^SUMMARY\s*TAKEAWAYS\s*:\s*(.+)/i);

    if (titleMatch)    { const i = parseInt(titleMatch[1])-1;   if(slides[i]) slides[i].title    = titleMatch[2].trim(); }
    if (contentMatch)  { const i = parseInt(contentMatch[1])-1; if(slides[i]) slides[i].content  = contentMatch[2].trim(); }
    if (pointsMatch)   { const i = parseInt(pointsMatch[1])-1;  if(slides[i]) slides[i].keyPoints= pointsMatch[2].split('|').map(p=>p.trim()).filter(p=>p); }
    if (overviewMatch) { summary.overview   = overviewMatch[1].trim(); }
    if (takewayMatch)  { summary.takeaways  = takewayMatch[1].split('|').map(t=>t.trim()).filter(t=>t); }
  }

  // Fallbacks
  slides.forEach((s, i) => {
    if (!s.title)              s.title     = `Lesson ${i + 1}`;
    if (!s.content)            s.content   = 'Content is being prepared. Please try again.';
    if (!s.keyPoints.length)   s.keyPoints = ['Key point 1', 'Key point 2', 'Key point 3'];
  });
  if (!summary.overview)        summary.overview  = 'This course covered essential agricultural practices.';
  if (!summary.takeaways.length)summary.takeaways = ['Apply what you learned', 'Practice regularly', 'Share with fellow workers', 'Review the slides again', 'Ask your supervisor for guidance'];

  return { slides, summary };
}

// ── Generate module ────────────────────────────────────────
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

// ── Open module ────────────────────────────────────────────
window.elOpenModule = async (courseId) => {
  const course = courses.find(c => c.id === courseId);
  activeModule = { course, slides: [], currentSlide: 0, loading: true, error: null, summary: null, showSummary: false };
  renderElearning();

  try {
    const data           = await generateModule(course);
    activeModule.slides  = data.slides;
    activeModule.summary = data.summary;
    activeModule.loading = false;
    // Set initial progress when module opens
    updateProgress(courseId, 0, data.slides.length);
    renderElearning();
  } catch (err) {
    activeModule.loading = false;
    activeModule.error   = err.message || 'Failed to load module. Please try again.';
    renderElearning();
  }
};

// ── Navigation ─────────────────────────────────────────────
window.elCloseModule = () => { activeModule = null; renderElearning(); };
window.elSetFilter   = f  => { elFilter = f; renderElearning(); };

window.elNextSlide = () => {
  if (activeModule.showSummary) return;
  if (activeModule.currentSlide < activeModule.slides.length - 1) {
    activeModule.currentSlide++;
    // Update card progress bar as user advances
    updateProgress(activeModule.course.id, activeModule.currentSlide, activeModule.slides.length);
  } else {
    activeModule.showSummary = true;
    // Mark 100% when summary is reached
    markComplete(activeModule.course.id);
  }
  renderElearning();
};

window.elPrevSlide = () => {
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

// ── Module overlay ─────────────────────────────────────────
function renderModuleOverlay() {
  const { course, slides, currentSlide, loading, error, summary, showSummary } = activeModule;
  const total    = slides.length;
  const isFirst  = currentSlide === 0 && !showSummary;
  const isLast   = currentSlide === total - 1;
  const progress = showSummary ? 100 : total > 0 ? Math.round(((currentSlide + 1) / (total + 1)) * 100) : 0;

  return `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;" onclick="elCloseModule()">
      <div style="background:white;border-radius:20px;width:100%;max-width:760px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.2);overflow:hidden;" onclick="event.stopPropagation()">

        <!-- Header -->
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

        <!-- Progress bar inside modal -->
        <div style="height:4px;background:#f3f4f6;flex-shrink:0;">
          <div style="height:100%;background:${course.accent};width:${progress}%;transition:width 0.4s ease;"></div>
        </div>

        <!-- Body -->
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
                  <div style="font-size:0.78rem;font-weight:700;color:${course.accent};margin-bottom:0.6rem;display:flex;align-items:center;gap:0.4rem;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    KEY POINTS
                  </div>
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

        <!-- Footer -->
        ${!loading && !error ? `
          <div style="padding:1rem 1.5rem;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#fafafa;">
            <button onclick="elPrevSlide()" class="btn btn-ghost" style="${isFirst ? 'opacity:0.35;pointer-events:none;' : ''}" ${isFirst ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              Previous
            </button>
            <div style="display:flex;gap:6px;align-items:center;">
              ${slides.map((_, i) => `
                <div style="width:8px;height:8px;border-radius:50%;background:${i === currentSlide && !showSummary ? course.accent : '#e5e7eb'};transition:background 0.2s;"></div>
              `).join('')}
              <div style="width:8px;height:8px;border-radius:50%;background:${showSummary ? course.accent : '#e5e7eb'};transition:background 0.2s;"></div>
            </div>
            <button onclick="${showSummary ? 'elCloseModule()' : 'elNextSlide()'}" class="btn btn-primary" style="background:${course.accent};">
              ${showSummary ? 'Finish Course' : isLast ? 'View Summary' : 'Next'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="${showSummary ? '20 6 9 17 4 12' : '9 18 15 12 9 6'}"/></svg>
            </button>
          </div>
        ` : ''}

      </div>
    </div>
  `;
}

// ── Main render ────────────────────────────────────────────
function renderElearning() {
  const vis        = courses.filter(c =>
    elFilter === 'All'          ? true :
    elFilter === 'In Progress'  ? getStatus(c.id) === 'in-progress' :
    elFilter === 'Completed'    ? getStatus(c.id) === 'completed' :
    getStatus(c.id) === 'not-started'
  );
  const completed  = courses.filter(c => getStatus(c.id) === 'completed').length;
  const inProgress = courses.filter(c => getStatus(c.id) === 'in-progress').length;
  const total      = courses.length;

  document.getElementById('pageContent').innerHTML = `
    <h1 class="page-title">E-Learning</h1>
    <p class="page-subtitle">AI-powered agricultural training modules</p>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.25rem;">
      <div class="card" style="display:flex;align-items:center;gap:0.75rem;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
        <div><div style="font-size:1.5rem;font-weight:700;line-height:1;">${completed}</div><div style="font-size:0.72rem;color:var(--muted);">Completed</div></div>
      </div>
      <div class="card" style="display:flex;align-items:center;gap:0.75rem;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        <div><div style="font-size:1.5rem;font-weight:700;color:#f59e0b;line-height:1;">${inProgress}</div><div style="font-size:0.72rem;color:var(--muted);">In Progress</div></div>
      </div>
      <div class="card" style="display:flex;align-items:center;gap:0.75rem;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        <div><div style="font-size:1.5rem;font-weight:700;color:#3b82f6;line-height:1;">${total}</div><div style="font-size:0.72rem;color:var(--muted);">Total Courses</div></div>
      </div>
    </div>

    <div style="display:inline-flex;align-items:center;gap:0.5rem;background:linear-gradient(135deg,#f0fdf4,#eff6ff);border:1px solid #dcfce7;border-radius:999px;padding:0.35rem 0.9rem;margin-bottom:1.25rem;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      <span style="font-size:0.75rem;font-weight:600;color:#2D5A27;">Powered by Gemini AI — lessons generated fresh for every session</span>
    </div>

    <div style="display:flex;gap:0.5rem;margin-bottom:1.25rem;">
      ${['All', 'In Progress', 'Completed', 'Not Started'].map(filterBtn).join('')}
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
      ${vis.map(c => {
        const p      = courseProgress[c.id];
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
              <span style="display:flex;align-items:center;gap:0.25rem;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${c.hours}
              </span>
              <span style="display:flex;align-items:center;gap:0.25rem;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>${c.modules}
              </span>
              <span style="display:flex;align-items:center;gap:0.25rem;color:#2D5A27;font-weight:600;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>AI
              </span>
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

    ${activeModule ? renderModuleOverlay() : ''}
  `;
}

renderElearning();
