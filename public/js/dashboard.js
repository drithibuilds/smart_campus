/* Smart Campus CCMS - Dashboard JS */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const api = (url, opts={}) => fetch(url, {
  headers:{'Content-Type':'application/json'}, ...opts
}).then(async r => { const j = await r.json().catch(()=>({})); if(!r.ok) throw new Error(j.error||'Error'); return j; });

let me = null;
let allComplaints = [];
let departments = [];
let staffList = [];

// ---------- bootstrap ----------
(async function init(){
  try { me = (await api('/api/auth/me')).user; }
  catch { window.location.href='/login.html'; return; }

  $('#userName').textContent = me.name;
  $('#userRole').textContent = me.role.toUpperCase() + (me.department?` · ${me.department}`:'');
  $('#hiName').textContent = me.name.split(' ')[0];
  $('#avatar').textContent = me.name[0].toUpperCase();

  // Hide staff/department sections for plain students (still useful for staff & admin)
  if (me.role === 'student') {
    $('button[data-tab="staff"]').style.display='none';
    $('button[data-tab="department"]').style.display='none';
  }

  await loadDepartments();
  await refreshAll();
  await loadNotifications();

  // tabs
  $$('#nav button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  $('#logoutBtn').addEventListener('click', async () => {
    await api('/api/auth/logout',{method:'POST'}); window.location.href='/login.html';
  });
  $('#raiseBtn').addEventListener('click', () => $('#raisePanel').style.display='block');
  $('#cancelRaise').addEventListener('click', () => $('#raisePanel').style.display='none');
  $('#quickRaise').addEventListener('click', () => { switchTab('complaints'); $('#raisePanel').style.display='block'; });
  $('#complaintForm').addEventListener('submit', submitComplaint);
  $('#modalClose').addEventListener('click', ()=>$('#modal').classList.remove('show'));
  $('#notifClose').addEventListener('click', ()=>$('#notifModal').classList.remove('show'));
  $('#bell').addEventListener('click', openNotifications);
})();

function switchTab(name){
  $$('#nav button').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  $$('.content').forEach(c=>c.classList.toggle('active', c.id===`tab-${name}`));
  $('#pageTitle').textContent = ({overview:'Overview',complaints:'Complaints',department:'Department Dashboard',staff:'Staff & Assign',history:'History'})[name];
  if (name==='department') renderDepartment();
  if (name==='staff') renderStaffAndAssign();
  if (name==='history') renderHistory();
}

async function loadDepartments(){
  const { departments: d } = await api('/api/departments');
  departments = d;
  const sel = $('#catSel');
  sel.innerHTML = d.map(x=>`<option>${x.name}</option>`).join('');
}

async function refreshAll(){
  const [stats, list] = await Promise.all([
    api('/api/complaints/stats/overview'),
    api('/api/complaints'),
  ]);
  $('#kTotal').textContent = stats.total||0;
  $('#kPending').textContent = stats.pending||0;
  $('#kProgress').textContent = stats.in_progress||0;
  $('#kResolved').textContent = stats.resolved||0;
  allComplaints = list.complaints;
  renderRecent();
  renderComplaintsTable();
}

function statusBadge(s){
  const cls = s==='Pending'?'b-pending':s==='In Progress'?'b-progress':'b-resolved';
  return `<span class="badge ${cls}">${s}</span>`;
}
function prioBadge(p){
  const cls = p==='High'?'b-high':p==='Low'?'b-low':'b-medium';
  return `<span class="badge ${cls}">${p}</span>`;
}
function fmt(d){ return new Date(d).toLocaleString(); }

function renderRecent(){
  const rows = allComplaints.slice(0,6);
  $('#recentTbody').innerHTML = rows.length
    ? rows.map(c=>`<tr onclick="openDetails(${c.id})" style="cursor:pointer">
        <td>#${c.id}</td><td>${c.title}</td><td>${c.category}</td>
        <td>${prioBadge(c.priority)}</td><td>${statusBadge(c.status)}</td><td>${fmt(c.created_at)}</td></tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center;color:var(--muted)">No complaints yet.</td></tr>`;
}

function renderComplaintsTable(){
  const tbody = $('#complaintsTbody');
  tbody.innerHTML = allComplaints.length ? allComplaints.map(c=>`
    <tr>
      <td>#${c.id}</td><td>${c.title}</td><td>${c.category}</td>
      <td>${prioBadge(c.priority)}</td><td>${statusBadge(c.status)}</td>
      <td>${c.assignee_name||'<span style="color:var(--muted)">—</span>'}</td>
      <td>${fmt(c.created_at)}</td>
      <td><button class="btn sm ghost" onclick="openDetails(${c.id})">View</button></td>
    </tr>`).join('') : `<tr><td colspan="8" style="text-align:center;color:var(--muted)">No complaints.</td></tr>`;
}

async function submitComplaint(e){
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  $('#raiseAlert').innerHTML='';
  try{
    await api('/api/complaints',{method:'POST',body:JSON.stringify(data)});
    form.reset();
    $('#raisePanel').style.display='none';
    $('#raiseAlert').innerHTML='';
    await refreshAll();
    alert('Complaint submitted successfully ✅');
  }catch(err){
    $('#raiseAlert').innerHTML=`<div class="alert err">${err.message}</div>`;
  }
}

// ---------- Details modal ----------
window.openDetails = async function(id){
  const { complaint, history } = await api('/api/complaints/'+id);
  $('#mTitle').textContent = `#${complaint.id} · ${complaint.title}`;

  const isPriv = me.role!=='student';
  const canStatus = isPriv;
  const statusOptions = ['Pending','In Progress','Resolved']
    .map(s=>`<option ${s===complaint.status?'selected':''}>${s}</option>`).join('');

  // Pre-load staff for assign dropdown (filtered to this complaint's department)
  let staffOpts = '';
  if (canStatus){
    const { staff } = await api('/api/staff?department='+encodeURIComponent(complaint.category));
    staffOpts = `<option value="">— select staff —</option>` +
      staff.map(s=>`<option value="${s.id}" ${s.id===complaint.assigned_to?'selected':''}>${s.name} (${s.email})</option>`).join('');
  }

  $('#mBody').innerHTML = `
    <p><b>Submitted by:</b> ${complaint.user_name} (${complaint.user_email})</p>
    <p><b>Category:</b> ${complaint.category} &nbsp; <b>Priority:</b> ${prioBadge(complaint.priority)} &nbsp; <b>Status:</b> ${statusBadge(complaint.status)}</p>
    <p><b>Location:</b> ${complaint.location||'—'}</p>
    <p><b>Description:</b><br>${complaint.description.replace(/\n/g,'<br>')}</p>
    <p><b>Assigned to:</b> ${complaint.assignee_name||'—'}</p>
    ${canStatus ? `
      <hr style="border-color:#1f2937;margin:16px 0">
      <div class="form-grid">
        <div class="field"><label>Update Status</label>
          <select id="newStatus">${statusOptions}</select></div>
        <div class="field"><label>Note (optional)</label>
          <input id="statusNote" placeholder="Short note for history" /></div>
        <div class="full"><button class="btn sm" onclick="updateStatus(${complaint.id})">Save Status</button></div>
        <div class="field full"><label>Assign to Staff</label>
          <select id="assignSel">${staffOpts}</select></div>
        <div class="full"><button class="btn sm" onclick="assignStaff(${complaint.id})">Assign</button></div>
      </div>` : ''}
    <h3 style="margin-top:18px">Activity</h3>
    <div class="timeline">
      ${history.map(h=>`<div class="item">
         <div><b>${h.action}</b> ${h.note?` — ${h.note}`:''}</div>
         <div class="t">${fmt(h.created_at)} ${h.actor_name?` · by ${h.actor_name}`:''}</div>
      </div>`).join('') || '<div class="t">No activity yet.</div>'}
    </div>
  `;
  $('#modal').classList.add('show');
};

window.updateStatus = async function(id){
  const status = $('#newStatus').value;
  const note = $('#statusNote').value;
  await api(`/api/complaints/${id}/status`,{method:'PUT',body:JSON.stringify({status,note})});
  $('#modal').classList.remove('show');
  await refreshAll();
};

window.assignStaff = async function(id){
  const staff_id = parseInt($('#assignSel').value,10);
  if (!staff_id) return alert('Select a staff member');
  await api(`/api/complaints/${id}/assign`,{method:'PUT',body:JSON.stringify({staff_id})});
  $('#modal').classList.remove('show');
  await refreshAll();
};

// ---------- Department dashboard ----------
function renderDepartment(){
  const counts = {};
  departments.forEach(d => counts[d.name] = {total:0, Pending:0, 'In Progress':0, Resolved:0});
  allComplaints.forEach(c => {
    if (!counts[c.category]) counts[c.category] = {total:0,Pending:0,'In Progress':0,Resolved:0};
    counts[c.category].total++; counts[c.category][c.status]++;
  });
  $('#deptCards').innerHTML = Object.entries(counts).map(([name,k])=>`
    <div class="card">
      <div class="label">${name}</div>
      <div class="num info">${k.total}</div>
      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
        <span class="badge b-pending">Pending ${k.Pending}</span>
        <span class="badge b-progress">In Progress ${k['In Progress']}</span>
        <span class="badge b-resolved">Resolved ${k.Resolved}</span>
      </div>
    </div>`).join('');
}

// ---------- Staff & Assign ----------
async function renderStaffAndAssign(){
  const { staff } = await api('/api/staff');
  staffList = staff;
  $('#staffTbody').innerHTML = staff.length ? staff.map(s=>`
    <tr><td>${s.name}</td><td>${s.email}</td><td>${s.department||'—'}</td><td>${s.phone||'—'}</td></tr>
  `).join('') : `<tr><td colspan="4" style="text-align:center;color:var(--muted)">No staff yet. Register staff via the signup page.</td></tr>`;

  const pending = allComplaints.filter(c=>c.status!=='Resolved');
  $('#assignTbody').innerHTML = pending.length ? pending.map(c=>{
    const opts = staff.filter(s=>!s.department || s.department===c.category)
      .map(s=>`<option value="${s.id}" ${s.id===c.assigned_to?'selected':''}>${s.name}</option>`).join('');
    return `<tr>
      <td>#${c.id}</td><td>${c.title}</td><td>${c.category}</td><td>${statusBadge(c.status)}</td>
      <td><select id="as-${c.id}"><option value="">— select —</option>${opts}</select></td>
      <td><button class="btn sm" onclick="quickAssign(${c.id})">Assign</button></td>
    </tr>`;
  }).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--muted)">Nothing to assign 🎉</td></tr>`;
}

window.quickAssign = async function(id){
  const v = parseInt($('#as-'+id).value,10);
  if (!v) return alert('Pick a staff member');
  await api(`/api/complaints/${id}/assign`,{method:'PUT',body:JSON.stringify({staff_id:v})});
  await refreshAll(); renderStaffAndAssign();
};

// ---------- History ----------
function renderHistory(){
  const items = [...allComplaints].sort((a,b)=> new Date(b.updated_at)-new Date(a.updated_at));
  $('#historyTbody').innerHTML = items.length ? items.map(c=>`
    <tr>
      <td>#${c.id}</td><td>${c.title}</td><td>${c.category}</td>
      <td>${statusBadge(c.status)}</td><td>${fmt(c.updated_at)}</td>
      <td><button class="btn sm ghost" onclick="openDetails(${c.id})">View</button></td>
    </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--muted)">No history.</td></tr>`;
}

// ---------- Notifications ----------
async function loadNotifications(){
  try{
    const { notifications } = await api('/api/notifications');
    const unread = notifications.filter(n=>!n.is_read).length;
    const dot = $('#notifDot');
    if (unread>0){ dot.style.display='inline-block'; dot.textContent = unread; }
    else dot.style.display='none';
    window.__notifs = notifications;
  }catch(e){}
}
async function openNotifications(){
  const list = window.__notifs || [];
  $('#notifList').innerHTML = list.length
    ? list.map(n=>`<div class="panel" style="margin-bottom:8px;padding:10px 12px">
        <div>${n.message}</div>
        <div style="font-size:11px;color:var(--muted)">${fmt(n.created_at)}</div></div>`).join('')
    : `<p style="color:var(--muted)">No notifications.</p>`;
  $('#notifModal').classList.add('show');
  await api('/api/notifications/read',{method:'POST'});
  $('#notifDot').style.display='none';
}

// auto-refresh every 30s
setInterval(()=>{ refreshAll(); loadNotifications(); }, 30000);
