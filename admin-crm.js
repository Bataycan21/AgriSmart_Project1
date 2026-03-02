renderShell('crm');

let crmContacts = [
  {id:1, name:'Roberto Cruz',    company:'Fresh Market Co.',      type:'Buyer',   email:'roberto@freshmarket.ph', phone:'+63 918 123 4567', location:'Manila',     stars:5, last:'Feb 18, 2026'},
  {id:2, name:'Elena Villanueva',company:'AgroSupply Inc.',       type:'Supplier',email:'elena@agrosupply.ph',    phone:'+63 917 234 5678', location:'Pampanga',   stars:4, last:'Feb 15, 2026'},
  {id:3, name:'Miguel Santos',   company:'FarmTech Solutions',    type:'Partner', email:'miguel@farmtech.ph',     phone:'+63 916 345 6789', location:'Laguna',     stars:5, last:'Feb 19, 2026'},
  {id:4, name:'Sofia Reyes',     company:'Green Harvest Corp.',   type:'Buyer',   email:'sofia@greenharv.ph',     phone:'+63 915 456 7890', location:'Batangas',   stars:2, last:'Feb 10, 2026'},
  {id:5, name:'Antonio Mendoza', company:'SeedMaster PH',         type:'Supplier',email:'antonio@seedmaster.ph',  phone:'+63 919 567 8901', location:'Nueva Ecija',stars:4, last:'Feb 12, 2026'},
  {id:6, name:'Carmen De Leon',  company:'Organic Farms Network', type:'Partner', email:'carmen@orgfarms.ph',     phone:'+63 918 678 9012', location:'Benguet',    stars:5, last:'Feb 20, 2026'},
];

let crmSearch='', crmType='All Types', crmModal=false;
const typeColor  = {Buyer:'badge-blue', Supplier:'badge-orange', Partner:'badge-green'};
const initials   = n => n.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
const starsHTML  = n => Array.from({length:5},(_,i)=>`<svg width="13" height="13" viewBox="0 0 24 24" fill="${i<n?'#f59e0b':'none'}" stroke="#f59e0b" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`).join('');

function renderCRM(){
  const vis = crmContacts.filter(c => {
    const ms = c.name.toLowerCase().includes(crmSearch.toLowerCase()) || c.company.toLowerCase().includes(crmSearch.toLowerCase());
    const mt = crmType==='All Types' || c.type===crmType;
    return ms && mt;
  });
  const buyers    = crmContacts.filter(c=>c.type==='Buyer').length;
  const suppliers = crmContacts.filter(c=>c.type==='Supplier').length;
  const partners  = crmContacts.filter(c=>c.type==='Partner').length;

  document.getElementById('pageContent').innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.5rem;">
      <div>
        <h1 class="page-title" style="margin-bottom:0;">CRM</h1>
        <p class="page-subtitle" style="margin-bottom:0;">Manage buyers, suppliers, and partners</p>
      </div>
      <button class="btn btn-primary" onclick="crmOpenAdd()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Contact
      </button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.25rem;">
      <div class="card" style="display:flex;align-items:center;gap:0.75rem;">
        <div style="width:42px;height:42px;background:#eff6ff;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
        </div>
        <div><div style="font-size:1.6rem;font-weight:700;color:#3b82f6;line-height:1;">${buyers}</div><div style="font-size:0.75rem;color:var(--muted);">Buyers</div></div>
      </div>
      <div class="card" style="display:flex;align-items:center;gap:0.75rem;">
        <div style="width:42px;height:42px;background:#fff7ed;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        </div>
        <div><div style="font-size:1.6rem;font-weight:700;color:#f59e0b;line-height:1;">${suppliers}</div><div style="font-size:0.75rem;color:var(--muted);">Suppliers</div></div>
      </div>
      <div class="card" style="display:flex;align-items:center;gap:0.75rem;">
        <div style="width:42px;height:42px;background:#f0fdf4;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div><div style="font-size:1.6rem;font-weight:700;color:#22c55e;line-height:1;">${partners}</div><div style="font-size:0.75rem;color:var(--muted);">Partners</div></div>
      </div>
    </div>

    <div style="display:flex;gap:0.75rem;margin-bottom:1.25rem;">
      <div style="flex:1;position:relative;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);pointer-events:none;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search contacts..." value="${crmSearch}" oninput="crmSearch=this.value;renderCRM()"
          style="width:100%;padding:0.55rem 0.75rem 0.55rem 2.2rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;box-sizing:border-box;"/>
      </div>
      <div style="position:relative;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        <select onchange="crmType=this.value;renderCRM()" style="padding:0.55rem 2rem 0.55rem 2rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;background:white;cursor:pointer;appearance:none;">
          ${['All Types','Buyer','Supplier','Partner'].map(t=>`<option ${crmType===t?'selected':''}>${t}</option>`).join('')}
        </select>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;right:9px;top:50%;transform:translateY(-50%);pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
      ${vis.map(c=>`
        <div class="card">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:0.85rem;">
            <div style="display:flex;align-items:center;gap:0.65rem;">
              <div style="width:38px;height:38px;background:var(--green-light);border:2px solid var(--sage);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:700;color:var(--green-dark);flex-shrink:0;">${initials(c.name)}</div>
              <div>
                <div style="font-weight:700;font-size:0.88rem;line-height:1.2;">${c.name}</div>
                <div style="font-size:0.72rem;color:var(--muted);">${c.company}</div>
              </div>
            </div>
            <span class="badge ${typeColor[c.type]}">${c.type}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.35rem;margin-bottom:0.85rem;">
            <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.78rem;color:var(--muted);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>${c.email}
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.78rem;color:var(--muted);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${c.phone}
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.78rem;color:var(--muted);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>${c.location}
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;gap:1px;">${starsHTML(c.stars)}</div>
            <span style="font-size:0.7rem;color:var(--muted);">Last: ${c.last}</span>
          </div>
        </div>`).join('')}
    </div>

    ${crmModal?`
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:999;display:flex;align-items:center;justify-content:center;" onclick="crmCloseModal()">
      <div style="background:white;border-radius:16px;padding:1.75rem;width:460px;box-shadow:0 20px 60px rgba(0,0,0,0.15);" onclick="event.stopPropagation()">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
          <h2 style="font-size:1.05rem;font-weight:700;">Add New Contact</h2>
          <button onclick="crmCloseModal()" style="background:none;border:none;cursor:pointer;color:var(--muted);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.9rem;">
          <div><label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">Full Name</label>
            <input id="cm_name" type="text" placeholder="e.g. Roberto Cruz"
              style="width:100%;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;box-sizing:border-box;"/></div>
          <div><label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">Company</label>
            <input id="cm_company" type="text" placeholder="e.g. Fresh Market Co."
              style="width:100%;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;box-sizing:border-box;"/></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
            <div><label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">Type</label>
              <select id="cm_type" style="width:100%;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;">
                <option>Buyer</option><option>Supplier</option><option>Partner</option>
              </select></div>
            <div><label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">Location</label>
              <input id="cm_loc" type="text" placeholder="e.g. Manila"
                style="width:100%;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;box-sizing:border-box;"/></div>
          </div>
          <div><label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">Email</label>
            <input id="cm_email" type="email" placeholder="e.g. contact@company.ph"
              style="width:100%;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;box-sizing:border-box;"/></div>
          <div><label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">Phone</label>
            <input id="cm_phone" type="text" placeholder="+63 9XX XXX XXXX"
              style="width:100%;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;box-sizing:border-box;"/></div>
          <div style="display:flex;gap:0.75rem;margin-top:0.25rem;">
            <button onclick="crmCloseModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Cancel</button>
            <button onclick="crmSave()" class="btn btn-primary" style="flex:1;justify-content:center;">Add Contact</button>
          </div>
        </div>
      </div>
    </div>` : ''}
  `;
}

window.crmOpenAdd    = () => { crmModal=true; renderCRM(); };
window.crmCloseModal = () => { crmModal=false; renderCRM(); };
window.crmSave       = () => {
  const name    = document.getElementById('cm_name').value.trim();
  const company = document.getElementById('cm_company').value.trim();
  const type    = document.getElementById('cm_type').value;
  const location= document.getElementById('cm_loc').value.trim();
  const email   = document.getElementById('cm_email').value.trim();
  const phone   = document.getElementById('cm_phone').value.trim();
  if(!name) return;
  const today = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  crmContacts.push({id:Date.now(),name,company,type,email,phone,location,stars:3,last:today});
  crmModal=false; renderCRM();
};

renderCRM();