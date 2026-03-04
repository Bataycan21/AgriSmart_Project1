// ============================================================
// SUPABASE SETUP INSTRUCTIONS FOR GITHUB COPILOT
// ============================================================
// 1. Install Supabase client:
//    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//    OR: npm install @supabase/supabase-js
//
// 2. Initialize Supabase at the top of this file:
//    const supabase = window.supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_ANON_KEY')
//
// 3. Required Supabase tables:
//
//    TABLE: inventory
//    - id          (int8, primary key, auto increment)
//    - name        (text)
//    - cat         (text)
//    - qty         (int4)
//    - unit        (text)
//    - status      (text) — 'in-stock' | 'low-stock' | 'out-of-stock'
//    - created_at  (timestamptz, default now())
//
//    TABLE: inventory_history
//    - id          (int8, primary key, auto increment)
//    - date        (date)
//    - item        (text)
//    - action      (text) — 'Restocked' | 'Used'
//    - qty         (int4)
//    - unit        (text)
//    - by          (text)
//    - created_at  (timestamptz, default now())
//
//    TABLE: inventory_requests
//    - id          (int8, primary key, auto increment)
//    - date        (date)
//    - item_id     (int8, foreign key → inventory.id)
//    - item_name   (text)
//    - unit        (text)
//    - old_qty     (int4)
//    - new_qty     (int4)
//    - reason      (text)
//    - status      (text) — 'pending' | 'approved' | 'rejected'
//    - by          (text) — worker name from auth session
//    - created_at  (timestamptz, default now())
//
// 4. Row Level Security (RLS):
//    - inventory:          workers = SELECT only | admin/supervisor = ALL
//    - inventory_history:  workers = SELECT only | admin/supervisor = ALL
//    - inventory_requests: workers = INSERT + SELECT own rows | admin/supervisor = ALL
//
// 5. Replace all local array operations below with Supabase queries.
//    Each function is marked with: // TODO: SUPABASE — replace with ...
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

  renderShell('inventory');

  // TODO: SUPABASE — replace this local array with:
  // const { data: invItems } = await supabase.from('inventory').select('*').order('name')
  let invItems = [
    { id:1, name:'Rice Seeds (IR64)',     cat:'Seeds',      qty:500, unit:'kg',     status:'in-stock'    },
    { id:2, name:'Urea Fertilizer',       cat:'Fertilizer', qty:35,  unit:'bags',   status:'low-stock'   },
    { id:3, name:'Corn Seeds (Hybrid)',   cat:'Seeds',      qty:320, unit:'kg',     status:'in-stock'    },
    { id:4, name:'Organic Pesticide',     cat:'Pesticide',  qty:0,   unit:'liters', status:'out-of-stock' },
    { id:5, name:'Tractor Fuel',          cat:'Equipment',  qty:150, unit:'liters', status:'in-stock'    },
    { id:6, name:'Drip Irrigation Tubes', cat:'Equipment',  qty:80,  unit:'meters', status:'in-stock'    },
    { id:7, name:'NPK Fertilizer',        cat:'Fertilizer', qty:22,  unit:'bags',   status:'low-stock'   },
    { id:8, name:'Vegetable Seeds Mix',   cat:'Seeds',      qty:100, unit:'kg',     status:'in-stock'    },
  ];

  // TODO: SUPABASE — replace this local array with:
  // const { data: history } = await supabase.from('inventory_history').select('*').order('date', { ascending: false })
  let history = [
    { id:1, date:'2026-03-01', item:'Rice Seeds (IR64)',   action:'Restocked', qty:200, unit:'kg',     by:'Admin' },
    { id:2, date:'2026-03-02', item:'Urea Fertilizer',     action:'Used',      qty:15,  unit:'bags',   by:'Juan Dela Cruz' },
    { id:3, date:'2026-03-03', item:'Organic Pesticide',   action:'Used',      qty:10,  unit:'liters', by:'Pedro Santos' },
    { id:4, date:'2026-03-04', item:'NPK Fertilizer',      action:'Restocked', qty:30,  unit:'bags',   by:'Admin' },
    { id:5, date:'2026-03-04', item:'Corn Seeds (Hybrid)', action:'Used',      qty:50,  unit:'kg',     by:'Carlos Garcia' },
  ];

  // TODO: SUPABASE — window._invRequests is a temporary in-memory store.
  // Replace with: supabase.from('inventory_requests').select('*').eq('status','pending')
  if (!window._invRequests) window._invRequests = [];

  let invSearch='', invCat='All', activeTab='inventory', histSearch='';
  let selectedItem=null, modalOpen=false;

  function statusBadge(s) {
    if (s==='in-stock')  return `<span class="badge badge-green">In Stock</span>`;
    if (s==='low-stock') return `<span class="badge badge-orange">Low Stock</span>`;
    return `<span class="badge badge-red">Out of Stock</span>`;
  }
  function actionBadge(a) {
    if (a==='Restocked') return `<span class="badge" style="background:#dbeafe;color:#1e40af;">Restocked</span>`;
    return `<span class="badge badge-orange">Used</span>`;
  }
  function calcStatus(q) { return q<=0?'out-of-stock':q<50?'low-stock':'in-stock'; }

  function getQtyOptions(unit, currentQty) {
    let options=[];
    if (unit==='kg'||unit==='meters')   { for(let i=0;i<=1000;i+=10)  options.push(i); }
    else if (unit==='liters')            { for(let i=0;i<=1000;i+=5)   options.push(i); }
    else if (unit==='bags')              { for(let i=0;i<=1000;i+=1)   options.push(i); }
    else                                 { for(let i=0;i<=1000;i+=10)  options.push(i); }
    if (!options.includes(currentQty)) options.push(currentQty);
    options.sort((a,b)=>a-b);
    return options;
  }

  function render() {
    // TODO: SUPABASE — convert render() to async and await data fetching at the top:
    // const { data: invItems } = await supabase.from('inventory').select('*')
    // const { data: history }  = await supabase.from('inventory_history').select('*').order('date', { ascending: false })

    const vis = invItems.filter(i => {
      const ms = i.name.toLowerCase().includes(invSearch.toLowerCase());
      const mc = invCat==='All' || i.cat===invCat;
      return ms && mc;
    });
    const histVis = history.filter(h =>
      h.item.toLowerCase().includes(histSearch.toLowerCase()) ||
      h.action.toLowerCase().includes(histSearch.toLowerCase()) ||
      h.by.toLowerCase().includes(histSearch.toLowerCase())
    );

    document.getElementById('pageContent').innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.25rem;">
        <div>
          <h1 class="page-title" style="margin-bottom:0;">Inventory</h1>
          <p class="page-subtitle">View farm supplies and resources</p>
        </div>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:1.5rem;">
        <button onclick="WI.tab('inventory')"
          style="padding:.6rem 1.25rem;border:none;background:none;font-family:'Poppins',sans-serif;font-size:.83rem;font-weight:600;cursor:pointer;border-bottom:2px solid ${activeTab==='inventory'?'var(--green-dark)':'transparent'};color:${activeTab==='inventory'?'var(--green-dark)':'var(--muted)'};margin-bottom:-2px;">
          Inventory
        </button>
        <button onclick="WI.tab('history')"
          style="padding:.6rem 1.25rem;border:none;background:none;font-family:'Poppins',sans-serif;font-size:.83rem;font-weight:600;cursor:pointer;border-bottom:2px solid ${activeTab==='history'?'var(--green-dark)':'transparent'};color:${activeTab==='history'?'var(--green-dark)':'var(--muted)'};margin-bottom:-2px;">
          History
        </button>
      </div>

      ${activeTab==='inventory' ? `
        <div style="display:flex;gap:.75rem;margin-bottom:1.25rem;">
          <div style="flex:1;position:relative;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);pointer-events:none;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search inventory..." value="${invSearch}" oninput="WI.search(this.value)"
              style="width:100%;padding:.55rem .75rem .55rem 2.2rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;"/>
          </div>
          <div style="position:relative;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <select onchange="WI.cat(this.value)" style="padding:.55rem 2rem .55rem 2rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;background:white;cursor:pointer;appearance:none;">
              ${['All','Seeds','Fertilizer','Pesticide','Equipment'].map(c=>`<option ${invCat===c?'selected':''}>${c}</option>`).join('')}
            </select>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;right:9px;top:50%;transform:translateY(-50%);pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>

        <p style="font-size:.75rem;color:var(--muted);margin-bottom:.75rem;display:flex;align-items:center;gap:.3rem;">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Click any item to submit a quantity update request to admin.
        </p>

        <div class="card" style="padding:0;overflow:hidden;">
          <table>
            <thead>
              <tr>
                <th style="padding-left:1.5rem;">Item Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${vis.map(i=>`
                <tr onclick="WI.openRequest(${i.id})" style="cursor:pointer;" title="Click to request quantity update">
                  <td style="padding-left:1.5rem;">
                    <div style="display:flex;align-items:center;gap:.6rem;">
                      <div style="width:28px;height:28px;background:#f0fdf4;border-radius:6px;display:flex;align-items:center;justify-content:center;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2"><path d="M17 8C8 10 5.9 16.17 3.82 19.72A9.78 9.78 0 0 0 2 14C2 8.48 6.48 4 12 4c1.89 0 3.63.55 5 1.5zM12 22a10 10 0 0 0 9.97-9.17C19.4 15.4 15.6 18 11 18.5c.33.49.5 1.06.5 1.5a2 2 0 0 1-2 2z"/></svg>
                      </div>
                      <span style="font-weight:500;">${i.name}</span>
                    </div>
                  </td>
                  <td style="color:var(--muted);">${i.cat}</td>
                  <td>${i.qty} ${i.unit}</td>
                  <td>${statusBadge(i.status)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div style="margin-bottom:1.25rem;">
          <div style="position:relative;max-width:400px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);pointer-events:none;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search history..." value="${histSearch}" oninput="WI.histSearch(this.value)"
              style="width:100%;padding:.55rem .75rem .55rem 2.2rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;"/>
          </div>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
          <table>
            <thead>
              <tr>
                <th style="padding-left:1.5rem;">Date</th>
                <th>Item</th>
                <th>Action</th>
                <th>Quantity</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              ${histVis.map(h=>`
                <tr>
                  <td style="padding-left:1.5rem;color:var(--muted);">${h.date}</td>
                  <td style="font-weight:500;">${h.item}</td>
                  <td>${actionBadge(h.action)}</td>
                  <td>${h.qty} ${h.unit}</td>
                  <td style="color:var(--muted);">${h.by}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `}

      <!-- Request Modal -->
      ${modalOpen && selectedItem ? `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:999;display:flex;align-items:center;justify-content:center;" onclick="WI.closeModal()">
          <div style="background:white;border-radius:16px;padding:1.75rem;width:440px;box-shadow:0 20px 60px rgba(0,0,0,.15);animation:modalIn .2s ease;" onclick="event.stopPropagation()">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
              <h2 style="font-size:1.05rem;font-weight:700;">Update Quantity</h2>
              <button onclick="WI.closeModal()" style="background:none;border:none;cursor:pointer;color:var(--muted);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style="display:flex;flex-direction:column;gap:1rem;">
              <div>
                <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Item Name</label>
                <div style="padding:.55rem .75rem;background:#f3f4f6;border:1.5px solid var(--border);border-radius:8px;font-size:.82rem;color:var(--muted);">${selectedItem.name}</div>
              </div>
              <div>
                <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Category</label>
                <div style="padding:.55rem .75rem;background:#f3f4f6;border:1.5px solid var(--border);border-radius:8px;font-size:.82rem;color:var(--muted);">${selectedItem.cat}</div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
                <div>
                  <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Quantity</label>
                  <div style="position:relative;">
                    <select id="req_qty" style="width:100%;padding:.55rem 2rem .55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;background:white;appearance:none;cursor:pointer;">
                      ${getQtyOptions(selectedItem.unit, selectedItem.qty).map(q=>
                        `<option value="${q}" ${q===selectedItem.qty?'selected':''}>${q}</option>`
                      ).join('')}
                    </select>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;right:9px;top:50%;transform:translateY(-50%);pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
                <div>
                  <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Unit</label>
                  <div style="padding:.55rem .75rem;background:#f3f4f6;border:1.5px solid var(--border);border-radius:8px;font-size:.82rem;color:var(--muted);">${selectedItem.unit}</div>
                </div>
              </div>
              <div>
                <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Reason <span style="color:var(--red);">*</span></label>
                <textarea id="req_reason" placeholder="e.g. Used 4 bags for Section A planting..." rows="3"
                  style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;resize:vertical;box-sizing:border-box;"></textarea>
                <div id="req_reason_err" style="color:var(--red);font-size:.72rem;margin-top:3px;display:none;">Please provide a reason.</div>
              </div>
              <div style="display:flex;gap:.75rem;margin-top:.25rem;">
                <button onclick="WI.closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Cancel</button>
                <button onclick="WI.submitRequest()" class="btn btn-primary" style="flex:1;justify-content:center;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  Send Request
                </button>
              </div>
            </div>
          </div>
        </div>
        <style>@keyframes modalIn{from{opacity:0;transform:translateY(16px) scale(.98);}to{opacity:1;transform:translateY(0) scale(1);}}</style>
      ` : ''}

      <div id="successToast" style="display:none;position:fixed;bottom:1.5rem;right:1.5rem;background:var(--green-dark);color:white;padding:.75rem 1.25rem;border-radius:10px;font-size:.82rem;font-weight:600;z-index:1000;box-shadow:0 4px 20px rgba(0,0,0,.2);align-items:center;gap:.5rem;">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Request sent to admin!
      </div>
    `;
  }

  function showToast() {
    const t = document.getElementById('successToast');
    if (!t) return;
    t.style.display='flex';
    setTimeout(()=>{ t.style.display='none'; }, 3000);
  }

  window.WI = {
    tab(t)        { activeTab=t; render(); },
    search(v)     { invSearch=v; render(); },
    cat(v)        { invCat=v; render(); },
    histSearch(v) { histSearch=v; render(); },

    openRequest(id) {
      selectedItem=invItems.find(i=>i.id===id);
      modalOpen=true;
      render();
    },

    closeModal() {
      modalOpen=false;
      selectedItem=null;
      render();
    },

    submitRequest() {
      const reason = document.getElementById('req_reason').value.trim();
      const errEl  = document.getElementById('req_reason_err');
      if (!reason) { if(errEl) errEl.style.display='block'; return; }
      if (errEl) errEl.style.display='none';

      const newQty = parseInt(document.getElementById('req_qty').value);

      // TODO: SUPABASE — replace window._invRequests.push() with:
      // const { error } = await supabase.from('inventory_requests').insert({
      //   date:      new Date().toISOString().split('T')[0],
      //   item_id:   selectedItem.id,
      //   item_name: selectedItem.name,
      //   unit:      selectedItem.unit,
      //   old_qty:   selectedItem.qty,
      //   new_qty:   newQty,
      //   reason:    reason,
      //   status:    'pending',
      //   by:        Auth.getSession()?.name || 'Worker',
      // })
      // if (error) { console.error(error); return; }
      const req = {
        id:       Date.now(),
        date:     new Date().toISOString().split('T')[0],
        itemId:   selectedItem.id,
        itemName: selectedItem.name,
        unit:     selectedItem.unit,
        oldQty:   selectedItem.qty,
        newQty:   newQty,
        reason:   reason,
        status:   'pending',
        by:       Auth.getSession()?.name || 'Worker',
      };
      window._invRequests.push(req);

      modalOpen=false;
      selectedItem=null;
      render();
      showToast();
    },
  };

  // TODO: SUPABASE — subscribe to real-time changes so the worker sees live inventory:
  // supabase.channel('inventory-changes')
  //   .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => render())
  //   .subscribe()

  render();

});