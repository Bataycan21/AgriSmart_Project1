renderShell('inventory');

let invItems = [
  {id:1, name:'Rice Seeds (IR64)',     cat:'Seeds',      qty:500, unit:'kg',     status:'in-stock'   },
  {id:2, name:'Urea Fertilizer',       cat:'Fertilizer', qty:35,  unit:'bags',   status:'low-stock'  },
  {id:3, name:'Corn Seeds (Hybrid)',   cat:'Seeds',      qty:320, unit:'kg',     status:'in-stock'   },
  {id:4, name:'Organic Pesticide',     cat:'Pesticide',  qty:0,   unit:'liters', status:'out-of-stock'},
  {id:5, name:'Tractor Fuel',          cat:'Equipment',  qty:150, unit:'liters', status:'in-stock'   },
  {id:6, name:'Drip Irrigation Tubes', cat:'Equipment',  qty:80,  unit:'meters', status:'in-stock'   },
  {id:7, name:'NPK Fertilizer',        cat:'Fertilizer', qty:22,  unit:'bags',   status:'low-stock'  },
  {id:8, name:'Vegetable Seeds Mix',   cat:'Seeds',      qty:100, unit:'kg',     status:'in-stock'   },
];

let invSearch='', invCat='All', invModal=false, invEdit=null;

function invStatusBadge(s){
  if(s==='in-stock')   return`<span class="badge badge-green">In Stock</span>`;
  if(s==='low-stock')  return`<span class="badge badge-orange">Low Stock</span>`;
  return`<span class="badge badge-red">Out of Stock</span>`;
}
function invCalcStatus(q){ return q<=0?'out-of-stock':q<50?'low-stock':'in-stock'; }

function renderInventory(){
  const vis = invItems.filter(i => {
    const ms = i.name.toLowerCase().includes(invSearch.toLowerCase());
    const mc = invCat==='All' || i.cat===invCat;
    return ms && mc;
  });

  document.getElementById('pageContent').innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.5rem;">
      <div>
        <h1 class="page-title" style="margin-bottom:0;">Inventory</h1>
        <p class="page-subtitle" style="margin-bottom:0;">Manage farm supplies and resources</p>
      </div>
      <button class="btn btn-primary" onclick="invOpenAdd()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Item
      </button>
    </div>

    <div style="display:flex;gap:0.75rem;margin-bottom:1.25rem;">
      <div style="flex:1;position:relative;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);pointer-events:none;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search inventory..." value="${invSearch}" oninput="invSearch=this.value;renderInventory()"
          style="width:100%;padding:0.55rem 0.75rem 0.55rem 2.2rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;box-sizing:border-box;"/>
      </div>
      <div style="position:relative;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        <select onchange="invCat=this.value;renderInventory()" style="padding:0.55rem 2rem 0.55rem 2rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;background:white;cursor:pointer;appearance:none;">
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
                <div style="display:flex;align-items:center;gap:0.6rem;">
                  <div style="width:28px;height:28px;background:#f0fdf4;border-radius:6px;display:flex;align-items:center;justify-content:center;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 0 0 7-1 8 5-2-1-8-1-8 5 3-1 6 0 6 5-1-4-10-5-11 0 1-1 2.5-1 3 0-1 0-2.5.5-3 2 1-1 3-1 4 0-1-2-6-3-8 0 2-2 4-3 5-8 1-5 3-8 5-10z"/></svg>
                  </div>
                  <span style="font-weight:500;">${i.name}</span>
                </div>
              </td>
              <td style="color:var(--muted);">${i.cat}</td>
              <td>${i.qty} ${i.unit}</td>
              <td>${invStatusBadge(i.status)}</td>
              <td style="text-align:right;padding-right:1.5rem;">
                <button onclick="invOpenEdit(${i.id})" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;" title="Edit">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onclick="invDelete(${i.id})" style="background:none;border:none;cursor:pointer;color:#ef4444;padding:4px;" title="Delete">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    ${invModal ? `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:999;display:flex;align-items:center;justify-content:center;" onclick="invCloseModal()">
      <div style="background:white;border-radius:16px;padding:1.75rem;width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.15);" onclick="event.stopPropagation()">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
          <h2 style="font-size:1.05rem;font-weight:700;">${invEdit?'Edit Item':'Add New Item'}</h2>
          <button onclick="invCloseModal()" style="background:none;border:none;cursor:pointer;color:var(--muted);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="display:flex;flex-direction:column;gap:1rem;">
          <div>
            <label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">Item Name</label>
            <input id="im_name" type="text" value="${invEdit?.name||''}" placeholder="e.g. Rice Seeds (IR64)"
              style="width:100%;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;box-sizing:border-box;"/>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
            <div>
              <label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">Category</label>
              <select id="im_cat" style="width:100%;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;">
                ${['Seeds','Fertilizer','Pesticide','Equipment'].map(c=>`<option ${invEdit?.cat===c?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">Unit</label>
              <input id="im_unit" type="text" value="${invEdit?.unit||''}" placeholder="kg / bags / liters"
                style="width:100%;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;box-sizing:border-box;"/>
            </div>
          </div>
          <div>
            <label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">Quantity</label>
            <input id="im_qty" type="number" value="${invEdit?.qty??''}" placeholder="0"
              style="width:100%;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-family:'Poppins',sans-serif;font-size:0.82rem;outline:none;box-sizing:border-box;"/>
          </div>
          <div style="display:flex;gap:0.75rem;margin-top:0.25rem;">
            <button onclick="invCloseModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Cancel</button>
            <button onclick="invSave()" class="btn btn-primary" style="flex:1;justify-content:center;">${invEdit?'Save Changes':'Add Item'}</button>
          </div>
        </div>
      </div>
    </div>` : ''}
  `;
}

window.invOpenAdd    = () => { invModal=true; invEdit=null; renderInventory(); };
window.invOpenEdit   = id => { invModal=true; invEdit=invItems.find(i=>i.id===id); renderInventory(); };
window.invCloseModal = () => { invModal=false; invEdit=null; renderInventory(); };
window.invDelete     = id => { invItems=invItems.filter(i=>i.id!==id); renderInventory(); };
window.invSave       = () => {
  const name = document.getElementById('im_name').value.trim();
  const cat  = document.getElementById('im_cat').value;
  const unit = document.getElementById('im_unit').value.trim();
  const qty  = parseInt(document.getElementById('im_qty').value)||0;
  if(!name) return;
  if(invEdit) {
    Object.assign(invItems.find(i=>i.id===invEdit.id), {name,cat,unit,qty,status:invCalcStatus(qty)});
  } else {
    invItems.push({id:Date.now(),name,cat,qty,unit,status:invCalcStatus(qty)});
  }
  invModal=false; invEdit=null; renderInventory();
};

renderInventory();