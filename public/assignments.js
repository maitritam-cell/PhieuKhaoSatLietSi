const SUPABASE_URL='https://zyvckivbwwlhmpkbonze.supabase.co';
const SUPABASE_KEY='sb_publishable_1ojllrmwxQSMPZWtO6VBqw_5oygalyC';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const APPS_SCRIPT_URL='https://script.google.com/macros/s/AKfycbxDJfEZo5tYBS4emSeQfAL8XbS8OSE4a26P8FEUnVRd9af4LKhFZlhI1a4gyyygcAE/exec';
let me=null, profile=null, profiles=[], territories=[], staffTerritories={}, records=[], allAssignments=[], authLoadToken=0;
const ADMIN_STAFF_FUNCTION='https://zyvckivbwwlhmpkbonze.supabase.co/functions/v1/admin-manage-staff';
const $=id=>document.getElementById(id);
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function msg(text,type=''){const el=$('message');el.textContent=text;el.className='notice'+(type?' '+type:'');el.classList.remove('hidden');}
function clearMsg(){$('message').classList.add('hidden');}
function statusText(s){return ({assigned:'Chưa thực hiện',in_progress:'Đang rà soát',submitted:'Đã gửi kết quả',needs_revision:'Cần bổ sung',completed:'Đã hoàn thành'})[s]||s;}
function pill(s){const cls=s==='completed'?'green':s==='needs_revision'?'red':s==='in_progress'||s==='submitted'?'amber':'';return '<span class="pill '+cls+'">'+esc(statusText(s))+'</span>';}
function showTab(tab){
 if(tab!=='assignments' && (!profile || profile.role!=='admin')){tab='assignments';}
 document.querySelectorAll('[id^="panel-"]').forEach(e=>e.classList.add('hidden'));
 $('panel-'+tab).classList.remove('hidden');
 document.querySelectorAll('.tab').forEach(e=>e.classList.toggle('active',e.dataset.tab===tab));
}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
async function getProfile(user){
 const {data,error}=await sb.from('staff_profiles').select('*').eq('user_id',user.id).maybeSingle();
 if(error)throw error;if(!data)throw new Error('Tài khoản chưa được cấp hồ sơ cán bộ. Liên hệ quản trị viên.');
 if(!data.active)throw new Error('Tài khoản đang bị khóa. Liên hệ quản trị viên.');
 return data;
}
async function authChanged(user){
 const token=++authLoadToken;
 me=user;
 if(!user){profile=null;$('authCard').classList.remove('hidden');$('appArea').classList.add('hidden');return;}
 try{
  profile=await getProfile(user);
  if(token!==authLoadToken)return;
  $('authCard').classList.add('hidden');$('appArea').classList.remove('hidden');
  $('who').textContent=profile.full_name||user.email;
  $('roleLabel').textContent=(profile.role==='admin'?'Quản trị viên':'Cán bộ')+(profile.unit_name?' • '+profile.unit_name:'');
  $('assignTab').classList.toggle('hidden',profile.role!=='admin');$('bulkTab').classList.toggle('hidden',profile.role!=='admin');
  $('staffTab').classList.toggle('hidden',profile.role!=='admin');
  $('tdpTab')?.classList.toggle('hidden',profile.role!=='admin');
  await Promise.all([
    loadAssignments(),
    profile.role==='admin' ? loadStaff().then(async()=>{await loadRecords();await loadBulkOptions();await loadTerritoriesManager();}) : Promise.resolve()
  ]);
 }catch(e){msg(e.message,'error');}
}
$('loginBtn').onclick=async()=>{
 clearMsg();const email=$('email').value.trim(),password=$('password').value;
 if(!email||!password)return msg('Nhập email và mật khẩu.','error');
 $('loginBtn').disabled=true;
 const {data,error}=await sb.auth.signInWithPassword({email,password});
 $('loginBtn').disabled=false;
 if(error)return msg('Đăng nhập thất bại: '+error.message,'error');
 await authChanged(data.user);
};
$('logoutBtn').onclick=async()=>{await sb.auth.signOut();profile=null;me=null;authChanged(null);};
$('refreshBtn').onclick=loadAssignments;
async function loadStaff(){
 const [staffRes,tdpRes,linkRes]=await Promise.all([
  sb.from('staff_profiles').select('*').order('created_at',{ascending:true}),
  sb.from('to_dan_pho').select('id,name').eq('active',true).order('id'),
  sb.from('staff_to_dan_pho').select('staff_id,to_dan_pho_id')
 ]);
 if(staffRes.error)return msg('Không tải được danh sách cán bộ: '+staffRes.error.message,'error');
 if(tdpRes.error)return msg('Không tải được danh sách 31 Tổ dân phố: '+tdpRes.error.message,'error');
 if(linkRes.error)return msg('Không tải được phân công Tổ dân phố: '+linkRes.error.message,'error');

 profiles=staffRes.data||[];
 territories=tdpRes.data||[];
 staffTerritories={};
 (linkRes.data||[]).forEach(x=>{(staffTerritories[x.staff_id]??=[]).push(x.to_dan_pho_id);});

 renderNewStaffTerritories();
 const tdpOptions=(selected=[])=>territories.map(t=>'<option value="'+t.id+'" '+(selected.includes(t.id)?'selected':'')+'>'+esc(t.name)+'</option>').join('');
 const tableBody=profiles.map((p,i)=>{
  const selected=staffTerritories[p.user_id]||[];
  const status=p.active?'Đang hoạt động':'Đã khóa';
  return '<tr>'+
   '<td><input data-profile="'+i+'" data-field="full_name" value="'+esc(p.full_name)+'"></td>'+
   '<td>'+esc(p.email||'')+'</td>'+
   '<td><select multiple size="5" data-profile="'+i+'" data-field="territories" style="min-width:180px">'+tdpOptions(selected)+'</select><div class="muted">Giữ Ctrl để chọn nhiều trên máy tính.</div></td>'+
   '<td><select data-profile="'+i+'" data-field="active"><option value="true" '+(p.active?'selected':'')+'>Đang hoạt động</option><option value="false" '+(!p.active?'selected':'')+'>Đã khóa</option></select></td>'+
   '<td><button class="btn secondary" data-reset-password="'+i+'">Đổi mật khẩu</button></td>'+
   '<td><button class="btn secondary" data-save-profile="'+i+'">Lưu</button></td>'+
  '</tr>';
 }).join('');
 $('staffTableBody').innerHTML=tableBody||'<tr><td colspan="6" class="muted">Chưa có tài khoản cán bộ.</td></tr>';

 document.querySelectorAll('[data-save-profile]').forEach(b=>b.onclick=async()=>{
  const i=Number(b.dataset.saveProfile),p=profiles[i],changes={};
  const nameEl=document.querySelector('[data-profile="'+i+'"][data-field="full_name"]');
  const activeEl=document.querySelector('[data-profile="'+i+'"][data-field="active"]');
  const territoryEl=document.querySelector('[data-profile="'+i+'"][data-field="territories"]');
  const selected=[...territoryEl.selectedOptions].map(o=>Number(o.value));
  if(!selected.length)return msg('Mỗi cán bộ phải được phụ trách ít nhất một Tổ dân phố.','error');
  changes.full_name=(nameEl?.value||'').trim(); changes.active=activeEl?.value==='true';
  if(!changes.full_name)return msg('Họ tên cán bộ không được để trống.','error');
  if(p.user_id===me.id && !changes.active)return msg('Không thể tự khóa tài khoản quản trị đang đăng nhập.','error');
  b.disabled=true;
  const {error:pe}=await sb.from('staff_profiles').update({...changes,updated_at:new Date().toISOString()}).eq('user_id',p.user_id);
  if(pe){b.disabled=false;return msg('Không lưu được cán bộ: '+pe.message,'error');}
  const {error:de}=await sb.from('staff_to_dan_pho').delete().eq('staff_id',p.user_id);
  if(de){b.disabled=false;return msg('Không cập nhật được Tổ dân phố: '+de.message,'error');}
  const {error:ie}=await sb.from('staff_to_dan_pho').insert(selected.map(id=>({staff_id:p.user_id,to_dan_pho_id:id})));
  b.disabled=false;
  if(ie)return msg('Không cập nhật được Tổ dân phố: '+ie.message,'error');
  msg('Đã cập nhật cán bộ và Tổ dân phố phụ trách.','success');
  await loadStaff();
 });

 document.querySelectorAll('[data-reset-password]').forEach(b=>b.onclick=async()=>{
  const i=Number(b.dataset.resetPassword),p=profiles[i];
  const pw=prompt('Nhập mật khẩu mới cho '+(p.full_name||p.email||'cán bộ')+' (ít nhất 8 ký tự):');
  if(pw===null)return;
  if(pw.length<8)return msg('Mật khẩu mới phải có ít nhất 8 ký tự.','error');
  b.disabled=true;
  try{
   const out=await callAdminStaffFunction({mode:'reset_password',user_id:p.user_id,password:pw});
   msg('Đã đổi mật khẩu cho '+esc(out.full_name||p.full_name)+'. Mật khẩu mới cần được cung cấp trực tiếp cho cán bộ.','success');
  }catch(e){msg('Không đổi được mật khẩu: '+e.message,'error');}
  b.disabled=false;
 });

 const assignableStaff=profiles.filter(p=>p.active); const staffOptions=assignableStaff.map(p=>'<option value="'+p.user_id+'">'+esc(p.full_name||p.user_id)+(p.role==='admin'?' — Quản trị viên':'')+(p.unit_name?' — '+esc(p.unit_name):'')+'</option>').join(''); $('staffSelect').innerHTML='<option value="">Chọn người nhận</option>'+staffOptions; $('bulkStaff').innerHTML='<option value="">Chọn người nhận</option>'+staffOptions;
}

function renderNewStaffTerritories(){
 const el=$('newStaffTerritories');
 if(!el)return;
 el.innerHTML=territories.map(t=>'<label style="display:flex;align-items:center;gap:7px;font-weight:600;padding:7px;border:1px solid #e2e8f0;border-radius:8px;background:white"><input type="checkbox" data-new-tdp value="'+t.id+'" style="width:auto">'+esc(t.name)+'</label>').join('');
}

async function callAdminStaffFunction(payload){
 const {data,error}=await sb.auth.getSession();
 if(error||!data.session)throw new Error('Phiên đăng nhập đã hết. Hãy đăng nhập lại.');
 const res=await fetch(ADMIN_STAFF_FUNCTION,{
  method:'POST',
  headers:{'Authorization':'Bearer '+data.session.access_token,'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
  body:JSON.stringify(payload)
 });
 let out={}; try{out=await res.json();}catch(_){}
 if(!res.ok||out.error)throw new Error(out.error||'Không thực hiện được thao tác.');
 return out;
}

function selectedNewTerritories(){
 return [...document.querySelectorAll('[data-new-tdp]:checked')].map(x=>Number(x.value));
}

$('createStaffBtn').onclick=async()=>{
 clearMsg();
 const full_name=$('newStaffName').value.trim(), email=$('newStaffEmail').value.trim(), password=$('newStaffPassword').value;
 const unit_name=$('newStaffUnit').value.trim(), to_dan_pho_ids=selectedNewTerritories();
 if(!full_name||!email||!password)return msg('Nhập họ tên, email và mật khẩu.','error');
 if(password.length<8)return msg('Mật khẩu phải có ít nhất 8 ký tự.','error');
 if(!to_dan_pho_ids.length)return msg('Hãy chọn ít nhất một Tổ dân phố.','error');
 $('createStaffBtn').disabled=true;
 try{
  const out=await callAdminStaffFunction({mode:'create',full_name,email,password,unit_name,to_dan_pho_ids});
  $('newStaffResult').innerHTML='<strong>Đã tạo tài khoản.</strong><br>Email: <code>'+esc(out.email)+'</code><br>Mật khẩu: <code>'+esc(password)+'</code><br>Tổ dân phố: '+esc(to_dan_pho_ids.map(id=>(territories.find(t=>t.id===id)||{}).name||('Tổ dân phố '+id)).join(', '));
  $('newStaffResult').className='notice success';$('newStaffResult').classList.remove('hidden');
  $('newStaffPassword').value='';
  document.querySelectorAll('[data-new-tdp]').forEach(x=>x.checked=false);
  $('newStaffName').value='';$('newStaffEmail').value='';$('newStaffUnit').value='';
  await loadStaff();
 }catch(e){msg('Không tạo được tài khoản: '+e.message,'error');}
 $('createStaffBtn').disabled=false;
};

$('clearStaffFormBtn').onclick=()=>{
 ['newStaffName','newStaffEmail','newStaffPassword','newStaffUnit'].forEach(id=>$(id).value='');
 document.querySelectorAll('[data-new-tdp]').forEach(x=>x.checked=false);
 $('newStaffResult').classList.add('hidden');
 clearMsg();
};

async function loadRecords(){
 $('recordSelect').innerHTML='<option value="">Đang tải danh sách hồ sơ…</option>';
 try{
  const {data:sessionData,error:sessionError}=await sb.auth.getSession();
  if(sessionError||!sessionData.session)throw new Error('Phiên đăng nhập đã hết. Hãy đăng nhập lại.');
  const res=await fetch('/api/admin-records?appsScriptUrl='+encodeURIComponent(APPS_SCRIPT_URL),{
   headers:{'Authorization':'Bearer '+sessionData.session.access_token}
  });
  const data=await res.json();
  if(!res.ok||!Array.isArray(data.records))throw new Error(data.error||'Không đọc được danh sách hồ sơ');
  records=data.records;
  $('recordSelect').innerHTML='<option value="">Chọn phiếu cần giao</option>'+records.map((r,i)=>'<option value="'+i+'">'+esc(r.martyr_name||'Chưa có tên')+' • '+esc(r.file_id||r.record_id||'Chưa có mã')+'</option>').join('');
 }catch(e){$('recordSelect').innerHTML='<option value="">Không tải được danh sách</option>';msg('Không tải được danh sách hồ sơ: '+e.message,'error');}
}
$('createAssignmentBtn').onclick=async()=>{
 clearMsg();const ix=$('recordSelect').value,assigned_to=$('staffSelect').value;
 if(ix===''||!assigned_to)return msg('Chọn phiếu và cán bộ được giao.','error');
 const r=records[Number(ix)],snapshot=r.data&&typeof r.data==='object'?r.data:r;
 const payload={source_record_id:String(r.record_id||r.file_id||('record-'+ix)),martyr_name:r.martyr_name||snapshot.martyr_name||'Chưa có tên',file_id:r.file_id||'',assigned_to,assigned_by:me.id,unit_name:$('assignUnit').value.trim(),task_note:$('taskNote').value.trim(),due_date:$('dueDate').value||null,record_snapshot:snapshot};
 $('createAssignmentBtn').disabled=true;
 const {error}=await sb.from('case_assignments').insert(payload);
 $('createAssignmentBtn').disabled=false;
 if(error)return msg('Giao hồ sơ thất bại: '+error.message,'error');
 msg('Đã giao hồ sơ cho cán bộ.','success');$('taskNote').value='';$('dueDate').value='';await loadAssignments();showTab('assignments');
};

let selectedStaffFilterId = null;

function renderDashboard(data){
 if(profile?.role==='admin'){
  const total=data.length, completed=data.filter(a=>a.status==='completed').length, submitted=data.filter(a=>a.status==='submitted').length, active=data.filter(a=>a.status==='in_progress').length, pending=data.filter(a=>a.status==='assigned').length;
  $('dashboard').innerHTML=[
   ['Tổng hồ sơ đã giao',total],['Đang rà soát',active],['Đã gửi kết quả',submitted],['Đã hoàn thành',completed],['Chưa thực hiện',pending]
  ].map(x=>'<div class="card" style="margin:0;padding:13px;"><div class="muted">'+x[0]+'</div><div style="font-size:25px;font-weight:800;margin-top:4px;">'+x[1]+'</div></div>').join('');
  renderStaffProgress(data);
 } else {
  const myTotal = data.length;
  const myCompleted = data.filter(a => a.status === 'completed').length;
  const myInProg = data.filter(a => a.status === 'in_progress').length;
  const mySubmitted = data.filter(a => a.status === 'submitted').length;
  const myPercent = myTotal > 0 ? Math.round((myCompleted / myTotal) * 100) : 0;
  $('dashboard').innerHTML = `
    <div class="card" style="margin:0;padding:14px;grid-column:span 2;background:#eff6ff;border:1px solid #bfdbfe;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div><strong style="color:#1e40af;font-size:16px;">Tiến độ rà soát cá nhân:</strong> ${myCompleted}/${myTotal} hồ sơ hoàn thành (${myPercent}%)</div>
        <span class="pill ${myPercent === 100 ? 'green' : 'amber'}">${myPercent === 100 ? 'Đã hoàn thành' : 'Đang thực hiện'}</span>
      </div>
      <div style="background:#dbeafe;height:10px;border-radius:5px;overflow:hidden;margin-bottom:8px;">
        <div style="width:${myPercent}%;background:#2563eb;height:100%;transition:width 0.4s;"></div>
      </div>
      <div style="display:flex;gap:12px;font-size:12px;color:#1e40af;">
        <span>Đang rà soát: <strong>${myInProg}</strong></span>
        <span>Đã gửi kết quả: <strong>${mySubmitted}</strong></span>
        <span>Đã hoàn thành: <strong>${myCompleted}</strong></span>
      </div>
    </div>
  `;
  const container = $('staffProgressContainer');
  if(container) container.classList.add('hidden');
 }
}

function renderStaffProgress(assignmentsData){
 const container = $('staffProgressContainer');
 if(!container) return;
 if(profile?.role !== 'admin'){
  container.classList.add('hidden');
  return;
 }
 container.classList.remove('hidden');

 const tbody = $('staffProgressBody');
 if(!tbody) return;

 const cadres = profiles.filter(p => p.active);
 if(!cadres.length){
  tbody.innerHTML = '<tr><td colspan="9" class="muted">Chưa có cán bộ nào trong hệ thống.</td></tr>';
  return;
 }

 tbody.innerHTML = cadres.map(cadre => {
  const cadreAssignments = (assignmentsData || []).filter(a => a.assigned_to === cadre.user_id);
  const total = cadreAssignments.length;
  const pending = cadreAssignments.filter(a => a.status === 'assigned').length;
  const inProgress = cadreAssignments.filter(a => a.status === 'in_progress').length;
  const submitted = cadreAssignments.filter(a => a.status === 'submitted').length;
  const completed = cadreAssignments.filter(a => a.status === 'completed').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const tdpNames = (staffTerritories[cadre.user_id] || []).map(id => {
   const match = territories.find(t => t.id === id);
   return match ? match.name : ('Tổ ' + id);
  }).join(', ') || 'Chưa phân công';

  const isSelected = selectedStaffFilterId === cadre.user_id;

  return '<tr style="' + (isSelected ? 'background:#f0fdf4;' : '') + '">' +
   '<td><strong>' + esc(cadre.full_name || cadre.email) + '</strong>' + (cadre.unit_name ? `<br><small class="muted">${esc(cadre.unit_name)}</small>` : '') + '</td>' +
   '<td><span class="pill" style="font-size:11.5px;max-width:220px;white-space:normal;display:inline-block;">' + esc(tdpNames) + '</span></td>' +
   '<td style="text-align:center;font-weight:700;">' + total + '</td>' +
   '<td style="text-align:center;"><span class="pill" style="font-size:11px;">' + pending + '</span></td>' +
   '<td style="text-align:center;"><span class="pill amber" style="font-size:11px;">' + inProgress + '</span></td>' +
   '<td style="text-align:center;"><span class="pill amber" style="font-size:11px;">' + submitted + '</span></td>' +
   '<td style="text-align:center;"><span class="pill green" style="font-size:11px;">' + completed + '</span></td>' +
   '<td>' +
     '<div style="display:flex;align-items:center;gap:6px;">' +
       '<div style="flex:1;background:#e2e8f0;height:8px;border-radius:4px;overflow:hidden;">' +
         '<div style="width:' + percent + '%;background:' + (percent === 100 ? '#10b981' : percent > 0 ? '#0284c7' : '#94a3b8') + ';height:100%;transition:width 0.3s;"></div>' +
       '</div>' +
       '<strong style="font-size:11px;min-width:32px;">' + percent + '%</strong>' +
     '</div>' +
   '</td>' +
   '<td style="text-align:center;">' +
     (isSelected
       ? '<button type="button" class="btn secondary" style="padding:4px 8px;font-size:11.5px;" onclick="clearStaffFilter()">Đang lọc</button>'
       : '<button type="button" class="btn" style="padding:4px 8px;font-size:11.5px;background:#0284c7;" onclick="filterByStaff(\'' + esc(cadre.user_id) + '\', \'' + esc(cadre.full_name || cadre.email) + '\')">🔍 Xem hồ sơ</button>') +
   '</td>' +
  '</tr>';
 }).join('');
}

window.filterByStaff = function(userId, staffName){
 selectedStaffFilterId = userId;
 const banner = $('activeStaffFilterBanner');
 const nameEl = $('activeStaffFilterName');
 if(banner && nameEl){
  nameEl.textContent = staffName;
  banner.style.display = 'flex';
  banner.classList.remove('hidden');
 }
 renderAssignmentsList(allAssignments);
 renderStaffProgress(allAssignments);
};

window.clearStaffFilter = function(){
 selectedStaffFilterId = null;
 const banner = $('activeStaffFilterBanner');
 if(banner){
  banner.style.display = 'none';
  banner.classList.add('hidden');
 }
 renderAssignmentsList(allAssignments);
 renderStaffProgress(allAssignments);
};

function addressOf(r){
 const d=r.data&&typeof r.data==='object'?r.data:r;
 return String(r.rep_address||r.address||d.rep_address||d.address||d['Nơi thường trú NĐD']||'Chưa xác định').trim()||'Chưa xác định';
}
async function loadBulkOptions(){
 if(profile.role!=='admin')return;
 const map={}; records.forEach((r,i)=>{const a=addressOf(r);if(!map[a])map[a]=[];map[a].push(i);});
 const opts=Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0],'vi')).map(([a,ix])=>'<option value="'+esc(a)+'">'+esc(a)+' ('+ix.length+' hồ sơ)</option>').join('');
 $('bulkAddress').innerHTML='<option value="">Chọn nơi thường trú</option>'+opts;
 const assignableStaff=profiles.filter(p=>p.active);
 const bulkStaffOptions=assignableStaff.map(p=>'<option value="'+p.user_id+'">'+esc(p.full_name||p.user_id)+(p.role==='admin'?' — Quản trị viên':'')+(p.unit_name?' — '+esc(p.unit_name):'')+'</option>').join('');
 $('bulkStaff').innerHTML='<option value="">Chọn người nhận</option>'+bulkStaffOptions;
 updateBulkCount();
}
function updateBulkCount(){
 const address=$('bulkAddress').value;
 if(!address){$('bulkCount').textContent='Chọn một nơi thường trú để xem số hồ sơ.';return;}
 const ids=records.map((r,i)=>addressOf(r)===address?i:-1).filter(i=>i>=0);
 const existing=new Set(allAssignments.map(a=>String(a.source_record_id)));
 const newCount=ids.filter(i=>!existing.has(String(records[i].record_id||records[i].file_id||('record-'+i)))).length;
 $('bulkCount').textContent='Nhóm này có '+ids.length+' hồ sơ; dự kiến giao mới '+newCount+' hồ sơ (hồ sơ đã giao sẽ được bỏ qua).';
}
$('bulkAddress')?.addEventListener('change',updateBulkCount);
$('bulkAssignBtn')?.addEventListener('click',async()=>{
 clearMsg();const address=$('bulkAddress').value,assigned_to=$('bulkStaff').value;
 if(!address||!assigned_to)return msg('Chọn nơi thường trú và cán bộ phụ trách.','error');
 const existing=new Set(allAssignments.map(a=>String(a.source_record_id)));
 const selected=records.filter(r=>addressOf(r)===address).filter((r,i)=>!existing.has(String(r.record_id||r.file_id||('record-'+i))));
 if(!selected.length)return msg('Nhóm này không còn hồ sơ chưa được giao.','error');
 const rows=selected.map((r,i)=>{const d=r.data&&typeof r.data==='object'?r.data:r;return {source_record_id:String(r.record_id||r.file_id||('record-'+i)),martyr_name:r.martyr_name||d.martyr_name||d['Họ tên liệt sĩ']||'Chưa có tên',file_id:r.file_id||d.file_id||'',assigned_to,assigned_by:me.id,unit_name:$('bulkUnit').value.trim()||address,task_note:$('bulkNote').value.trim()||'Rà soát và bổ sung đầy đủ thông tin hồ sơ.',due_date:$('bulkDueDate').value||null,record_snapshot:d};});
 $('bulkAssignBtn').disabled=true;
 const {error}=await sb.from('case_assignments').insert(rows);
 $('bulkAssignBtn').disabled=false;
 if(error)return msg('Giao nhóm hồ sơ thất bại: '+error.message,'error');
 msg('Đã giao '+rows.length+' hồ sơ thuộc địa bàn "'+address+'" cho cán bộ.','success');await loadAssignments();updateBulkCount();
});

function renderAssignmentsList(data){
 const el = $('assignmentsList');
 if(!el) return;

 const displayData = selectedStaffFilterId
   ? (data || []).filter(a => a.assigned_to === selectedStaffFilterId)
   : (data || []);

 if(!displayData.length){
  const emptyMsg = selectedStaffFilterId
    ? 'Cán bộ này chưa có hồ sơ nào được giao.'
    : 'Chưa có hồ sơ được giao.';
  el.innerHTML = '<p class="muted">' + emptyMsg + '</p>';
  return;
 }

 el.innerHTML = displayData.map(a => {
  const updates = Array.isArray(a._updates) ? a._updates : [];
  const latest = updates[0] || null;
  const latestHtml = latest
    ? '<div class="notice success" style="margin:10px 0;border:1px solid #a7f3d0;"><strong>✅ Kết quả rà soát mới nhất</strong><div class="muted" style="margin-top:4px;">' +
      esc(new Date(latest.created_at).toLocaleString('vi-VN')) +
      '</div><div style="margin-top:6px;">' + esc(latest.note || 'Đã cập nhật trạng thái hồ sơ.') + '</div>' +
      (Object.keys(latest.added_data || {}).length
        ? '<details style="margin-top:6px;"><summary>Thông tin bổ sung</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;background:#f8fafc;padding:10px;border-radius:8px;">' +
          esc(JSON.stringify(latest.added_data, null, 2)) + '</pre></details>'
        : '') +
      '</div>'
    : '<div class="notice" style="margin:10px 0;">Chưa có kết quả rà soát được lưu.</div>';

  const historyHtml = updates.length
    ? '<div style="margin-top:10px;"><strong>Lịch sử cập nhật (' + updates.length + ')</strong>' +
      updates.map(u => '<div class="item" style="margin:8px 0;padding:10px;"><div class="muted">' +
        esc(new Date(u.created_at).toLocaleString('vi-VN')) +
        ' • ' + esc((profiles.find(p => p.user_id === u.author_id) || {}).full_name || 'Cán bộ') +
        '</div><div style="margin-top:4px;">' + esc(u.note || 'Không có ghi chú') + '</div>' +
        (Object.keys(u.added_data || {}).length
          ? '<pre style="white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0 0;background:#f8fafc;padding:8px;border-radius:6px;">' +
            esc(JSON.stringify(u.added_data, null, 2)) + '</pre>'
          : '') +
        '</div>').join('') + '</div>'
    : '';

  return '<article class="item"><div class="topline"><h3>' + esc(a.martyr_name) + '</h3>' + pill(a.status) + '</div>' +
   '<p class="muted">Mã hồ sơ: ' + esc(a.file_id || a.source_record_id) + ' • Địa bàn: ' + esc(a.unit_name || 'Chưa ghi') + '</p>' +
   '<p><strong>Nội dung giao:</strong> ' + esc(a.task_note || 'Rà soát, bổ sung thông tin hồ sơ') + '</p>' +
   '<p class="muted">Hạn hoàn thành: ' + esc(a.due_date || 'Chưa đặt') + ' • Giao ngày: ' + new Date(a.created_at).toLocaleDateString('vi-VN') + '</p>' +
   '<details><summary>Xem thông tin đã có</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;background:#f8fafc;padding:10px;border-radius:8px">' + esc(JSON.stringify(a.record_snapshot, null, 2)) + '</pre></details>' +
   latestHtml +
   '<div class="grid" style="margin-top:10px"><div><label>Ghi nhận kết quả rà soát</label><textarea id="note-' + a.id + '" placeholder="Ghi nguồn xác minh, thông tin đã tìm được, nội dung còn thiếu…"></textarea></div>' +
   '<div><label>Thông tin bổ sung (JSON tùy chọn)</label><textarea id="data-' + a.id + '" placeholder="Có thể để trống; nhập dữ liệu dạng JSON nếu cần"></textarea></div></div>' +
   '<div class="row" style="margin-top:8px"><select id="status-' + a.id + '" style="max-width:220px">' +
   '<option value="assigned" ' + (a.status === 'assigned' ? 'selected' : '') + '>Chưa thực hiện</option>' +
   '<option value="in_progress" ' + (a.status === 'in_progress' ? 'selected' : '') + '>Đang rà soát</option>' +
   '<option value="submitted" ' + (a.status === 'submitted' ? 'selected' : '') + '>Đã gửi kết quả</option>' +
   '<option value="needs_revision" ' + (a.status === 'needs_revision' ? 'selected' : '') + '>Cần bổ sung</option>' +
   '<option value="completed" ' + (a.status === 'completed' ? 'selected' : '') + '>Đã hoàn thành</option></select>' +
   '<button class="btn" data-submit="' + a.id + '">Lưu cập nhật</button></div>' +
   '<div class="muted" style="margin-top:10px;">' + (historyHtml || 'Chưa có lịch sử cập nhật.') + '</div></article>';
 }).join('');

 for(const a of displayData){
  const b = document.querySelector('[data-submit="' + a.id + '"]');
  if(!b) continue;

  b.onclick = async () => {
   clearMsg();
   const sessionRes = await sb.auth.getSession();
   const session = sessionRes?.data?.session;
   if(sessionRes?.error || !session) return msg('Thiếu phiên đăng nhập. Hãy đăng nhập lại rồi lưu lại.','error');

   const note = $('note-' + a.id).value.trim();
   const raw = $('data-' + a.id).value.trim();
   const newStatus = $('status-' + a.id).value;
   let added_data = {};

   if(raw){
    try{
     added_data = JSON.parse(raw);
    }catch(e){
     return msg('Thông tin bổ sung phải là JSON hợp lệ hoặc để trống.','error');
    }
   }

   b.disabled = true;
   b.textContent = 'Đang lưu…';

   try{
    if(note || raw){
     const {error: upErr} = await sb.from('assignment_updates')
       .insert({assignment_id:a.id, author_id:session.user.id, note, added_data})
       .select('id,created_at')
       .single();
     if(upErr) throw new Error('Không lưu được kết quả rà soát: ' + upErr.message);
    }

    const {error: stErr} = await sb.rpc('update_assignment_status', {
      p_assignment_id:a.id,
      p_status:newStatus
    });
    if(stErr) throw new Error('Đã ghi kết quả nhưng không cập nhật được trạng thái: ' + stErr.message);

    $('note-' + a.id).value = '';
    $('data-' + a.id).value = '';
    msg('Đã lưu cập nhật hồ sơ và tải lại kết quả mới nhất.','success');
    await loadAssignments();
   }catch(err){
    msg(err.message || 'Không lưu được cập nhật.','error');
   }finally{
    b.disabled = false;
    b.textContent = 'Lưu cập nhật';
   }
  };
 }
}

async function loadAssignments(){
 if(!me||!profile)return;
 const sessionRes = await sb.auth.getSession();
 const session = sessionRes?.data?.session;
 if(sessionRes?.error || !session){
  $('assignmentsList').textContent='Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.';
  return;
 }
 me = session.user;

 $('assignmentsList').textContent='Đang tải hồ sơ…';
 let q=sb.from('case_assignments').select('*').order('created_at',{ascending:false});
 if(profile.role!=='admin')q=q.eq('assigned_to',session.user.id);
 const {data,error}=await q;
 if(error){$('assignmentsList').textContent='Không tải được danh sách: '+error.message;return;}

 const assignments=data||[];
 allAssignments=assignments;

 // Nạp lịch sử cập nhật trước khi render để kết quả vừa lưu luôn hiển thị.
 const ids=assignments.map(a=>a.id).filter(Boolean);
 let updateMap={};
 if(ids.length){
  const {data:updates,error:updateError}=await sb.from('assignment_updates')
    .select('id,assignment_id,note,added_data,created_at,author_id')
    .in('assignment_id',ids)
    .order('created_at',{ascending:false});
  if(!updateError){
   for(const u of (updates||[])) (updateMap[u.assignment_id]??=[]).push(u);
  }else{
   console.warn('Không tải được lịch sử cập nhật:', updateError.message);
  }
 }
 for(const a of assignments) a._updates=updateMap[a.id]||[];

 renderDashboard(allAssignments);
 renderAssignmentsList(allAssignments);
}

async function loadUpdates(id){
 const {data,error}=await sb.from('assignment_updates')
  .select('id,note,added_data,created_at,author_id')
  .eq('assignment_id',id)
  .order('created_at',{ascending:false});
 const el=$('updates-'+id);if(!el)return;
 if(error){el.textContent='Không tải được lịch sử.';return;}
 if(!data.length){el.textContent='Chưa có cập nhật.';return;}
 const names={};profiles.forEach(p=>names[p.user_id]=p.full_name);
 el.innerHTML='<strong>Lịch sử cập nhật</strong>'+data.map(u=>'<div class="item"><div class="muted">'+esc(names[u.author_id]||'Cán bộ')+' • '+new Date(u.created_at).toLocaleString('vi-VN')+'</div><div>'+esc(u.note||'Không có ghi chú')+'</div>'+(Object.keys(u.added_data||{}).length?'<pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(JSON.stringify(u.added_data,null,2))+'</pre>':'')+'</div>').join('');
}
async function loadTerritoriesManager(){
 const tbody=$('tdpTableBody');
 if(!tbody)return;
 tbody.innerHTML='<tr><td colspan="4" class="muted">Đang tải danh sách tổ dân phố…</td></tr>';

 let list=[];
 const session=(await sb.auth.getSession())?.data?.session;
 const token=session?.access_token||'';
 try{
  const res=await fetch('/api/admin/to-dan-pho',{headers:{'Authorization':'Bearer '+token}});
  if(res.ok){
   const d=await res.json();
   if(Array.isArray(d.data))list=d.data;
  }
 }catch(_){}

 if(!list.length){
  const {data,error}=await sb.from('to_dan_pho').select('*').order('id');
  if(!error&&Array.isArray(data))list=data;
 }

 territories=list;
 if(!list.length){
  tbody.innerHTML='<tr><td colspan="4" class="muted">Chưa có danh mục Tổ dân phố.</td></tr>';
  return;
 }

 tbody.innerHTML=list.map(t=>'<tr>'+
  '<td><strong>'+esc(t.id)+'</strong></td>'+
  '<td><input id="tdp-name-'+t.id+'" value="'+esc(t.name)+'" style="font-weight:600;max-width:320px;" placeholder="Tên tổ dân phố"></td>'+
  '<td><span class="pill '+(t.active!==false?'green':'')+'">'+(t.active!==false?'Hoạt động':'Tạm ngưng')+'</span></td>'+
  '<td style="text-align:center;"><button type="button" class="btn" style="padding:6px 12px;font-size:12.5px;" onclick="saveTerritoryName('+t.id+')">💾 Lưu</button></td>'+
 '</tr>').join('');
}

window.saveTerritoryName=async function(id){
 const input=$('tdp-name-'+id);
 if(!input)return;
 const newName=input.value.trim();
 if(!newName){alert('Tên tổ dân phố không được để trống.');return;}
 input.disabled=true;
 const notice=$('tdpNotice');
 if(notice)notice.classList.add('hidden');

 const token=(await sb.auth.getSession())?.data?.session?.access_token||'';
 try{
  const res=await fetch('/api/admin/to-dan-pho/update',{
   method:'POST',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
   body:JSON.stringify({id,name:newName})
  });
  const d=await res.json().catch(()=>({}));
  if(res.ok&&d.ok){
   msg('Đã cập nhật thành công: '+newName,'success');
   await loadStaff();
   await loadTerritoriesManager();
  }else{
   const {error}=await sb.from('to_dan_pho').update({name:newName}).eq('id',id);
   if(error){
    msg('Lỗi cập nhật: '+(d.error||error.message),'error');
   }else{
    msg('Đã cập nhật thành công: '+newName,'success');
    await loadStaff();
    await loadTerritoriesManager();
   }
  }
 }catch(err){
  msg('Lỗi kết nối: '+err.message,'error');
 }finally{
  if(input)input.disabled=false;
 }
};

$('refreshTdpBtn')?.addEventListener('click',loadTerritoriesManager);
$('formatTwoDigitsBtn')?.addEventListener('click',async()=>{
 if(!confirm('Bạn có chắc muốn tự động chuẩn hóa các Tổ dân phố 1-9 thành định dạng 2 chữ số (Tổ dân phố 01, 02... 09)?'))return;
 const btn=$('formatTwoDigitsBtn');
 btn.disabled=true;
 btn.textContent='Đang chuẩn hóa…';
 const token=(await sb.auth.getSession())?.data?.session?.access_token||'';
 try{
  const res=await fetch('/api/admin/to-dan-pho/format-two-digits',{
   method:'POST',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}
  });
  const d=await res.json().catch(()=>({}));
  if(res.ok&&d.ok){
   msg(d.message||'Đã chuẩn hóa 2 chữ số thành công!','success');
  }else{
   const {data:list}=await sb.from('to_dan_pho').select('id,name');
   let count=0;
   if(Array.isArray(list)){
    for(const item of list){
     const numMatch=String(item.name||'').match(/\d+/);
     if(numMatch&&numMatch[0].length===1){
      const newNum='0'+numMatch[0];
      const newName=item.name.replace(numMatch[0],newNum);
      await sb.from('to_dan_pho').update({name:newName}).eq('id',item.id);
      count++;
     }
    }
   }
   msg(`Đã chuẩn hóa ${count} tổ dân phố sang dạng 2 chữ số (01-09).`,'success');
  }
  await loadStaff();
  await loadTerritoriesManager();
 }catch(e){
  msg('Lỗi: '+e.message,'error');
 }finally{
  btn.disabled=false;
  btn.textContent='⚡ Chuẩn hóa 2 chữ số (01, 02, 03... 09)';
 }
});

sb.auth.onAuthStateChange((_event,session)=>{queueMicrotask(()=>{if(session?.user)authChanged(session.user);else authChanged(null);});});
(async()=>{const {data}=await sb.auth.getSession();if(data.session)await authChanged(data.session.user);})();
