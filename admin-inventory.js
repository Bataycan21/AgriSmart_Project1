// ============================================================
// SUPABASE SETUP INSTRUCTIONS FOR GITHUB COPILOT
// ============================================================
// 1. Install Supabase client:
//    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//    OR: npm install @supabase/supabase-js
//
// 2. Initialize at the top of this file:
//    const supabase = window.supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_ANON_KEY')
//
// 3. Required Supabase tables:
//
//    TABLE: inventory
//    - id          (int8, primary key, auto increment)
//    - name        (text, not null)
//    - cat         (text)
//    - qty         (int4, default 0)
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
//    - status      (text, default 'pending') — 'pending' | 'approved' | 'rejected'
//    - by          (text)
//    - created_at  (timestamptz, default now())
//
// 4. Row Level Security (RLS) policies:
//    - inventory:
//        SELECT: authenticated users (workers + admin)
//        INSERT/UPDATE/DELETE: admin and supervisor roles only
//    - inventory_history:
//        SELECT: authenticated users
//        INSERT: admin and supervisor roles only
//    - inventory_requests:
//        SELECT: admin/supervisor see all | workers see only their own (auth.uid())
//        INSERT: workers only
//        UPDATE: admin/supervisor only (to approve/reject)
//
// 5. Every local array operation below is marked with a TODO comment.
//    GitHub Copilot: replace each marked block with the Supabase equivalent.
//
// 6. Make render() async and await all data fetches before rendering HTML.
//
// 7. For real-time updates on the Requests tab, use Supabase Realtime:
//    supabase.channel('requests').on('postgres_changes', {...}, () => render()).subscribe()
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

  renderShell('inventory');

  // TODO: SUPABASE — remove window._invRequests entirely.
  // Load requests from: supabase.from('inventory_requests').select('*').order('created_at', { ascending: false })
  if (!window._invRequests) window._invRequests = [];

  // TODO: SUPABASE — replace with: const { data: invItems } = await supabase.from('inventory').select('*').order('name')
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

  // TODO: SUPABASE — replace with: const { data: history } = await supabase.from('inventory_history').select('*').order('date', { ascending: false })
  let history = [
    { id:1, date:'2026-03-01', item:'Rice Seeds (IR64)',   action:'Restocked', qty:200, unit:'kg',     by:'Admin' },
    { id:2, date:'2026-03-02', item:'Urea Fertilizer',     action:'Used',      qty:15,  unit:'bags',   by:'Juan Dela Cruz' },
    { id:3, date:'2026-03-03', item:'Organic Pesticide',   action:'Used',      qty:10,  unit:'liters', by:'Pedro Santos' },
    { id:4, date:'2026-03-04', item:'NPK Fertilizer',      action:'Restocked', qty:30,  unit:'bags',   by:'Admin' },
    { id:5, date:'2026-03-04', item:'Corn Seeds (Hybrid)', action:'Used',      qty:50,  unit:'kg',     by:'Carlos Garcia' },
  ];

  let invSearch='', invCat='All', invModal=false, invEdit=null;
  let activeTab='inventory', histSearch='', histNextId=6;

  function statusBadge(s) {
    if (s==='in-stock')  return `<span class="badge badge-green">In Stock</span>`;
    if (s==='low-stock') return `<span class="badge badge-orange">Low Stock</span>`;
    return `<span class="badge badge-red">Out of Stock</span>`;
  }
  function actionBadge(a) {
    if (a==='Restocked') return `<span class="badge" style="background:#dbeafe;color:#1e40af;">Restocked</span>`;
    return `<span class="badge badge-orange">Used</span>`;
  }
  function reqStatusBadge(s) {
    if (s==='pending')  return `<span class="badge badge-orange">Pending</span>`;
    if (s==='approved') return `<span class="badge badge-green">Approved</span>`;
    return `<span class="badge badge-red">Rejected</span>`;
  }
  function calcStatus(q) { return q<=0?'out-of-stock':q<50?'low-stock':'in-stock'; }
  const pendingCount = () => window._invRequests.filter(r=>r.status==='pending').length;

  function render() {
    // TODO: SUPABASE — make this function async, then fetch fresh data at the top:
    // const { data: invItems }  = await supabase.from('inventory').select('*').order('name')
    // const { data: history }   = await supabase.from('inventory_history').select('*').order('date',{ascending:false})
    // const { data: requests }  = await supabase.from('inventory_requests').select('*').order('created_at',{ascending:false})
    // window._invRequests = requests || []

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
    const pc = pendingCount();

    document.getElementById('pageContent').innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.25rem;">
        <div>
          <h1 class="page-title" style="margin-bottom:0;">Inventory</h1>
          <p class="page-subtitle">Manage farm supplies and resources</p>
        </div>
        ${activeTab==='inventory' ? `
          <button class="btn btn-primary" onclick="AI.openAdd()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Item
          </button>` : ''}
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:1.5rem;">
        <button onclick="AI.tab('inventory')"
          style="padding:.6rem 1.25rem;border:none;background:none;font-family:'Poppins',sans-serif;font-size:.83rem;font-weight:600;cursor:pointer;border-bottom:2px solid ${activeTab==='inventory'?'var(--green-dark)':'transparent'};color:${activeTab==='inventory'?'var(--green-dark)':'var(--muted)'};margin-bottom:-2px;">
          Inventory
        </button>
        <button onclick="AI.tab('history')"
          style="padding:.6rem 1.25rem;border:none;background:none;font-family:'Poppins',sans-serif;font-size:.83rem;font-weight:600;cursor:pointer;border-bottom:2px solid ${activeTab==='history'?'var(--green-dark)':'transparent'};color:${activeTab==='history'?'var(--green-dark)':'var(--muted)'};margin-bottom:-2px;">
          History
        </button>
        <button onclick="AI.tab('requests')"
          style="padding:.6rem 1.25rem;border:none;background:none;font-family:'Poppins',sans-serif;font-size:.83rem;font-weight:600;cursor:pointer;border-bottom:2px solid ${activeTab==='requests'?'var(--green-dark)':'transparent'};color:${activeTab==='requests'?'var(--green-dark)':'var(--muted)'};margin-bottom:-2px;position:relative;">
          Requests
          ${pc>0?`<span style="position:absolute;top:6px;right:6px;background:var(--red);color:white;border-radius:999px;font-size:.6rem;font-weight:700;padding:1px 5px;min-width:16px;text-align:center;">${pc}</span>`:''}
        </button>
      </div>

      <!-- INVENTORY TAB -->
      ${activeTab==='inventory' ? `
        <div style="display:flex;gap:.75rem;margin-bottom:1.25rem;">
          <div style="flex:1;position:relative;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);pointer-events:none;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search inventory..." value="${invSearch}" oninput="AI.search(this.value)"
              style="width:100%;padding:.55rem .75rem .55rem 2.2rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;"/>
          </div>
          <div style="position:relative;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <select onchange="AI.cat(this.value)" style="padding:.55rem 2rem .55rem 2rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;background:white;cursor:pointer;appearance:none;">
              ${['All','Seeds','Fertilizer','Pesticide','Equipment'].map(c=>`<option ${invCat===c?'selected':''}>${c}</option>`).join('')}
            </select>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;right:9px;top:50%;transform:translateY(-50%);pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
          <table>
            <thead>
              <tr>
                <th style="padding-left:1.5rem;">Item Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Status</th>
                <th style="text-align:right;padding-right:1.5rem;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${vis.map(i=>`
                <tr>
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
                  <td style="text-align:right;padding-right:1.5rem;">
                    <button onclick="AI.openEdit(${i.id})" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;" title="Edit">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onclick="AI.del(${i.id})" style="background:none;border:none;cursor:pointer;color:#ef4444;padding:4px;" title="Delete">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- HISTORY TAB -->
      ${activeTab==='history' ? `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
          <div style="position:relative;flex:1;max-width:400px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);pointer-events:none;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search history..." value="${histSearch}" oninput="AI.histSearch(this.value)"
              style="width:100%;padding:.55rem .75rem .55rem 2.2rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;"/>
          </div>
          <button class="btn btn-primary" onclick="AI.openRecord()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Record
          </button>
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
      ` : ''}

      <!-- REQUESTS TAB -->
      ${activeTab==='requests' ? `
        ${window._invRequests.length===0 ? `
          <div style="text-align:center;padding:3rem 1rem;color:var(--muted);font-size:.85rem;">
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin:0 auto .75rem;display:block;opacity:.3;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            No requests yet.
          </div>` : `
          <div class="card" style="padding:0;overflow:hidden;">
            <table>
              <thead>
                <tr>
                  <th style="padding-left:1.5rem;">Date</th>
                  <th>Item</th>
                  <th>Requested By</th>
                  <th>Old Qty</th>
                  <th>New Qty</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th style="text-align:center;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${window._invRequests.map(r=>`
                  <tr>
                    <td style="padding-left:1.5rem;color:var(--muted);white-space:nowrap;">${r.date}</td>
                    <td style="font-weight:500;">${r.itemName}</td>
                    <td style="color:var(--muted);">${r.by}</td>
                    <td>${r.oldQty} ${r.unit}</td>
                    <td style="font-weight:600;color:var(--green-dark);">${r.newQty} ${r.unit}</td>
                    <td style="color:var(--muted);max-width:200px;font-size:.75rem;">${r.reason}</td>
                    <td>${reqStatusBadge(r.status)}</td>
                    <td style="text-align:center;">
                      ${r.status==='pending' ? `
                        <button onclick="AI.approve(${r.id})" style="background:#dcfce7;border:none;cursor:pointer;color:#166534;padding:5px 10px;border-radius:6px;font-size:.72rem;font-weight:600;margin-right:4px;">✓ Approve</button>
                        <button onclick="AI.reject(${r.id})"  style="background:#fee2e2;border:none;cursor:pointer;color:#991b1b;padding:5px 10px;border-radius:6px;font-size:.72rem;font-weight:600;">✕ Reject</button>`
                      : `<span style="font-size:.75rem;color:var(--muted);">—</span>`}
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`}
      ` : ''}

      <!-- ADD / EDIT ITEM MODAL -->
      ${invModal===true ? `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:999;display:flex;align-items:center;justify-content:center;" onclick="AI.closeModal()">
          <div style="background:white;border-radius:16px;padding:1.75rem;width:420px;box-shadow:0 20px 60px rgba(0,0,0,.15);" onclick="event.stopPropagation()">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
              <h2 style="font-size:1.05rem;font-weight:700;">${invEdit?'Edit Item':'Add New Item'}</h2>
              <button onclick="AI.closeModal()" style="background:none;border:none;cursor:pointer;color:var(--muted);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style="display:flex;flex-direction:column;gap:1rem;">
              <div>
                <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Item Name</label>
                <input id="im_name" type="text" value="${invEdit?.name||''}" placeholder="e.g. Rice Seeds (IR64)"
                  style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;"/>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
                <div>
                  <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Category</label>
                  <select id="im_cat" style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;">
                    ${['Seeds','Fertilizer','Pesticide','Equipment'].map(c=>`<option ${invEdit?.cat===c?'selected':''}>${c}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Unit</label>
                  <input id="im_unit" type="text" value="${invEdit?.unit||''}" placeholder="kg / bags / liters"
                    style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;"/>
                </div>
              </div>
              <div>
                <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Quantity</label>
                <input id="im_qty" type="number" value="${invEdit?.qty??''}" placeholder="0"
                  style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;"/>
              </div>
              <div style="display:flex;gap:.75rem;margin-top:.25rem;">
                <button onclick="AI.closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Cancel</button>
                <button onclick="AI.save()" class="btn btn-primary" style="flex:1;justify-content:center;">${invEdit?'Save Changes':'Add Item'}</button>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- ADD RECORD MODAL -->
      ${invModal==='record' ? `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:999;display:flex;align-items:center;justify-content:center;" onclick="AI.closeModal()">
          <div style="background:white;border-radius:16px;padding:1.75rem;width:420px;box-shadow:0 20px 60px rgba(0,0,0,.15);" onclick="event.stopPropagation()">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
              <h2 style="font-size:1.05rem;font-weight:700;">Add History Record</h2>
              <button onclick="AI.closeModal()" style="background:none;border:none;cursor:pointer;color:var(--muted);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style="display:flex;flex-direction:column;gap:1rem;">
              <div>
                <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Date</label>
                <input id="hr_date" type="date" style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;"/>
              </div>
              <div>
                <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Item</label>
                <select id="hr_item" style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;">
                  ${invItems.map(i=>`<option value="${i.name}">${i.name}</option>`).join('')}
                </select>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
                <div>
                  <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Action</label>
                  <select id="hr_action" style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;">
                    <option>Restocked</option><option>Used</option>
                  </select>
                </div>
                <div>
                  <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">Quantity</label>
                  <input id="hr_qty" type="number" placeholder="0"
                    style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;"/>
                </div>
              </div>
              <div>
                <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:.3rem;">By</label>
                <input id="hr_by" type="text" placeholder="Name of person"
                  style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:.82rem;outline:none;box-sizing:border-box;"/>
              </div>
              <div style="display:flex;gap:.75rem;margin-top:.25rem;">
                <button onclick="AI.closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Cancel</button>
                <button onclick="AI.saveRecord()" class="btn btn-primary" style="flex:1;justify-content:center;">Add Record</button>
              </div>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }

  window.AI = {
    tab(t)        { activeTab=t; invModal=false; render(); },
    search(v)     { invSearch=v; render(); },
    cat(v)        { invCat=v; render(); },
    histSearch(v) { histSearch=v; render(); },
    openAdd()     { invModal=true; invEdit=null; render(); },
    openEdit(id)  { invModal=true; invEdit=invItems.find(i=>i.id===id); render(); },
    openRecord()  { invModal='record'; render(); },
    closeModal()  { invModal=false; invEdit=null; render(); },

    del(id) {
      if (!confirm('Delete this item?')) return;
      // TODO: SUPABASE — replace with:
      // const { error } = await supabase.from('inventory').delete().eq('id', id)
      // if (error) { console.error(error); return; }
      invItems=invItems.filter(i=>i.id!==id);
      render();
    },

    approve(id) {
      // TODO: SUPABASE — replace with:
      // const { error } = await supabase.from('inventory_requests').update({ status: 'approved' }).eq('id', id)
      // Then update inventory: await supabase.from('inventory').update({ qty: req.new_qty, status: calcStatus(req.new_qty) }).eq('id', req.item_id)
      // Then insert history: await supabase.from('inventory_history').insert({ date: req.date, item: req.item_name, action: 'Used', qty: req.new_qty, unit: req.unit, by: req.by })
      const req=window._invRequests.find(r=>r.id===id);
      if (!req) return;
      req.status='approved';
      const item=invItems.find(i=>i.id===req.itemId);
      if (item) { item.qty=req.newQty; item.status=calcStatus(req.newQty); }
      history.push({id:histNextId++,date:req.date,item:req.itemName,action:'Used',qty:req.newQty,unit:req.unit,by:req.by});
      render();
    },

    reject(id) {
      // TODO: SUPABASE — replace with:
      // await supabase.from('inventory_requests').update({ status: 'rejected' }).eq('id', id)
      const req=window._invRequests.find(r=>r.id===id);
      if (req) { req.status='rejected'; render(); }
    },

    save() {
      const name=document.getElementById('im_name').value.trim();
      const cat =document.getElementById('im_cat').value;
      const unit=document.getElementById('im_unit').value.trim();
      const qty =parseInt(document.getElementById('im_qty').value)||0;
      if (!name) return;
      if (invEdit) {
        // TODO: SUPABASE — replace with:
        // await supabase.from('inventory').update({ name, cat, unit, qty, status: calcStatus(qty) }).eq('id', invEdit.id)
        // await supabase.from('inventory_history').insert({ date: today, item: name, action: 'Restocked', qty, unit, by: 'Admin' })
        Object.assign(invItems.find(i=>i.id===invEdit.id),{name,cat,unit,qty,status:calcStatus(qty)});
        history.push({id:histNextId++,date:new Date().toISOString().split('T')[0],item:name,action:'Restocked',qty,unit,by:'Admin'});
      } else {
        // TODO: SUPABASE — replace with:
        // const { data } = await supabase.from('inventory').insert({ name, cat, qty, unit, status: calcStatus(qty) }).select().single()
        // await supabase.from('inventory_history').insert({ date: today, item: name, action: 'Restocked', qty, unit, by: 'Admin' })
        invItems.push({id:Date.now(),name,cat,qty,unit,status:calcStatus(qty)});
        history.push({id:histNextId++,date:new Date().toISOString().split('T')[0],item:name,action:'Restocked',qty,unit,by:'Admin'});
      }
      invModal=false; invEdit=null; render();
    },

    saveRecord() {
      const date  =document.getElementById('hr_date').value;
      const item  =document.getElementById('hr_item').value;
      const action=document.getElementById('hr_action').value;
      const qty   =parseInt(document.getElementById('hr_qty').value)||0;
      const by    =document.getElementById('hr_by').value.trim()||'Admin';
      const inv   =invItems.find(i=>i.name===item);
      const unit  =inv?inv.unit:'';
      if (!date||!qty) return;
      // TODO: SUPABASE — replace with:
      // await supabase.from('inventory_history').insert({ date, item, action, qty, unit, by })
      history.push({id:histNextId++,date,item,action,qty,unit,by});
      invModal=false; render();
    },
  };

  // TODO: SUPABASE — subscribe to real-time updates on requests so admin sees new requests instantly:
  // supabase.channel('admin-requests')
  //   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inventory_requests' }, () => render())
  //   .subscribe()
  //
  // Also subscribe to inventory changes:
  // supabase.channel('admin-inventory')
  //   .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => render())
  //   .subscribe()

  render();

});