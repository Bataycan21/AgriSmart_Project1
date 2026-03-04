// ============================================================
// SUPABASE SETUP INSTRUCTIONS FOR GITHUB COPILOT
// ============================================================
// TABLE: crm_contacts
// - id          (int8, primary key, auto increment)
// - name        (text)
// - company     (text)
// - type        (text) — 'Buyer' | 'Supplier' | 'Partner'
// - email       (text)
// - phone       (text)
// - location    (text)
// - description (text)
// - stars       (int4, default 3)
// - last        (text)
// - enabled     (bool, default true)
// - created_at  (timestamptz, default now())
//
// TABLE: crm_history
// - id          (int8, primary key, auto increment)
// - date        (text)
// - contact     (text)
// - company     (text)
// - action      (text) — 'Added' | 'Edited' | 'Disabled' | 'Enabled' | 'Deleted'
// - by          (text)
// - notes       (text)
// - created_at  (timestamptz, default now())
//
// TODO: SUPABASE — fetch contacts: supabase.from('crm_contacts').select('*').order('id')
// TODO: SUPABASE — fetch history:  supabase.from('crm_history').select('*').order('created_at',{ascending:false})
// TODO: SUPABASE — on add:    supabase.from('crm_contacts').insert({...})
// TODO: SUPABASE — on edit:   supabase.from('crm_contacts').update({...}).eq('id', id)
// TODO: SUPABASE — on toggle: supabase.from('crm_contacts').update({ enabled }).eq('id', id)
// TODO: SUPABASE — on delete: supabase.from('crm_contacts').delete().eq('id', id)
// TODO: SUPABASE — on any action, also insert into crm_history
// RLS: admin/supervisor = ALL | no worker access needed
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

  renderShell('crm');

  // TODO: SUPABASE — replace with fetch from crm_contacts table
  let crmContacts = [
    { id:1, name:'Roberto Cruz',     company:'Fresh Market Co.',      type:'Buyer',    email:'roberto@freshmarket.ph',  phone:'+63 918 123 4567', location:'Manila',      description:'Primary vegetable buyer. Purchases bulk produce every week for distribution across Metro Manila wet markets.',       stars:5, last:'Feb 18, 2026', enabled:true  },
    { id:2, name:'Elena Villanueva', company:'AgroSupply Inc.',        type:'Supplier', email:'elena@agrosupply.ph',     phone:'+63 917 234 5678', location:'Pampanga',    description:'Fertilizer and pesticide supplier. Provides NPK, urea, and organic pesticide solutions at competitive wholesale pricing.', stars:4, last:'Feb 15, 2026', enabled:true  },
    { id:3, name:'Miguel Santos',    company:'FarmTech Solutions',     type:'Partner',  email:'miguel@farmtech.ph',      phone:'+63 916 345 6789', location:'Laguna',      description:'Technology partner for smart irrigation systems. Provides IoT soil sensors and drip irrigation equipment installation.',   stars:5, last:'Feb 19, 2026', enabled:true  },
    { id:4, name:'Sofia Reyes',      company:'Green Harvest Corp.',    type:'Buyer',    email:'sofia@greenharv.ph',      phone:'+63 915 456 7890', location:'Batangas',    description:'Fruit and vegetable buyer focused on export-grade produce. Requires strict quality control and packaging standards.',       stars:2, last:'Feb 10, 2026', enabled:true  },
    { id:5, name:'Antonio Mendoza',  company:'SeedMaster PH',          type:'Supplier', email:'antonio@seedmaster.ph',   phone:'+63 919 567 8901', location:'Nueva Ecija', description:'Certified seed supplier for rice, corn, and vegetable varieties. Offers hybrid and open-pollinated seed varieties.',        stars:4, last:'Feb 12, 2026', enabled:true  },
    { id:6, name:'Carmen De Leon',   company:'Organic Farms Network',  type:'Partner',  email:'carmen@orgfarms.ph',      phone:'+63 918 678 9012', location:'Benguet',     description:'Organic certification and training partner. Assists in transitioning conventional farms to certified organic operations.',   stars:5, last:'Feb 20, 2026', enabled:false },
  ];

  // TODO: SUPABASE — replace with fetch from crm_history table
  let crmHistory = [
    { id:1, date:'Feb 20, 2026', contact:'Carmen De Leon',   company:'Organic Farms Network', action:'Added',    by:'Admin', notes:'New partner contact added.' },
    { id:2, date:'Feb 19, 2026', contact:'Miguel Santos',    company:'FarmTech Solutions',    action:'Edited',   by:'Admin', notes:'Updated phone number and description.' },
    { id:3, date:'Feb 18, 2026', contact:'Roberto Cruz',     company:'Fresh Market Co.',      action:'Edited',   by:'Admin', notes:'Raised star rating to 5.' },
    { id:4, date:'Feb 15, 2026', contact:'Elena Villanueva', company:'AgroSupply Inc.',       action:'Added',    by:'Admin', notes:'Supplier contact created.' },
    { id:5, date:'Feb 10, 2026', contact:'Sofia Reyes',      company:'Green Harvest Corp.',   action:'Disabled', by:'Admin', notes:'Temporarily disabled pending quality review.' },
  ];

  let crmSearch   = '', crmType = 'All Types';
  let activeTab   = 'contacts';  // 'contacts' | 'manage' | 'history'
  let crmModal    = false;       // false | 'add' | 'edit'
  let editContact = null;
  let histSearch  = '';
  let nextId      = 7;
  let histNextId  = 6;

  const typeColor = { Buyer:'badge-blue', Supplier:'badge-orange', Partner:'badge-green' };
  const initials  = n => n.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
  const starsHTML = n => Array.from({length:5},(_,i)=>`<svg width="13" height="13" viewBox="0 0 24 24" fill="${i<n?'#f59e0b':'none'}" stroke="#f59e0b" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`).join('');

  function actionBadgeStyle(a) {
    const map = {
      Added:    'background:#dcfce7;color:#166534;',
      Edited:   'background:#dbeafe;color:#1e40af;',
      Enabled:  'background:#dcfce7;color:#166534;',
      Disabled: 'background:#fee2e2;color:#991b1b;',
      Deleted:  'background:#fee2e2;color:#991b1b;',
    };
    return map[a] || 'background:#f3f4f6;color:#374151;';
  }

  function logHistory(contact, action, notes='') {
    // TODO: SUPABASE — replace with:
    // await supabase.from('crm_history').insert({ date: today, contact: contact.name, company: contact.company, action, by: Auth.getSession()?.name || 'Admin', notes })
    const today = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    crmHistory.unshift({ id: histNextId++, date: today, contact: contact.name, company: contact.company, action, by: 'Admin', notes });
  }

  // ── MODAL HTML ─────────────────────────────────────────────
  function modalHTML() {
    const isEdit = crmModal === 'edit' && editContact;
    const c      = isEdit ? editContact : {};
    return `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:999;display:flex;align-items:center;justify-content:center;padding:1rem;" onclick="CRM.closeModal()">
        <div style="background:white;border-radius:16px;padding:1.75rem 2rem;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.15);animation:modalIn .2s ease;" onclick="event.stopPropagation()">

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
            <h2 style="font-size:1.05rem;font-weight:700;">${isEdit ? 'Edit Contact' : 'Add New Contact'}</h2>
            <button onclick="CRM.closeModal()" style="background:none;border:none;cursor:pointer;color:var(--muted);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div style="display:flex;flex-direction:column;gap:.9rem;">

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
              <div>
                <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Full Name <span style="color:var(--red);">*</span></label>
                <input id="cm_name" type="text" value="${c.name||''}" placeholder="e.g. Roberto Cruz"
                  style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;"/>
                <div id="cm_name_err" style="color:var(--red);font-size:.7rem;margin-top:2px;display:none;">Required.</div>
              </div>
              <div>
                <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Company <span style="color:var(--red);">*</span></label>
                <input id="cm_company" type="text" value="${c.company||''}" placeholder="e.g. Fresh Market Co."
                  style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;"/>
                <div id="cm_company_err" style="color:var(--red);font-size:.7rem;margin-top:2px;display:none;">Required.</div>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
              <div>
                <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Type</label>
                <div style="position:relative;">
                  <select id="cm_type" style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;appearance:none;cursor:pointer;">
                    ${['Buyer','Supplier','Partner'].map(t=>`<option ${c.type===t?'selected':''}>${t}</option>`).join('')}
                  </select>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;right:9px;top:50%;transform:translateY(-50%);pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
              <div>
                <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Location</label>
                <input id="cm_loc" type="text" value="${c.location||''}" placeholder="e.g. Manila"
                  style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;"/>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
              <div>
                <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Email</label>
                <input id="cm_email" type="email" value="${c.email||''}" placeholder="contact@company.ph"
                  style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;"/>
              </div>
              <div>
                <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Phone</label>
                <input id="cm_phone" type="text" value="${c.phone||''}" placeholder="+63 9XX XXX XXXX"
                  style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;"/>
              </div>
            </div>

            <div>
              <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Description</label>
              <textarea id="cm_desc" rows="3" placeholder="e.g. Vegetable supplier providing bulk produce weekly..."
                style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;resize:vertical;box-sizing:border-box;">${c.description||''}</textarea>
            </div>

            <div>
              <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.4rem;">Star Rating</label>
              <div style="display:flex;gap:.3rem;" id="starPicker">
                ${Array.from({length:5},(_,i)=>`
                  <button onclick="CRM.setStar(${i+1})" id="starBtn_${i+1}"
                    style="background:none;border:none;cursor:pointer;padding:2px;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="${i<(c.stars||3)?'#f59e0b':'none'}" stroke="#f59e0b" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </button>`).join('')}
              </div>
              <input type="hidden" id="cm_stars" value="${c.stars||3}"/>
            </div>

            <div style="display:flex;gap:.75rem;margin-top:.25rem;">
              <button onclick="CRM.closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Cancel</button>
              <button onclick="CRM.save()" class="btn btn-primary" style="flex:1;justify-content:center;">${isEdit?'Save Changes':'Add Contact'}</button>
            </div>
          </div>
        </div>
      </div>
      <style>@keyframes modalIn{from{opacity:0;transform:translateY(16px) scale(.98);}to{opacity:1;transform:translateY(0) scale(1);}}</style>
    `;
  }

  // ── MAIN RENDER ────────────────────────────────────────────
  function render() {
    const vis = crmContacts.filter(c => {
      const ms = c.name.toLowerCase().includes(crmSearch.toLowerCase()) || c.company.toLowerCase().includes(crmSearch.toLowerCase());
      const mt = crmType === 'All Types' || c.type === crmType;
      return ms && mt;
    });
    const histVis  = crmHistory.filter(h =>
      h.contact.toLowerCase().includes(histSearch.toLowerCase()) ||
      h.company.toLowerCase().includes(histSearch.toLowerCase()) ||
      h.action.toLowerCase().includes(histSearch.toLowerCase())
    );
    const buyers    = crmContacts.filter(c=>c.type==='Buyer').length;
    const suppliers = crmContacts.filter(c=>c.type==='Supplier').length;
    const partners  = crmContacts.filter(c=>c.type==='Partner').length;
    const enabled   = crmContacts.filter(c=>c.enabled).length;
    const disabled  = crmContacts.filter(c=>!c.enabled).length;

    document.getElementById('pageContent').innerHTML = `

      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.25rem;">
        <div>
          <h1 class="page-title" style="margin-bottom:0;">CRM</h1>
          <p class="page-subtitle">Manage buyers, suppliers, and partners</p>
        </div>
        ${activeTab === 'contacts' ? `
          <button class="btn btn-primary" onclick="CRM.openAdd()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Contact
          </button>` : ''}
      </div>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:1rem;margin-bottom:1.5rem;">
        <div class="card" style="display:flex;align-items:center;gap:.75rem;">
          <div style="width:38px;height:38px;background:#eff6ff;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          </div>
          <div><div style="font-size:1.4rem;font-weight:700;color:#3b82f6;line-height:1;">${buyers}</div><div style="font-size:.72rem;color:var(--muted);">Buyers</div></div>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:.75rem;">
          <div style="width:38px;height:38px;background:#fff7ed;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </div>
          <div><div style="font-size:1.4rem;font-weight:700;color:#f59e0b;line-height:1;">${suppliers}</div><div style="font-size:.72rem;color:var(--muted);">Suppliers</div></div>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:.75rem;">
          <div style="width:38px;height:38px;background:#f0fdf4;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div><div style="font-size:1.4rem;font-weight:700;color:#22c55e;line-height:1;">${partners}</div><div style="font-size:.72rem;color:var(--muted);">Partners</div></div>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:.75rem;">
          <div style="width:38px;height:38px;background:#f0fdf4;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <div><div style="font-size:1.4rem;font-weight:700;color:#22c55e;line-height:1;">${enabled}</div><div style="font-size:.72rem;color:var(--muted);">Active</div></div>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:.75rem;">
          <div style="width:38px;height:38px;background:#fef2f2;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
          <div><div style="font-size:1.4rem;font-weight:700;color:#ef4444;line-height:1;">${disabled}</div><div style="font-size:.72rem;color:var(--muted);">Disabled</div></div>
        </div>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:1.5rem;">
        <button onclick="CRM.tab('contacts')"
          style="padding:.6rem 1.25rem;border:none;background:none;font-family:'Poppins',sans-serif;font-size:.83rem;font-weight:600;cursor:pointer;border-bottom:2px solid ${activeTab==='contacts'?'var(--green-dark)':'transparent'};color:${activeTab==='contacts'?'var(--green-dark)':'var(--muted)'};margin-bottom:-2px;">
          Contacts
        </button>
        <button onclick="CRM.tab('manage')"
          style="padding:.6rem 1.25rem;border:none;background:none;font-family:'Poppins',sans-serif;font-size:.83rem;font-weight:600;cursor:pointer;border-bottom:2px solid ${activeTab==='manage'?'var(--green-dark)':'transparent'};color:${activeTab==='manage'?'var(--green-dark)':'var(--muted)'};margin-bottom:-2px;">
          Manage
        </button>
        <button onclick="CRM.tab('history')"
          style="padding:.6rem 1.25rem;border:none;background:none;font-family:'Poppins',sans-serif;font-size:.83rem;font-weight:600;cursor:pointer;border-bottom:2px solid ${activeTab==='history'?'var(--green-dark)':'transparent'};color:${activeTab==='history'?'var(--green-dark)':'var(--muted)'};margin-bottom:-2px;">
          History
        </button>
      </div>

      <!-- ══ CONTACTS TAB ══ -->
      ${activeTab === 'contacts' ? `
        <div style="display:flex;gap:.75rem;margin-bottom:1.25rem;">
          <div style="flex:1;position:relative;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);pointer-events:none;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search contacts..." value="${crmSearch}" oninput="CRM.search(this.value)"
              style="width:100%;padding:.55rem .75rem .55rem 2.2rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;"/>
          </div>
          <div style="position:relative;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <select onchange="CRM.filterType(this.value)" style="padding:.55rem 2rem .55rem 2rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;background:white;cursor:pointer;appearance:none;">
              ${['All Types','Buyer','Supplier','Partner'].map(t=>`<option ${crmType===t?'selected':''}>${t}</option>`).join('')}
            </select>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;right:9px;top:50%;transform:translateY(-50%);pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
          ${vis.map(c=>`
            <div class="card" style="display:flex;flex-direction:column;${!c.enabled?'opacity:.55;':''}">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:.75rem;">
                <div style="display:flex;align-items:center;gap:.65rem;">
                  <div style="width:40px;height:40px;background:var(--green-light);border:2px solid var(--sage);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;color:var(--green-dark);flex-shrink:0;">${initials(c.name)}</div>
                  <div>
                    <div style="font-weight:700;font-size:.88rem;line-height:1.2;">${c.name}</div>
                    <div style="font-size:.72rem;color:var(--muted);">${c.company}</div>
                  </div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.3rem;">
                  <span class="badge ${typeColor[c.type]}">${c.type}</span>
                  ${!c.enabled?`<span style="font-size:.62rem;font-weight:600;color:#ef4444;background:#fee2e2;padding:.1rem .45rem;border-radius:999px;">Disabled</span>`:''}
                </div>
              </div>

              <!-- Description -->
              <p style="font-size:.75rem;color:var(--muted);line-height:1.55;margin-bottom:.75rem;border-left:3px solid var(--sage);padding-left:.6rem;">${c.description||'—'}</p>

              <!-- Contact info -->
              <div style="display:flex;flex-direction:column;gap:.3rem;margin-bottom:.75rem;">
                <div style="display:flex;align-items:center;gap:.5rem;font-size:.76rem;color:var(--muted);">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>${c.email}
                </div>
                <div style="display:flex;align-items:center;gap:.5rem;font-size:.76rem;color:var(--muted);">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${c.phone}
                </div>
                <div style="display:flex;align-items:center;gap:.5rem;font-size:.76rem;color:var(--muted);">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>${c.location}
                </div>
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;">
                <div style="display:flex;gap:1px;">${starsHTML(c.stars)}</div>
                <div style="display:flex;align-items:center;gap:.5rem;">
                  <span style="font-size:.7rem;color:var(--muted);">Last: ${c.last}</span>
                  <button onclick="CRM.openEdit(${c.id})" title="Edit" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:3px;border-radius:5px;">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </div>
              </div>
            </div>`).join('')}
        </div>
      ` : ''}

      <!-- ══ MANAGE TAB ══ -->
      ${activeTab === 'manage' ? `
        <div class="card" style="padding:0;overflow:hidden;">
          <table>
            <thead>
              <tr>
                <th style="padding-left:1.5rem;">Contact</th>
                <th>Type</th>
                <th>Location</th>
                <th>Stars</th>
                <th>Last Contact</th>
                <th style="text-align:center;">Visible</th>
                <th style="text-align:right;padding-right:1.5rem;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${crmContacts.map(c=>`
                <tr>
                  <td style="padding-left:1.5rem;">
                    <div style="display:flex;align-items:center;gap:.6rem;">
                      <div style="width:32px;height:32px;background:var(--green-light);border:1.5px solid var(--sage);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:700;color:var(--green-dark);flex-shrink:0;">${initials(c.name)}</div>
                      <div>
                        <div style="font-weight:600;font-size:.84rem;">${c.name}</div>
                        <div style="font-size:.72rem;color:var(--muted);">${c.company}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="badge ${typeColor[c.type]}">${c.type}</span></td>
                  <td style="font-size:.82rem;color:var(--muted);">${c.location}</td>
                  <td><div style="display:flex;gap:1px;">${starsHTML(c.stars)}</div></td>
                  <td style="font-size:.78rem;color:var(--muted);">${c.last}</td>
                  <td style="text-align:center;">
                    <label style="position:relative;display:inline-block;width:42px;height:22px;cursor:pointer;">
                      <input type="checkbox" ${c.enabled?'checked':''} onchange="CRM.toggle(${c.id})" style="opacity:0;width:0;height:0;position:absolute;"/>
                      <span style="position:absolute;inset:0;background:${c.enabled?'var(--green-dark)':'#d1d5db'};border-radius:999px;transition:background .2s;"></span>
                      <span style="position:absolute;top:3px;left:${c.enabled?'23px':'3px'};width:16px;height:16px;background:white;border-radius:50%;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2);"></span>
                    </label>
                  </td>
                  <td style="text-align:right;padding-right:1.5rem;">
                    <button onclick="CRM.openEdit(${c.id})" title="Edit" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;">
                      <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onclick="CRM.del(${c.id})" title="Delete" style="background:none;border:none;cursor:pointer;color:#ef4444;padding:4px;">
                      <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- ══ HISTORY TAB ══ -->
      ${activeTab === 'history' ? `
        <div style="margin-bottom:1.25rem;">
          <div style="position:relative;max-width:400px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);pointer-events:none;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search history..." value="${histSearch}" oninput="CRM.histSearch(this.value)"
              style="width:100%;padding:.55rem .75rem .55rem 2.2rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;"/>
          </div>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
          <table>
            <thead>
              <tr>
                <th style="padding-left:1.5rem;">Date</th>
                <th>Contact</th>
                <th>Company</th>
                <th>Action</th>
                <th>Notes</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              ${histVis.length ? histVis.map(h=>`
                <tr>
                  <td style="padding-left:1.5rem;color:var(--muted);white-space:nowrap;">${h.date}</td>
                  <td style="font-weight:600;font-size:.84rem;">${h.contact}</td>
                  <td style="font-size:.78rem;color:var(--muted);">${h.company}</td>
                  <td><span style="font-size:.72rem;font-weight:600;padding:.2rem .6rem;border-radius:999px;${actionBadgeStyle(h.action)}">${h.action}</span></td>
                  <td style="font-size:.75rem;color:var(--muted);max-width:220px;">${h.notes}</td>
                  <td style="font-size:.78rem;color:var(--muted);">${h.by}</td>
                </tr>`).join('')
              : `<tr><td colspan="6" style="text-align:center;padding:2.5rem;color:var(--muted);font-size:.82rem;">No history found.</td></tr>`}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${crmModal ? modalHTML() : ''}
    `;
  }

  // ── PUBLIC API ─────────────────────────────────────────────
  window.CRM = {

    tab(t)        { activeTab=t; render(); },
    search(v)     { crmSearch=v; render(); },
    filterType(v) { crmType=v; render(); },
    histSearch(v) { histSearch=v; render(); },

    setStar(n) {
      const input = document.getElementById('cm_stars');
      if (input) input.value = n;
      Array.from({length:5},(_,i) => {
        const btn = document.getElementById(`starBtn_${i+1}`);
        if (btn) btn.querySelector('svg').setAttribute('fill', i < n ? '#f59e0b' : 'none');
      });
    },

    openAdd() {
      crmModal = 'add';
      editContact = null;
      render();
    },

    openEdit(id) {
      crmModal = 'edit';
      editContact = crmContacts.find(c => c.id === id);
      render();
    },

    closeModal() {
      crmModal = false;
      editContact = null;
      render();
    },

    save() {
      const name    = document.getElementById('cm_name')?.value.trim();
      const company = document.getElementById('cm_company')?.value.trim();
      const type    = document.getElementById('cm_type')?.value;
      const loc     = document.getElementById('cm_loc')?.value.trim();
      const email   = document.getElementById('cm_email')?.value.trim();
      const phone   = document.getElementById('cm_phone')?.value.trim();
      const desc    = document.getElementById('cm_desc')?.value.trim();
      const stars   = parseInt(document.getElementById('cm_stars')?.value) || 3;

      const nameErr = document.getElementById('cm_name_err');
      const coErr   = document.getElementById('cm_company_err');
      if (nameErr) nameErr.style.display = !name ? 'block' : 'none';
      if (coErr)   coErr.style.display   = !company ? 'block' : 'none';
      if (!name || !company) return;

      const today = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});

      if (crmModal === 'edit' && editContact) {
        // TODO: SUPABASE — await supabase.from('crm_contacts').update({ name,company,type,location:loc,email,phone,description:desc,stars,last:today }).eq('id', editContact.id)
        Object.assign(crmContacts.find(c=>c.id===editContact.id), { name,company,type,location:loc,email,phone,description:desc,stars,last:today });
        logHistory({ name, company }, 'Edited', `Updated contact details.`);
      } else {
        // TODO: SUPABASE — await supabase.from('crm_contacts').insert({ name,company,type,location:loc,email,phone,description:desc,stars,last:today,enabled:true })
        const newContact = { id:nextId++, name,company,type,email,phone,location:loc,description:desc,stars,last:today,enabled:true };
        crmContacts.push(newContact);
        logHistory(newContact, 'Added', `New ${type} contact added.`);
      }

      crmModal = false;
      editContact = null;
      render();
    },

    toggle(id) {
      const c = crmContacts.find(c=>c.id===id);
      if (!c) return;
      c.enabled = !c.enabled;
      // TODO: SUPABASE — await supabase.from('crm_contacts').update({ enabled: c.enabled }).eq('id', id)
      logHistory(c, c.enabled ? 'Enabled' : 'Disabled', `Contact ${c.enabled?'enabled':'disabled'} by admin.`);
      render();
    },

    del(id) {
      if (!confirm('Delete this contact? This cannot be undone.')) return;
      const c = crmContacts.find(c=>c.id===id);
      if (c) logHistory(c, 'Deleted', `Contact permanently removed.`);
      // TODO: SUPABASE — await supabase.from('crm_contacts').delete().eq('id', id)
      crmContacts = crmContacts.filter(c=>c.id!==id);
      render();
    },
  };

  render();

});