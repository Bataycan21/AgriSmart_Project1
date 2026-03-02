renderShell('ai');

let aiForm = {crop:'', land:'', season:'', soil:''};
let aiResult = null, aiLoading = false;

const cropData = {
  'Rice':       {base:3.8, unit:'tons/ha', water:'High',   fertilizer:'NPK 14-14-14',     tips:['Maintain 5cm water depth during vegetative stage','Apply urea in 3 split doses','Monitor for blast disease after heavy rain','Drain fields 2 weeks before harvest']},
  'Corn':       {base:4.5, unit:'tons/ha', water:'Medium', fertilizer:'Urea + Complete',  tips:['Ensure 75×25cm plant spacing','Side-dress nitrogen at knee-high stage','Watch for fall armyworm – inspect weekly','Harvest when husk turns brown and dry']},
  'Vegetables': {base:12,  unit:'tons/ha', water:'High',   fertilizer:'Organic + Foliar', tips:['Use drip irrigation for water efficiency','Apply organic mulch to retain moisture','Inspect weekly for pest pressure','Harvest in early morning to preserve freshness']},
  'Sugarcane':  {base:65,  unit:'tons/ha', water:'Medium', fertilizer:'High Potassium',   tips:['Plant billets at 45° angle in furrows','Apply potash fertilizer at ratoon stage','Harvest at optimal maturity Brix 18–22','Burn or mulch trash after harvest']},
};
const seasonMod = {'Dry Season':1.1, 'Wet Season':0.9, 'Off-Season':0.75};
const soilMod   = s => s.toLowerCase().includes('loam')?1.1 : s.toLowerCase().includes('clay')?0.95 : 1.0;

function renderAI(){
  document.getElementById('pageContent').innerHTML = `
    <h1 class="page-title">AI Predictions</h1>
    <p class="page-subtitle">Generate yield predictions and planting recommendations</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;align-items:start;">

      <div class="card">
        <div style="display:flex;align-items:center;gap:0.65rem;margin-bottom:1.25rem;">
          <div style="width:38px;height:38px;background:#f0fdf4;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div>
            <div style="font-weight:700;font-size:1rem;">Prediction Parameters</div>
            <div style="font-size:0.75rem;color:var(--muted);">Fill in crop details</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:1rem;">
          <div>
            <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.4rem;">Crop Type</label>
            <div style="position:relative;">
              <select id="ai_crop" onchange="aiForm.crop=this.value"
                style="width:100%;padding:0.6rem 2rem 0.6rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;background:white;appearance:none;cursor:pointer;">
                <option value="">Select crop type</option>
                ${Object.keys(cropData).map(c=>`<option value="${c}" ${aiForm.crop===c?'selected':''}>${c}</option>`).join('')}
              </select>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <div>
            <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.4rem;">Land Area (hectares)</label>
            <input id="ai_land" type="number" step="0.1" value="${aiForm.land}" oninput="aiForm.land=this.value"
              style="width:100%;padding:0.6rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;box-sizing:border-box;"
              placeholder="e.g. 5.0"/>
          </div>
          <div>
            <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.4rem;">Season</label>
            <div style="position:relative;">
              <select id="ai_season" onchange="aiForm.season=this.value"
                style="width:100%;padding:0.6rem 2rem 0.6rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;background:white;appearance:none;cursor:pointer;">
                <option value="">Select season</option>
                ${['Dry Season','Wet Season','Off-Season'].map(s=>`<option value="${s}" ${aiForm.season===s?'selected':''}>${s}</option>`).join('')}
              </select>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <div>
            <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.4rem;">Soil Data <span style="color:var(--muted);font-weight:400;">(Optional)</span></label>
            <input id="ai_soil" type="text" value="${aiForm.soil}" oninput="aiForm.soil=this.value"
              style="width:100%;padding:0.6rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;box-sizing:border-box;"
              placeholder="e.g. Clay loam, pH 6.5"/>
          </div>
          <button onclick="aiGenerate()" class="btn btn-primary" style="width:100%;justify-content:center;padding:0.75rem;font-size:0.88rem;margin-top:0.25rem;" ${aiLoading?'disabled':''}>
            ${aiLoading
              ?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:aiSpin 1s linear infinite;width:16px;height:16px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Generating...`
              :`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Generate Prediction`}
          </button>
        </div>
      </div>

      <div class="card" style="min-height:340px;display:flex;flex-direction:column;">
        ${aiResult ? renderResult() : renderEmpty()}
      </div>
    </div>
    <style>@keyframes aiSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>
  `;
}

function renderEmpty(){
  return`
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem;">
      <div style="width:64px;height:64px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:1rem;">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#a8c69f" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      </div>
      <div style="font-size:0.95rem;font-weight:600;color:var(--muted);margin-bottom:0.4rem;">No Prediction Yet</div>
      <div style="font-size:0.78rem;color:var(--muted);line-height:1.5;">Fill in the prediction parameters and click "Generate Prediction" to see AI-powered yield estimates.</div>
    </div>`;
}

function renderResult(){
  const r = aiResult;
  return`
    <div style="flex:1;">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1.25rem;">
        <div style="width:32px;height:32px;background:#f0fdf4;border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <div style="font-weight:700;font-size:1rem;">Prediction Results</div>
        <span class="badge badge-green" style="margin-left:auto;">95% Confidence</span>
      </div>
      <div style="background:#f0fdf4;border:1px solid #dcfce7;border-radius:12px;padding:1.25rem;margin-bottom:1rem;text-align:center;">
        <div style="font-size:0.75rem;color:var(--muted);margin-bottom:0.25rem;">Estimated Total Yield</div>
        <div style="font-size:2.2rem;font-weight:700;color:#2D5A27;line-height:1;margin-bottom:0.2rem;">${r.total.toFixed(1)} <span style="font-size:1rem;">tons</span></div>
        <div style="font-size:0.78rem;color:var(--muted);">${r.perHa.toFixed(1)} ${r.unit} · ${r.area} hectares · ${r.season}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;">
        <div style="padding:0.75rem;background:#fafafa;border-radius:10px;border:1px solid var(--border);">
          <div style="font-size:0.7rem;color:var(--muted);margin-bottom:0.2rem;">Water Requirement</div>
          <div style="font-size:0.88rem;font-weight:600;">${r.water}</div>
        </div>
        <div style="padding:0.75rem;background:#fafafa;border-radius:10px;border:1px solid var(--border);">
          <div style="font-size:0.7rem;color:var(--muted);margin-bottom:0.2rem;">Recommended Fertilizer</div>
          <div style="font-size:0.88rem;font-weight:600;">${r.fertilizer}</div>
        </div>
      </div>
      <div>
        <div style="font-size:0.82rem;font-weight:600;margin-bottom:0.6rem;">Planting Recommendations</div>
        <div style="display:flex;flex-direction:column;gap:0.5rem;">
          ${r.tips.map(t=>`
            <div style="display:flex;align-items:flex-start;gap:0.5rem;font-size:0.78rem;color:var(--muted);line-height:1.4;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2.5" style="flex-shrink:0;margin-top:1px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              ${t}
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

window.aiGenerate = () => {
  aiForm.crop   = document.getElementById('ai_crop')?.value   || aiForm.crop;
  aiForm.land   = document.getElementById('ai_land')?.value   || aiForm.land;
  aiForm.season = document.getElementById('ai_season')?.value || aiForm.season;
  aiForm.soil   = document.getElementById('ai_soil')?.value   || aiForm.soil;
  if(!aiForm.crop || !aiForm.land || !aiForm.season) return alert('Please fill in Crop Type, Land Area, and Season.');
  aiLoading=true; aiResult=null; renderAI();
  setTimeout(()=>{
    const d     = cropData[aiForm.crop];
    const area  = parseFloat(aiForm.land) || 1;
    const smod  = seasonMod[aiForm.season] || 1;
    const sm    = soilMod(aiForm.soil || '');
    const perHa = d.base * smod * sm;
    aiResult = {crop:aiForm.crop, area, season:aiForm.season, perHa, total:perHa*area, unit:d.unit, water:d.water, fertilizer:d.fertilizer, tips:d.tips};
    aiLoading=false; renderAI();
  }, 1800);
};

renderAI();