// ================================================================
// admin-yield.js  –  AgriSmart Yield Management
// Fully connected to Supabase yield_records table
// ================================================================

document.addEventListener('DOMContentLoaded', async function () {

  renderShell('yield');

  const session = Auth.getSession();

  // ── State ─────────────────────────────────────────────────────
  let records      = [];
  let ySearch      = '';
  let filterSeason = 'All';
  let showModal    = false;
  let editId       = null;
  let form         = { crop_type:'', yield_value:'', yield_unit:'tons', harvest_date:'', location:'', season:'', notes:'' };

  const CROPS   = ['Rice','Corn','Wheat','Vegetables','Tomatoes','Sugarcane','Banana','Coconut','Other'];
  const SEASONS = ['Dry Season','Wet Season','Year-round','Off-Season'];
  const UNITS   = ['tons','kg'];

  const CROP_ICONS = {
    Rice:'🌾', Corn:'🌽', Wheat:'🌿', Vegetables:'🥬', Tomatoes:'🍅',
    Sugarcane:'🎋', Banana:'🍌', Coconut:'🥥', Other:'🌱',
  };

  // ── Loaders ───────────────────────────────────────────────────
  async function loadRecords() {
    const { data, error } = await window.db
      .from('yield_records')
      .select('*')
      .order('harvest_date', { ascending: false });
    if (error) { console.error('[Yield] load:', error.message); return; }
    records = data || [];
  }

  // ── Computed stats ────────────────────────────────────────────
  function getStats() {
    if (!records.length) return { totalYield:'0 tons', totalRecords:0, topCrop:'—', avgYield:'0 kg' };

    const toKg = r => r.yield_unit === 'tons' ? r.yield_value * 1000 : r.yield_value;
    const totalKg = records.reduce((s, r) => s + toKg(r), 0);
    const totalYield = totalKg >= 1000
      ? (totalKg / 1000).toFixed(2) + ' tons'
      : totalKg.toFixed(0) + ' kg';

    const cropTotals = {};
    records.forEach(r => {
      if (!cropTotals[r.crop_type]) cropTotals[r.crop_type] = 0;
      cropTotals[r.crop_type] += toKg(r);
    });
    const topCrop = Object.entries(cropTotals).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';

    const avgKg = totalKg / records.length;
    const avgYield = avgKg >= 1000
      ? (avgKg / 1000).toFixed(2) + ' tons'
      : Math.round(avgKg) + ' kg';

    return { totalYield, totalRecords: records.length, topCrop, avgYield };
  }

  // ── Filter ────────────────────────────────────────────────────
  function getVisible() {
    return records.filter(r => {
      const matchSearch = !ySearch ||
        r.crop_type.toLowerCase().includes(ySearch.toLowerCase()) ||
        (r.location||'').toLowerCase().includes(ySearch.toLowerCase());
      const matchFilter = filterSeason === 'All' || r.season === filterSeason;
      return matchSearch && matchFilter;
    });
  }

  // ── Main render ───────────────────────────────────────────────
  function render() {
    const stats   = getStats();
    const visible = getVisible();

    document.getElementById('pageContent').innerHTML = `

      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.25rem;">
        <div>
          <h1 class="page-title" style="margin-bottom:0;">Yield Management</h1>
          <p class="page-subtitle" style="margin-bottom:0;">Track and manage crop yields across all fields</p>
        </div>
        <button class="btn btn-primary" onclick="YM.openAdd()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Yield Record
        </button>
      </div>

      <div class="stats-row" style="margin-bottom:1.5rem;">
        ${[
          { label:'Total Yield',   value: stats.totalYield,   sub:'Across all crops', icon:'⚖️' },
          { label:'Total Records', value: stats.totalRecords, sub:'Harvest entries',  icon:'🌾' },
          { label:'Top Crop',      value: stats.topCrop,      sub:'Most harvested',   icon:'📈' },
          { label:'Avg Yield',     value: stats.avgYield,     sub:'Per record',       icon:'📊' },
        ].map(s => `
          <div class="stat-card" style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:.7rem;color:var(--muted);font-weight:500;margin-bottom:.2rem;">${s.label}</div>
              <div class="stat-num" style="font-size:1.35rem;">${s.value}</div>
              <div style="font-size:.67rem;color:var(--muted);margin-top:.1rem;">${s.sub}</div>
            </div>
            <div style="font-size:1.5rem;opacity:.7;">${s.icon}</div>
          </div>`).join('')}
      </div>

      <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1.1rem;">
        <div style="flex:1;max-width:420px;position:relative;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"
            style="position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search by crop or location..." value="${ySearch}"
            oninput="YM.setSearch(this.value)"
            style="width:100%;padding:.5rem .75rem .5rem 2.1rem;border:1.5px solid var(--border);border-radius:8px;
                   font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;background:white;box-sizing:border-box;"/>
        </div>
        <div style="position:relative;">
          <select onchange="YM.setFilter(this.value)"
            style="padding:.5rem 2rem .5rem .75rem;border:1.5px solid var(--border);border-radius:8px;
                   font-family:'Poppins',sans-serif;font-size:.82rem;background:white;cursor:pointer;appearance:none;outline:none;">
            <option value="All" ${filterSeason==='All'?'selected':''}>All Seasons</option>
            ${SEASONS.map(s=>`<option value="${s}" ${filterSeason===s?'selected':''}>${s}</option>`).join('')}
          </select>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"
            style="position:absolute;right:.65rem;top:50%;transform:translateY(-50%);pointer-events:none;">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      <div class="card" style="padding:0;overflow:hidden;">
        <table>
          <thead>
            <tr>
              <th style="padding-left:1.5rem;">Crop Type</th>
              <th>Yield</th>
              <th>Harvest Date</th>
              <th>Location</th>
              <th>Season</th>
              <th style="text-align:right;padding-right:1.5rem;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${visible.length ? visible.map(r => `
              <tr>
                <td style="padding-left:1.5rem;">
                  <div style="display:flex;align-items:center;gap:.65rem;">
                    <div style="width:32px;height:32px;background:var(--green-light);border-radius:8px;
                                display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0;">
                      ${CROP_ICONS[r.crop_type]||'🌱'}
                    </div>
                    <span style="font-weight:600;font-size:.85rem;">${r.crop_type}</span>
                  </div>
                </td>
                <td style="font-weight:600;font-size:.88rem;color:var(--green-dark);">
                  ${Number(r.yield_value).toLocaleString()} ${r.yield_unit}
                </td>
                <td style="font-size:.82rem;color:var(--muted);">
                  <div style="display:flex;align-items:center;gap:.4rem;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    ${r.harvest_date ? new Date(r.harvest_date + 'T00:00:00').toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'}) : '—'}
                  </div>
                </td>
                <td style="font-size:.82rem;color:var(--muted);">
                  <div style="display:flex;align-items:center;gap:.4rem;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    ${r.location || '—'}
                  </div>
                </td>
                <td>
                  ${r.season
                    ? `<span style="background:#f0fdf4;color:#166534;font-size:.7rem;font-weight:600;
                                    padding:.25rem .65rem;border-radius:999px;border:1px solid #bbf7d0;">
                        ${r.season}
                       </span>`
                    : `<span style="color:var(--muted);font-size:.82rem;">—</span>`}
                </td>
                <td style="text-align:right;padding-right:1.5rem;">
                  <div style="display:flex;justify-content:flex-end;gap:.35rem;">
                    <button onclick="YM.openEdit(${r.id})"
                      style="background:none;border:1.5px solid var(--border);width:30px;height:30px;border-radius:7px;
                             cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;"
                      onmouseover="this.style.borderColor='var(--sage)';this.style.background='var(--green-light)'"
                      onmouseout="this.style.borderColor='var(--border)';this.style.background='none'">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button onclick="YM.deleteRecord(${r.id})"
                      style="background:none;border:1.5px solid var(--border);width:30px;height:30px;border-radius:7px;
                             cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;"
                      onmouseover="this.style.borderColor='#fca5a5';this.style.background='#fef2f2'"
                      onmouseout="this.style.borderColor='var(--border)';this.style.background='none'">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>`).join('')
            : `<tr><td colspan="6" style="text-align:center;padding:3rem;color:var(--muted);font-size:.85rem;">
                <div style="font-size:2rem;margin-bottom:.5rem;">🌾</div>
                No yield records found.
               </td></tr>`}
          </tbody>
        </table>
      </div>

      ${showModal ? renderModal() : ''}

      <style>
        @keyframes modalIn { from{opacity:0;transform:translateY(16px) scale(.98);}to{opacity:1;transform:translateY(0) scale(1);} }
      </style>
    `;

    const bd = document.getElementById('yieldBackdrop');
    if (bd) bd.addEventListener('click', () => { showModal = false; editId = null; render(); });
  }

  // ── Modal ─────────────────────────────────────────────────────
  function renderModal() {
    const isEdit = editId !== null;
    return `
      <div id="yieldBackdrop"
        style="position:fixed;inset:0;background:rgba(0,0,0,.38);z-index:300;display:flex;align-items:center;justify-content:center;">
        <div onclick="event.stopPropagation()"
          style="background:white;border-radius:16px;padding:1.75rem 2rem;width:520px;max-height:90vh;
                 overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:modalIn .22s ease;">

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">
            <div>
              <div style="font-size:1.05rem;font-weight:700;">${isEdit ? 'Edit Yield Record' : 'Add Yield Record'}</div>
              <div style="font-size:.75rem;color:var(--muted);">${isEdit ? 'Update harvest data' : 'Log a new harvest entry'}</div>
            </div>
            <button onclick="YM.closeModal()" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;border-radius:6px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div style="display:flex;flex-direction:column;gap:1rem;">

            <div>
              <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.5rem;">
                Crop Type <span style="color:var(--red);">*</span>
              </label>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem;">
                ${CROPS.map(c => `
                  <button onclick="YM.setFormCrop('${c}')"
                    style="padding:.45rem .3rem;border-radius:8px;font-family:'Poppins',sans-serif;font-size:.7rem;font-weight:600;
                           cursor:pointer;text-align:center;transition:all .15s;
                           border:1.5px solid ${form.crop_type===c?'var(--green-dark)':'var(--border)'};
                           background:${form.crop_type===c?'var(--green-light)':'white'};
                           color:${form.crop_type===c?'var(--green-dark)':'var(--muted)'};">
                    <div style="font-size:1rem;margin-bottom:.1rem;">${CROP_ICONS[c]||'🌱'}</div>${c}
                  </button>`).join('')}
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr auto;gap:.65rem;align-items:end;">
              <div>
                <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">
                  Yield Amount <span style="color:var(--red);">*</span>
                </label>
                <input id="yf_value" type="number" step="0.01" min="0" value="${form.yield_value}"
                  oninput="YM.setFormVal('yield_value',this.value)" placeholder="e.g. 5.2"
                  style="width:100%;padding:.6rem .75rem;border:1.5px solid var(--border);border-radius:8px;
                         font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;background:#f9fafb;"/>
              </div>
              <div>
                <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">Unit</label>
                <div style="display:flex;gap:.4rem;">
                  ${UNITS.map(u => `
                    <button onclick="YM.setFormVal('yield_unit','${u}')"
                      style="padding:.6rem .85rem;border-radius:8px;font-family:'Poppins',sans-serif;font-size:.78rem;font-weight:600;
                             cursor:pointer;transition:all .15s;
                             border:1.5px solid ${form.yield_unit===u?'var(--green-dark)':'var(--border)'};
                             background:${form.yield_unit===u?'var(--green-light)':'white'};
                             color:${form.yield_unit===u?'var(--green-dark)':'var(--muted)'};">${u}</button>`).join('')}
                </div>
              </div>
            </div>

            <div>
              <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">
                Harvest Date <span style="color:var(--red);">*</span>
              </label>
              <input id="yf_date" type="date" value="${form.harvest_date}"
                oninput="YM.setFormVal('harvest_date',this.value)"
                style="width:100%;padding:.6rem .75rem;border:1.5px solid var(--border);border-radius:8px;
                       font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;background:#f9fafb;"/>
            </div>

            <div>
              <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">Location / Field</label>
              <input id="yf_location" type="text" value="${form.location}"
                oninput="YM.setFormVal('location',this.value)" placeholder="e.g. Field A-1, Greenhouse 2"
                style="width:100%;padding:.6rem .75rem;border:1.5px solid var(--border);border-radius:8px;
                       font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;background:#f9fafb;"/>
            </div>

            <div>
              <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">Season</label>
              <div style="position:relative;">
                <select id="yf_season" onchange="YM.setFormVal('season',this.value)"
                  style="width:100%;padding:.6rem 2rem .6rem .75rem;border:1.5px solid var(--border);border-radius:8px;
                         font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;background:#f9fafb;appearance:none;cursor:pointer;">
                  <option value="">Select season</option>
                  ${SEASONS.map(s=>`<option value="${s}" ${form.season===s?'selected':''}>${s}</option>`).join('')}
                </select>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"
                  style="position:absolute;right:.75rem;top:50%;transform:translateY(-50%);pointer-events:none;">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            <div>
              <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.4rem;">Notes</label>
              <textarea id="yf_notes" rows="2"
                oninput="YM.setFormVal('notes',this.value)"
                placeholder="Optional notes about this harvest..."
                style="width:100%;padding:.6rem .75rem;border:1.5px solid var(--border);border-radius:8px;
                       font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;
                       background:#f9fafb;resize:vertical;">${form.notes}</textarea>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:.7rem;margin-top:.25rem;">
              <button onclick="YM.closeModal()"
                style="background:transparent;color:var(--muted);border:1.5px solid var(--border);
                       padding:.5rem 1.2rem;border-radius:8px;font-family:'Poppins',sans-serif;
                       font-size:.8rem;font-weight:600;cursor:pointer;">
                Cancel
              </button>
              <button class="btn btn-primary" onclick="YM.saveRecord()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                ${isEdit ? 'Update Record' : 'Save Record'}
              </button>
            </div>

          </div>
        </div>
      </div>`;
  }

  // ── Public API ────────────────────────────────────────────────
  window.YM = {

    setSearch(val)       { ySearch = val; render(); },
    setFilter(val)       { filterSeason = val; render(); },
    setFormCrop(c)       { form.crop_type = c; render(); },
    setFormVal(key, val) { form[key] = val; },

    openAdd() {
      editId = null;
      form = { crop_type:'', yield_value:'', yield_unit:'tons', harvest_date:'', location:'', season:'', notes:'' };
      showModal = true;
      render();
    },

    openEdit(id) {
      const r = records.find(x => x.id === id);
      if (!r) return;
      editId = id;
      form = {
        crop_type:    r.crop_type,
        yield_value:  r.yield_value,
        yield_unit:   r.yield_unit,
        harvest_date: r.harvest_date || '',
        location:     r.location     || '',
        season:       r.season       || '',
        notes:        r.notes        || '',
      };
      showModal = true;
      render();
    },

    closeModal() {
      showModal = false;
      editId = null;
      render();
    },

    async saveRecord() {
      form.yield_value  = document.getElementById('yf_value')?.value    || form.yield_value;
      form.harvest_date = document.getElementById('yf_date')?.value     || form.harvest_date;
      form.location     = document.getElementById('yf_location')?.value || form.location;
      form.season       = document.getElementById('yf_season')?.value   || form.season;
      form.notes        = document.getElementById('yf_notes')?.value    || form.notes;

      if (!form.crop_type || !form.yield_value || !form.harvest_date) {
        alert('Please fill in Crop Type, Yield Amount, and Harvest Date.');
        return;
      }

      const payload = {
        crop_type:    form.crop_type,
        yield_value:  parseFloat(form.yield_value),
        yield_unit:   form.yield_unit,
        harvest_date: form.harvest_date,
        location:     form.location || null,
        season:       form.season   || null,
        notes:        form.notes    || null,
        created_by:   session?.name || 'Admin',
      };

      let error;
      if (editId) {
        ({ error } = await window.db.from('yield_records').update(payload).eq('id', editId));
      } else {
        ({ error } = await window.db.from('yield_records').insert(payload));
      }

      if (error) { alert('Failed to save: ' + error.message); return; }

      showModal = false;
      editId = null;
      await loadRecords();
      render();
    },

    async deleteRecord(id) {
      if (!confirm('Delete this yield record?')) return;
      const { error } = await window.db.from('yield_records').delete().eq('id', id);
      if (error) { alert('Delete failed: ' + error.message); return; }
      await loadRecords();
      render();
    },
  };

  // ── Real-time ─────────────────────────────────────────────────
  window.db.channel('yield-records-live')
    .on('postgres_changes', { event:'*', schema:'public', table:'yield_records' },
      async () => { await loadRecords(); render(); })
    .subscribe();

  // ── Init ──────────────────────────────────────────────────────
  await loadRecords();
  render();
});