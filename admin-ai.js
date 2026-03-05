// ================================================================
// SUPABASE SETUP INSTRUCTIONS FOR GITHUB COPILOT
// ================================================================
//
// TABLE: ai_predictions
//   id           int8,  PK, auto
//   crop         text,  NOT NULL
//   land_area    numeric
//   season       text
//   soil_data    text
//   province     text
//   total_yield  numeric
//   per_ha_yield numeric
//   confidence   int4
//   fertilizer   text
//   water_req    text
//   tips         jsonb   (array of strings)
//   schedule     jsonb   (array of {week, task})
//   risks        jsonb   (array of strings)
//   gemini_raw   text    (full Gemini response)
//   created_by   text    → Auth.getSession()?.name
//   created_at   timestamptz, default now()
//   RLS: Admin/Supervisor = ALL | Workers = SELECT
//
// SAVE PREDICTION:
//   await db.from('ai_predictions').insert({
//     crop, land_area, season, soil_data, province,
//     total_yield, per_ha_yield, confidence,
//     fertilizer, water_req, tips, schedule, risks,
//     gemini_raw, created_by: Auth.getSession()?.name
//   })
//
// LOAD HISTORY:
//   const { data } = await db.from('ai_predictions')
//     .select('*').order('created_at', { ascending: false }).limit(20)
//
// DELETE PREDICTION:
//   await db.from('ai_predictions').delete().eq('id', id)
//
// ── GEMINI API KEY ────────────────────────────────────────────────
// Replace GEMINI_API_KEY below with your actual key from:
// https://aistudio.google.com/app/apikey
// ================================================================

renderShell('ai');



// ── STATE ────────────────────────────────────────────────────────
let aiForm = { crop: '', land: '', season: '', soil: '', province: '' };
let aiResult  = null;
let aiLoading = false;
let activeTab = 'predict';
let historyList = [];
let viewingPred = null;

// ── STATIC DATA ──────────────────────────────────────────────────
const CROPS   = ['Rice', 'Corn', 'Vegetables', 'Sugarcane', 'Banana', 'Coconut'];
const SEASONS = ['Dry Season (Nov–Apr)', 'Wet Season (May–Oct)', 'Off-Season'];
const PROVINCES = [
  'Davao del Sur', 'Davao del Norte', 'Davao de Oro', 'Davao Occidental',
  'Davao Oriental', 'South Cotabato', 'Sultan Kudarat', 'Bukidnon', 'Other'
];
const CROP_ICONS = {
  Rice: '🌾', Corn: '🌽', Vegetables: '🥬', Sugarcane: '🎋', Banana: '🍌', Coconut: '🥥'
};
const CROP_BASE = {
  Rice:       { base: 3.8,  unit: 'tons/ha', water: 'High',   fertilizer: 'NPK 14-14-14 + Urea top-dress' },
  Corn:       { base: 4.5,  unit: 'tons/ha', water: 'Medium', fertilizer: 'Urea + Complete (14-14-14)'    },
  Vegetables: { base: 12.0, unit: 'tons/ha', water: 'High',   fertilizer: 'Organic compost + Foliar spray' },
  Sugarcane:  { base: 65.0, unit: 'tons/ha', water: 'Medium', fertilizer: 'High Potassium + Urea'         },
  Banana:     { base: 20.0, unit: 'tons/ha', water: 'High',   fertilizer: 'NPK 15-15-15 + K2O'            },
  Coconut:    { base: 3.5,  unit: 'tons/ha', water: 'Low',    fertilizer: 'Muriate of Potash + Urea'      },
};

// ── MAIN RENDER ──────────────────────────────────────────────────
function renderAI() {
  document.getElementById('pageContent').innerHTML = `

    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.25rem;">
      <div>
        <h1 class="page-title" style="margin-bottom:0;">AI Predictions</h1>
        <p class="page-subtitle">Gemini-powered yield forecasting &amp; planting recommendations</p>
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;background:#f0fdf4;border:1px solid #bbf7d0;padding:.4rem .85rem;border-radius:999px;">
        <span style="width:8px;height:8px;background:#22c55e;border-radius:50%;display:inline-block;animation:aiBlink 1.5s ease infinite;"></span>
        <span style="font-size:.75rem;font-weight:600;color:var(--green-dark);">Gemini AI Active</span>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;border-bottom:2px solid var(--border);margin-bottom:1.5rem;">
      ${[['predict','🔮 New Prediction'],['history','📋 History']].map(([id,label]) => `
        <button onclick="AI.tab('${id}')"
          style="background:none;border:none;padding:.55rem 1.2rem;font-family:'Poppins',sans-serif;font-size:.83rem;font-weight:600;cursor:pointer;
                 border-bottom:2px solid ${activeTab===id?'var(--green-dark)':'transparent'};
                 margin-bottom:-2px;color:${activeTab===id?'var(--green-dark)':'var(--muted)'};transition:color .2s;">
          ${label}
        </button>`).join('')}
    </div>

    ${activeTab === 'predict' ? renderPredictTab() : renderHistoryTab()}

    <style>
      @keyframes aiSpin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      @keyframes aiBlink { 0%,100%{opacity:1} 50%{opacity:.3} }
      @keyframes modalIn { from{opacity:0;transform:translateY(16px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
      @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    </style>

    ${viewingPred ? renderDetailModal() : ''}
  `;

  const bd = document.getElementById('detailBackdrop');
  if (bd) bd.addEventListener('click', () => { viewingPred = null; renderAI(); });
}

// ── PREDICT TAB ──────────────────────────────────────────────────
function renderPredictTab() {
  return `
    <div style="display:grid;grid-template-columns:380px 1fr;gap:1.25rem;align-items:start;">

      <!-- LEFT: Form -->
      <div class="card">
        <div style="display:flex;align-items:center;gap:.65rem;margin-bottom:1.25rem;">
          <div style="width:38px;height:38px;background:#f0fdf4;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div>
            <div style="font-weight:700;font-size:1rem;">Prediction Parameters</div>
            <div style="font-size:.75rem;color:var(--muted);">Powered by Google Gemini</div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:.9rem;">

          <!-- Crop Type grid buttons -->
          <div>
            <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">Crop Type <span style="color:var(--red);">*</span></label>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.4rem;">
              ${CROPS.map(c => `
                <button onclick="AI.setCrop('${c}')"
                  style="padding:.5rem .3rem;border-radius:8px;font-family:'Poppins',sans-serif;font-size:.72rem;font-weight:600;cursor:pointer;text-align:center;transition:all .2s;
                         border:1.5px solid ${aiForm.crop===c?'var(--green-dark)':'var(--border)'};
                         background:${aiForm.crop===c?'var(--green-light)':'white'};
                         color:${aiForm.crop===c?'var(--green-dark)':'var(--muted)'};">
                  <div style="font-size:1.1rem;margin-bottom:.15rem;">${CROP_ICONS[c]}</div>
                  ${c}
                </button>`).join('')}
            </div>
          </div>

          <!-- Land Area -->
          <div>
            <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">Land Area (hectares) <span style="color:var(--red);">*</span></label>
            <input id="ai_land" type="number" step="0.1" min="0.1" value="${aiForm.land}"
              oninput="aiForm.land=this.value" placeholder="e.g. 5.0"
              style="width:100%;padding:.6rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;background:#f9fafb;"/>
          </div>

          <!-- Season -->
          <div>
            <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">Season <span style="color:var(--red);">*</span></label>
            <div style="position:relative;">
              <select id="ai_season" onchange="aiForm.season=this.value"
                style="width:100%;padding:.6rem 2rem .6rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;background:#f9fafb;appearance:none;cursor:pointer;">
                <option value="">Select season</option>
                ${SEASONS.map(s=>`<option value="${s}" ${aiForm.season===s?'selected':''}>${s}</option>`).join('')}
              </select>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

          <!-- Province -->
          <div>
            <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">Province / Location</label>
            <div style="position:relative;">
              <select id="ai_province" onchange="aiForm.province=this.value"
                style="width:100%;padding:.6rem 2rem .6rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;background:#f9fafb;appearance:none;cursor:pointer;">
                <option value="">Select province</option>
                ${PROVINCES.map(p=>`<option value="${p}" ${aiForm.province===p?'selected':''}>${p}</option>`).join('')}
              </select>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

          <!-- Soil Data -->
          <div>
            <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">Soil Data <span style="color:var(--muted);font-weight:400;">(Optional)</span></label>
            <input id="ai_soil" type="text" value="${aiForm.soil}" oninput="aiForm.soil=this.value"
              placeholder="e.g. Clay loam, pH 6.5"
              style="width:100%;padding:.6rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;background:#f9fafb;"/>
          </div>

          <!-- Generate Button -->
          <button onclick="AI.generate()" class="btn btn-primary"
            style="width:100%;justify-content:center;padding:.75rem;font-size:.88rem;margin-top:.25rem;${aiLoading?'opacity:.7;cursor:not-allowed;':''}"
            ${aiLoading?'disabled':''}>
            ${aiLoading
              ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:aiSpin 1s linear infinite;width:16px;height:16px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Analyzing with Gemini AI...`
              : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Generate Prediction`}
          </button>
        </div>
      </div>

      <!-- RIGHT: Result -->
      <div style="display:flex;flex-direction:column;gap:1rem;">
        ${aiLoading ? renderLoading() : aiResult ? renderResult() : renderEmpty()}
      </div>

    </div>`;
}

// ── EMPTY STATE ──────────────────────────────────────────────────
function renderEmpty() {
  return `
    <div class="card" style="min-height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem;">
      <div style="width:72px;height:72px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:1.25rem;">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#a8c69f" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      </div>
      <div style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:.5rem;">Ready to Predict</div>
      <div style="font-size:.8rem;color:var(--muted);line-height:1.7;max-width:320px;">
        Select your crop, fill in the details, and Gemini AI will generate a full yield forecast with planting recommendations tailored to your farm.
      </div>
    </div>`;
}

// ── LOADING STATE ────────────────────────────────────────────────
function renderLoading() {
  return `
    <div class="card" style="min-height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;padding:2rem;">
      <div style="position:relative;width:64px;height:64px;">
        <div style="position:absolute;inset:0;border-radius:50%;border:3px solid #e8f5e9;"></div>
        <div style="position:absolute;inset:0;border-radius:50%;border:3px solid transparent;border-top-color:var(--green-dark);animation:aiSpin 1s linear infinite;"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
      </div>
      <div style="text-align:center;">
        <div style="font-weight:700;font-size:1rem;margin-bottom:.4rem;">Gemini is Thinking...</div>
        <div style="font-size:.78rem;color:var(--muted);line-height:1.6;">
          Analyzing crop conditions, seasonal patterns,<br>and regional data for your farm
        </div>
      </div>
      <div style="display:flex;gap:.4rem;margin-top:.25rem;">
        ${[0,1,2].map(i=>`<div style="width:8px;height:8px;background:var(--green-dark);border-radius:50%;animation:aiBlink 1.2s ease ${i*0.3}s infinite;"></div>`).join('')}
      </div>
    </div>`;
}

// ── RESULT ───────────────────────────────────────────────────────
function renderResult() {
  const r = aiResult;
  const confColor = r.confidence >= 90 ? '#22c55e' : r.confidence >= 75 ? '#f59e0b' : '#ef4444';
  const confBg    = r.confidence >= 90 ? '#dcfce7' : r.confidence >= 75 ? '#fef3c7' : '#fee2e2';

  return `
    <!-- Yield Hero Card -->
    <div class="card" style="animation:fadeIn .4s ease;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
        <div style="display:flex;align-items:center;gap:.6rem;">
          <span style="font-size:1.5rem;">${CROP_ICONS[r.crop] || '🌱'}</span>
          <div>
            <div style="font-weight:700;font-size:1rem;">${r.crop} — Yield Forecast</div>
            <div style="font-size:.73rem;color:var(--muted);">${r.area} ha · ${r.season}${r.province?` · ${r.province}`:''}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem;">
          <div style="background:${confBg};color:${confColor};padding:.3rem .75rem;border-radius:999px;font-size:.72rem;font-weight:700;">
            ${r.confidence}% Confidence
          </div>
          <button onclick="AI.savePrediction()" class="btn btn-primary" style="font-size:.72rem;padding:.3rem .75rem;gap:.3rem;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save
          </button>
        </div>
      </div>

      <div style="background:linear-gradient(135deg,#2D5A27,#3a7a32);border-radius:12px;padding:1.5rem;text-align:center;margin-bottom:1rem;color:white;">
        <div style="font-size:.75rem;opacity:.8;margin-bottom:.3rem;">ESTIMATED TOTAL YIELD</div>
        <div style="font-size:2.8rem;font-weight:700;line-height:1;">${r.total.toFixed(1)}<span style="font-size:1.2rem;font-weight:400;margin-left:.3rem;">tons</span></div>
        <div style="font-size:.8rem;opacity:.75;margin-top:.3rem;">${r.perHa.toFixed(2)} ${r.unit} × ${r.area} hectares</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1rem;">
        ${[
          { label:'Water Need',  value: r.water,      icon:'💧' },
          { label:'Fertilizer',  value: r.fertilizer, icon:'🧪' },
          { label:'Soil Match',  value: r.soilMatch || 'Good', icon:'🌱' },
        ].map(s=>`
          <div style="padding:.75rem;background:#fafafa;border-radius:10px;border:1px solid var(--border);text-align:center;">
            <div style="font-size:1.1rem;margin-bottom:.2rem;">${s.icon}</div>
            <div style="font-size:.72rem;color:var(--muted);margin-bottom:.2rem;">${s.label}</div>
            <div style="font-size:.8rem;font-weight:600;color:var(--text);">${s.value}</div>
          </div>`).join('')}
      </div>

      <div>
        <div style="display:flex;justify-content:space-between;font-size:.72rem;color:var(--muted);margin-bottom:.3rem;">
          <span>Prediction Confidence</span><span style="color:${confColor};font-weight:600;">${r.confidence}%</span>
        </div>
        <div style="height:6px;background:#f3f4f6;border-radius:999px;overflow:hidden;">
          <div style="height:100%;width:${r.confidence}%;background:${confColor};border-radius:999px;transition:width .8s ease;"></div>
        </div>
      </div>
    </div>

    <!-- Recommendations & Schedule -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
      <div class="card" style="animation:fadeIn .5s ease;">
        <div style="font-weight:700;font-size:.9rem;margin-bottom:.9rem;display:flex;align-items:center;gap:.4rem;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Planting Recommendations
        </div>
        ${(r.tips||[]).map(t=>`
          <div style="display:flex;align-items:flex-start;gap:.5rem;font-size:.78rem;color:var(--muted);line-height:1.5;margin-bottom:.5rem;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" style="flex-shrink:0;margin-top:2px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            ${t}
          </div>`).join('')}
      </div>

      <div class="card" style="animation:fadeIn .6s ease;">
        <div style="font-weight:700;font-size:.9rem;margin-bottom:.9rem;display:flex;align-items:center;gap:.4rem;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Planting Schedule
        </div>
        ${(r.schedule||[]).map((s,i)=>`
          <div style="display:flex;align-items:flex-start;gap:.65rem;margin-bottom:.55rem;">
            <div style="width:22px;height:22px;background:var(--green-light);border:2px solid var(--sage);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.62rem;font-weight:700;color:var(--green-dark);flex-shrink:0;margin-top:1px;">${i+1}</div>
            <div>
              <div style="font-size:.72rem;font-weight:600;color:var(--green-dark);">${s.week}</div>
              <div style="font-size:.73rem;color:var(--muted);">${s.task}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Risk Factors -->
    ${(r.risks||[]).length ? `
    <div class="card" style="animation:fadeIn .7s ease;border-left:3px solid #f59e0b;">
      <div style="font-weight:700;font-size:.9rem;margin-bottom:.75rem;display:flex;align-items:center;gap:.4rem;color:#92400e;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Risk Factors to Watch
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;">
        ${r.risks.map(risk=>`
          <div style="display:flex;align-items:flex-start;gap:.45rem;font-size:.77rem;color:var(--muted);">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" style="flex-shrink:0;margin-top:2px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            ${risk}
          </div>`).join('')}
      </div>
    </div>` : ''}`;
}

// ── HISTORY TAB ──────────────────────────────────────────────────
function renderHistoryTab() {
  // TODO: SUPABASE — replace historyList with:
  // const { data } = await db.from('ai_predictions').select('*').order('created_at',{ascending:false}).limit(20)
  // historyList = data || []

  if (!historyList.length) return `
    <div class="card" style="padding:3rem;text-align:center;">
      <div style="font-size:2rem;margin-bottom:.75rem;">📋</div>
      <div style="font-weight:600;color:var(--text);margin-bottom:.4rem;">No Predictions Saved Yet</div>
      <div style="font-size:.82rem;color:var(--muted);">Generate a prediction and click Save to build your history.</div>
    </div>`;

  return `
    <div class="card" style="padding:0;overflow:hidden;">
      <table>
        <thead>
          <tr>
            <th style="padding-left:1.5rem;">Crop</th>
            <th>Area</th>
            <th>Season</th>
            <th>Yield</th>
            <th>Confidence</th>
            <th>Date</th>
            <th style="text-align:right;padding-right:1.5rem;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${historyList.map(p => {
            const cc = p.confidence >= 90 ? '#22c55e' : p.confidence >= 75 ? '#f59e0b' : '#ef4444';
            const cb = p.confidence >= 90 ? '#dcfce7' : p.confidence >= 75 ? '#fef3c7' : '#fee2e2';
            return `
              <tr>
                <td style="padding-left:1.5rem;">
                  <div style="display:flex;align-items:center;gap:.5rem;">
                    <span style="font-size:1.1rem;">${CROP_ICONS[p.crop]||'🌱'}</span>
                    <span style="font-weight:600;font-size:.84rem;">${p.crop}</span>
                  </div>
                </td>
                <td style="font-size:.82rem;color:var(--muted);">${p.area} ha</td>
                <td style="font-size:.78rem;color:var(--muted);">${p.season}</td>
                <td style="font-weight:700;font-size:.88rem;color:var(--green-dark);">${p.total.toFixed(1)} t</td>
                <td>
                  <span style="background:${cb};color:${cc};padding:.2rem .6rem;border-radius:999px;font-size:.7rem;font-weight:700;">
                    ${p.confidence}%
                  </span>
                </td>
                <td style="font-size:.78rem;color:var(--muted);">${p.createdAt}</td>
                <td style="text-align:right;padding-right:1.5rem;">
                  <div style="display:flex;justify-content:flex-end;gap:.3rem;">
                    <button onclick="AI.viewPred(${p.id})"
                      style="background:none;border:1.5px solid var(--border);padding:.3rem .65rem;border-radius:6px;cursor:pointer;font-family:'Poppins',sans-serif;font-size:.72rem;color:var(--muted);transition:all .2s;"
                      onmouseover="this.style.color='var(--green-dark)';this.style.borderColor='var(--sage)'"
                      onmouseout="this.style.color='var(--muted)';this.style.borderColor='var(--border)'">View</button>
                    <button onclick="AI.deletePred(${p.id})"
                      style="background:none;border:1.5px solid var(--border);padding:.3rem .65rem;border-radius:6px;cursor:pointer;font-family:'Poppins',sans-serif;font-size:.72rem;color:var(--muted);transition:all .2s;"
                      onmouseover="this.style.color='var(--red)';this.style.borderColor='#fca5a5'"
                      onmouseout="this.style.color='var(--muted)';this.style.borderColor='var(--border)'">Delete</button>
                  </div>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── DETAIL MODAL ─────────────────────────────────────────────────
function renderDetailModal() {
  const p = viewingPred;
  return `
    <div id="detailBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:300;display:flex;align-items:center;justify-content:center;padding:1rem;">
      <div style="background:white;border-radius:16px;padding:1.75rem 2rem;width:680px;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:modalIn .22s ease;" onclick="event.stopPropagation()">

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
          <div style="display:flex;align-items:center;gap:.65rem;">
            <span style="font-size:1.6rem;">${CROP_ICONS[p.crop]||'🌱'}</span>
            <div>
              <div style="font-size:1.05rem;font-weight:700;">${p.crop} Prediction</div>
              <div style="font-size:.75rem;color:var(--muted);">${p.season} · ${p.area} ha · ${p.createdAt}</div>
            </div>
          </div>
          <button onclick="AI.closeDetail()" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;border-radius:6px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style="background:linear-gradient(135deg,#2D5A27,#3a7a32);border-radius:12px;padding:1.25rem;text-align:center;margin-bottom:1.25rem;color:white;">
          <div style="font-size:.75rem;opacity:.8;margin-bottom:.25rem;">ESTIMATED TOTAL YIELD</div>
          <div style="font-size:2.4rem;font-weight:700;line-height:1;">${p.total.toFixed(1)} <span style="font-size:1rem;font-weight:400;">tons</span></div>
          <div style="font-size:.78rem;opacity:.75;margin-top:.25rem;">${p.perHa.toFixed(2)} ${p.unit} · Confidence: <strong>${p.confidence}%</strong></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:1.25rem;">
          ${[{label:'Water Need',value:p.water,icon:'💧'},{label:'Fertilizer',value:p.fertilizer,icon:'🧪'}].map(s=>`
            <div style="padding:.75rem;background:#fafafa;border-radius:10px;border:1px solid var(--border);">
              <div style="font-size:.7rem;color:var(--muted);margin-bottom:.25rem;">${s.icon} ${s.label}</div>
              <div style="font-size:.85rem;font-weight:600;">${s.value}</div>
            </div>`).join('')}
        </div>

        <div style="margin-bottom:1.25rem;">
          <div style="font-weight:700;font-size:.88rem;margin-bottom:.65rem;">Recommendations</div>
          ${(p.tips||[]).map(t=>`
            <div style="display:flex;gap:.5rem;font-size:.78rem;color:var(--muted);margin-bottom:.4rem;line-height:1.5;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" style="flex-shrink:0;margin-top:2px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              ${t}
            </div>`).join('')}
        </div>

        <div>
          <div style="font-weight:700;font-size:.88rem;margin-bottom:.65rem;">Planting Schedule</div>
          ${(p.schedule||[]).map((s,i)=>`
            <div style="display:flex;gap:.65rem;margin-bottom:.55rem;">
              <div style="width:20px;height:20px;background:var(--green-light);border:2px solid var(--sage);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:700;color:var(--green-dark);flex-shrink:0;">${i+1}</div>
              <div style="font-size:.77rem;"><span style="font-weight:600;color:var(--green-dark);">${s.week}</span> — <span style="color:var(--muted);">${s.task}</span></div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

// ── GEMINI API CALL ──────────────────────────────────────────────
async function callGemini(crop, land, season, soil, province) {
  const prompt = `You are an expert agricultural AI assistant for farms in the Philippines.

Generate a detailed crop yield prediction and farming plan in JSON format only (no markdown, no explanation).

Input:
- Crop: ${crop}
- Land Area: ${land} hectares
- Season: ${season}
- Soil: ${soil || 'Unknown'}
- Province: ${province || 'Mindanao, Philippines'}

Return ONLY this exact JSON structure:
{
  "perHa": <number: estimated yield in tons per hectare>,
  "confidence": <integer: 70-97>,
  "water": "<Low|Medium|High>",
  "fertilizer": "<specific recommendation>",
  "soilMatch": "<Poor|Fair|Good|Excellent>",
  "tips": ["<tip1>","<tip2>","<tip3>","<tip4>","<tip5>"],
  "schedule": [
    {"week": "Week 1",     "task": "<task>"},
    {"week": "Week 2–3",   "task": "<task>"},
    {"week": "Week 4–6",   "task": "<task>"},
    {"week": "Week 7–8",   "task": "<task>"},
    {"week": "Week 10–12", "task": "<task>"},
    {"week": "Week 14–16", "task": "<task>"},
    {"week": "Harvest",    "task": "<harvest timing and method>"}
  ],
  "risks": ["<risk1>","<risk2>","<risk3>","<risk4>"]
}`;

  const res = await fetch(
    '/api/gemini',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data  = await res.json();
  const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ── FALLBACK (if Gemini fails) ───────────────────────────────────
function fallbackCalc(crop, land, season, soil) {
  const base  = CROP_BASE[crop] || { base: 3.0, unit: 'tons/ha', water: 'Medium', fertilizer: 'NPK 14-14-14' };
  const smod  = season.includes('Dry') ? 1.1 : season.includes('Off') ? 0.75 : 0.9;
  const soilM = (soil||'').toLowerCase().includes('loam') ? 1.1 : (soil||'').toLowerCase().includes('clay') ? 0.95 : 1.0;
  return {
    perHa: base.base * smod * soilM,
    confidence: 78,
    water: base.water,
    fertilizer: base.fertilizer,
    soilMatch: soilM >= 1.1 ? 'Excellent' : soilM >= 1.0 ? 'Good' : 'Fair',
    tips: [
      'Prepare land thoroughly with deep plowing and harrowing',
      `Apply ${base.fertilizer} at recommended basal rates`,
      'Monitor soil moisture weekly during critical growth stages',
      'Scout for pests and diseases every 7 days',
      'Keep detailed records of inputs for future planning',
    ],
    schedule: [
      { week: 'Week 1',     task: 'Land preparation and soil testing' },
      { week: 'Week 2–3',   task: 'Planting / transplanting with proper spacing' },
      { week: 'Week 4–5',   task: 'First fertilizer application and weeding' },
      { week: 'Week 6–8',   task: 'Irrigation management and pest monitoring' },
      { week: 'Week 9–10',  task: 'Second fertilizer application' },
      { week: 'Week 11–13', task: 'Continued monitoring and water management' },
      { week: 'Harvest',    task: 'Harvest at optimal maturity stage' },
    ],
    risks: [
      'Pest pressure during vulnerable growth stages',
      season.includes('Wet') ? 'Flooding and waterlogging risk' : 'Drought stress during dry periods',
      'Nutrient deficiency if fertilizer schedule is missed',
      'Post-harvest losses if not stored properly',
    ],
  };
}

// ── PUBLIC API ────────────────────────────────────────────────────
window.AI = {

  tab(t) { activeTab = t; renderAI(); },

  setCrop(c) { aiForm.crop = c; aiResult = null; renderAI(); },

  async generate() {
    aiForm.land     = document.getElementById('ai_land')?.value     || aiForm.land;
    aiForm.season   = document.getElementById('ai_season')?.value   || aiForm.season;
    aiForm.province = document.getElementById('ai_province')?.value || aiForm.province;
    aiForm.soil     = document.getElementById('ai_soil')?.value     || aiForm.soil;

    if (!aiForm.crop || !aiForm.land || !aiForm.season) {
      alert('Please select a Crop, enter Land Area, and choose a Season.');
      return;
    }

    aiLoading = true; aiResult = null; renderAI();

    try {
      const area = parseFloat(aiForm.land) || 1;
      let gd;
      try {
        gd = await callGemini(aiForm.crop, area, aiForm.season, aiForm.soil, aiForm.province);
      } catch(e) {
        console.warn('Gemini failed, using fallback:', e.message);
        gd = fallbackCalc(aiForm.crop, area, aiForm.season, aiForm.soil);
      }
      aiResult = {
        crop: aiForm.crop, area, season: aiForm.season,
        province: aiForm.province, soil: aiForm.soil,
        perHa: gd.perHa, total: gd.perHa * area,
        unit: CROP_BASE[aiForm.crop]?.unit || 'tons/ha',
        confidence: gd.confidence, water: gd.water,
        fertilizer: gd.fertilizer, soilMatch: gd.soilMatch,
        tips: gd.tips, schedule: gd.schedule, risks: gd.risks,
        raw: JSON.stringify(gd),
      };
    } catch(e) {
      alert('Prediction failed. Please try again.');
      console.error(e);
    }

    aiLoading = false; renderAI();
  },

  savePrediction() {
    if (!aiResult) return;
    const id  = Date.now();
    const now = new Date().toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });

    // TODO: SUPABASE — replace local push with:
    // await db.from('ai_predictions').insert({
    //   crop: aiResult.crop, land_area: aiResult.area, season: aiResult.season,
    //   soil_data: aiResult.soil, province: aiResult.province,
    //   total_yield: aiResult.total, per_ha_yield: aiResult.perHa,
    //   confidence: aiResult.confidence, fertilizer: aiResult.fertilizer,
    //   water_req: aiResult.water, tips: aiResult.tips, schedule: aiResult.schedule,
    //   risks: aiResult.risks, gemini_raw: aiResult.raw,
    //   created_by: Auth.getSession()?.name || 'Admin'
    // })
    historyList.unshift({
      id, ...aiResult, createdAt: now,
      createdBy: (typeof Auth !== 'undefined' && Auth.getSession()?.name) || 'Admin',
    });

    const btn = document.querySelector('button[onclick="AI.savePrediction()"]');
    if (btn) {
      btn.innerHTML = '✓ Saved!';
      btn.style.background = '#22c55e';
      setTimeout(() => renderAI(), 1200);
    } else { renderAI(); }
  },

  viewPred(id)   { viewingPred = historyList.find(p => p.id === id) || null; renderAI(); },
  closeDetail()  { viewingPred = null; renderAI(); },

  deletePred(id) {
    if (!confirm('Delete this prediction from history?')) return;
    // TODO: SUPABASE — replace with:
    // await db.from('ai_predictions').delete().eq('id', id)
    historyList = historyList.filter(p => p.id !== id);
    renderAI();
  },
};

renderAI();