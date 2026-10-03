const SUPABASE_URL='https://zyvckivbwwlhmpkbonze.supabase.co';
const SUPABASE_KEY='sb_publishable_1ojllrmwxQSMPZWtO6VBqw_5oygalyC';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const APPS_SCRIPT_URL='https://script.google.com/macros/s/AKfycbwXHveyxf6Z1Hi-P-Ex9RtELyGszNRGhHsGMv6vVEsb43HcFyg3sbTa2XKvtJfkiT0orw/exec';
let me=null, profile=null, profiles=[], territories=[], staffTerritories={}, records=[], allAssignments=[], authLoadToken=0;
const ADMIN_STAFF_FUNCTION='https://zyvckivbwwlhmpkbonze.supabase.co/functions/v1/admin-manage-staff';
const $=id=>document.getElementById(id);
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function msg(text,type=''){const el=$('message');el.textContent=text;el.className='notice'+(type?' '+type:'');el.classList.remove('hidden');}
function clearMsg(){$('message').classList.add('hidden');}
function statusText(s){return ({assigned:'Chưa thực hiện',in_progress:'Đang rà soát',submitted:'Đã gửi kết quả',needs_revision:'Cần bổ sung',completed:'Đã hoàn thành'})[s]||s;}
function pill(s){const cls=s==='completed'?'green':s==='needs_revision'?'red':s==='in_progress'||s==='submitted'?'amber':'';return '<span class="pill '+cls+'">'+esc(statusText(s))+'</span>';}
function showTab(tab){document.querySelectorAll('[id^="panel-"]').forEach(e=>e.classList.add('hidden'));$('panel-'+tab).classList.remove('hidden');document.querySelectorAll('.tab').forEach(e=>e.classList.toggle('active',e.dataset.tab===tab));}
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
  await Promise.all([loadAssignments(), profile.role==='admin' ? loadStaff().then(async()=>{await loadRecords();await loadBulkOptions();}) : Promise.resolve()]);
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

 $('staffSelect').innerHTML='<option value="">Chọn cán bộ</option>'+profiles.filter(p=>p.active&&p.role==='cadre').map(p=>'<option value="'+p.user_id+'">'+esc(p.full_name||p.user_id)+(p.unit_name?' — '+esc(p.unit_name):'')+'</option>').join('');
 $('bulkStaff').innerHTML='<option value="">Chọn cán bộ</option>'+profiles.filter(p=>p.active&&p.role==='cadre').map(p=>'<option value="'+p.user_id+'">'+esc(p.full_name||p.user_id)+(p.unit_name?' — '+esc(p.unit_name):'')+'</option>').join('');
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
 $('recordSelect').innerHTML='<option value="">Đang tải phiếu từ Google Sheets…</option>';
 try{
  const res=await fetch('/api/records?appsScriptUrl='+encodeURIComponent(APPS_SCRIPT_URL));
  const data=await res.json();
  if(!res.ok||!Array.isArray(data.records))throw new Error(data.error||'Không đọc được danh sách phiếu');
  records=data.records;
  $('recordSelect').innerHTML='<option value="">Chọn phiếu cần giao</option>'+records.map((r,i)=>'<option value="'+i+'">'+esc(r.martyr_name||'Chưa có tên')+' • '+esc(r.file_id||r.record_id||'Chưa có mã')+'</option>').join('');
 }catch(e){$('recordSelect').innerHTML='<option value="">Không tải được danh sách</option>';msg('Không tải được phiếu từ Google Sheets: '+e.message,'error');}
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

function renderDashboard(data){
 const total=data.length, completed=data.filter(a=>a.status==='completed').length, submitted=data.filter(a=>a.status==='submitted').length, active=data.filter(a=>a.status==='in_progress').length, pending=data.filter(a=>a.status==='assigned').length;
 $('dashboard').innerHTML=[
  ['Tổng hồ sơ đã giao',total],['Đang rà soát',active],['Đã gửi kết quả',submitted],['Đã bổ sung đầy đủ',completed],['Chưa thực hiện',pending]
 ].map(x=>'<div class="card" style="margin:0;padding:13px;"><div class="muted">'+x[0]+'</div><div style="font-size:25px;font-weight:800;margin-top:4px;">'+x[1]+'</div></div>').join('');
}
function addressOf(r){
 const d=r.data&&typeof r.data==='object'?r.data:r;
 return String(r.rep_address||r.address||d.rep_address||d.address||d['Nơi thường trú NĐD']||'Chưa xác định').trim()||'Chưa xác định';
}
async function loadBulkOptions(){
 if(profile.role!=='admin')return;
 const map={}; records.forEach((r,i)=>{const a=addressOf(r);if(!map[a])map[a]=[];map[a].push(i);});
 const opts=Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0],'vi')).map(([a,ix])=>'<option value="'+esc(a)+'">'+esc(a)+' ('+ix.length+' hồ sơ)</option>').join('');
 $('bulkAddress').innerHTML='<option value="">Chọn nơi thường trú</option>'+opts;
 $('bulkStaff').innerHTML='<option value="">Chọn cán bộ</option>'+profiles.filter(p=>p.active&&p.role==='cadre').map(p=>'<option value="'+p.user_id+'">'+esc(p.full_name||p.user_id)+(p.unit_name?' — '+esc(p.unit_name):'')+'</option>').join('');
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

async function loadAssignments(){
 if(!me||!profile)return;
 $('assignmentsList').textContent='Đang tải hồ sơ…';
 let q=sb.from('case_assignments').select('*').order('created_at',{ascending:false});
 if(profile.role!=='admin')q=q.eq('assigned_to',me.id);
 const {data,error}=await q;
 if(error){$('assignmentsList').textContent='Không tải được danh sách: '+error.message;return;}
 allAssignments=data||[]; if(profile.role==='admin') renderDashboard(data);
 if(!data||!data.length){$('assignmentsList').innerHTML='<p class="muted">Chưa có hồ sơ được giao.</p>';return;}
 $('assignmentsList').innerHTML=data.map(a=>'<article class="item"><div class="topline"><h3>'+esc(a.martyr_name)+'</h3>'+pill(a.status)+'</div><p class="muted">Mã hồ sơ: '+esc(a.file_id||a.source_record_id)+' • Địa bàn: '+esc(a.unit_name||'Chưa ghi')+'</p><p><strong>Nội dung giao:</strong> '+esc(a.task_note||'Rà soát, bổ sung thông tin hồ sơ')+'</p><p class="muted">Hạn hoàn thành: '+esc(a.due_date||'Chưa đặt')+' • Giao ngày: '+new Date(a.created_at).toLocaleDateString('vi-VN')+'</p><details><summary>Xem thông tin đã có</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;background:#f8fafc;padding:10px;border-radius:8px">'+esc(JSON.stringify(a.record_snapshot,null,2))+'</pre></details><div class="grid" style="margin-top:10px"><div><label>Ghi nhận kết quả rà soát</label><textarea id="note-'+a.id+'" placeholder="Ghi nguồn xác minh, thông tin đã tìm được, nội dung còn thiếu…"></textarea></div><div><label>Thông tin bổ sung (JSON tùy chọn)</label><textarea id="data-'+a.id+'" placeholder="Có thể để trống; nhập dữ liệu dạng JSON nếu cần"></textarea></div></div><div class="row" style="margin-top:8px"><select id="status-'+a.id+'" style="max-width:220px"><option value="in_progress" '+(a.status==='in_progress'?'selected':'')+'>Đang rà soát</option><option value="submitted" '+(a.status==='submitted'?'selected':'')+'>Đã gửi kết quả</option><option value="needs_revision" '+(a.status==='needs_revision'?'selected':'')+'>Cần bổ sung</option><option value="completed" '+(a.status==='completed'?'selected':'')+'>Đã hoàn thành</option></select><button class="btn" data-submit="'+a.id+'">Lưu cập nhật</button></div><div id="updates-'+a.id+'" class="muted" style="margin-top:10px">Đang tải lịch sử…</div></article>').join('');
 for(const a of data){
  loadUpdates(a.id);
  const b=document.querySelector('[data-submit="'+a.id+'"]');
  b.onclick=async()=>{
   clearMsg();const note=$('note-'+a.id).value.trim(),raw=$('data-'+a.id).value.trim(),newStatus=$('status-'+a.id).value;
   let added_data={};
   if(raw){try{added_data=JSON.parse(raw);}catch(e){return msg('Thông tin bổ sung phải là JSON hợp lệ hoặc để trống.','error');}}
   if(!note&&!raw)return msg('Nhập ghi nhận kết quả hoặc thông tin bổ sung trước khi lưu.','error');
   const {error:upErr}=await sb.from('assignment_updates').insert({assignment_id:a.id,author_id:me.id,note,added_data});
   if(upErr)return msg('Không lưu được cập nhật: '+upErr.message,'error');
   const {error:stErr}=await sb.rpc('update_assignment_status',{p_assignment_id:a.id,p_status:newStatus});
   if(stErr)return msg('Đã lưu ghi nhận nhưng không cập nhật được trạng thái: '+stErr.message,'error');
   msg('Đã lưu cập nhật hồ sơ.','success');await loadAssignments();
  };
 }
}
async function loadUpdates(id){
 const {data,error}=await sb.from('assignment_updates').select('id,note,added_data,created_at,author_id').eq('assignment_id',id).order('created_at',{ascending:false});
 const el=$('updates-'+id);if(!el)return;
 if(error){el.textContent='Không tải được lịch sử.';return;}
 if(!data.length){el.textContent='Chưa có cập nhật.';return;}
 const names={};profiles.forEach(p=>names[p.user_id]=p.full_name);
 el.innerHTML='<strong>Lịch sử cập nhật</strong>'+data.map(u=>'<div class="item"><div class="muted">'+esc(names[u.author_id]||'Cán bộ')+' • '+new Date(u.created_at).toLocaleString('vi-VN')+'</div><div>'+esc(u.note||'Không có ghi chú')+'</div>'+(Object.keys(u.added_data||{}).length?'<pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(JSON.stringify(u.added_data,null,2))+'</pre>':'')+'</div>').join('');
}
sb.auth.onAuthStateChange((_event,session)=>{queueMicrotask(()=>{if(session?.user)authChanged(session.user);else authChanged(null);});});
(async()=>{const {data}=await sb.auth.getSession();if(data.session)await authChanged(data.session.user);})();
