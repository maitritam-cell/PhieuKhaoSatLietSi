const SUPABASE_URL='https://zyvckivbwwlhmpkbonze.supabase.co';
const SUPABASE_KEY='sb_publishable_1ojllrmwxQSMPZWtO6VBqw_5oygalyC';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const APPS_SCRIPT_URL='https://script.google.com/macros/s/AKfycbwXHveyxf6Z1Hi-P-Ex9RtELyGszNRGhHsGMv6vVEsb43HcFyg3sbTa2XKvtJfkiT0orw/exec';
let me=null, profile=null, profiles=[], records=[];
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
 me=user;
 if(!user){$('authCard').classList.remove('hidden');$('appArea').classList.add('hidden');return;}
 try{
  profile=await getProfile(user);
  $('authCard').classList.add('hidden');$('appArea').classList.remove('hidden');
  $('who').textContent=profile.full_name||user.email;
  $('roleLabel').textContent=(profile.role==='admin'?'Quản trị viên':'Cán bộ')+(profile.unit_name?' • '+profile.unit_name:'');
  $('assignTab').classList.toggle('hidden',profile.role!=='admin');
  $('staffTab').classList.toggle('hidden',profile.role!=='admin');
  await loadAssignments();
  if(profile.role==='admin'){await loadStaff();await loadRecords();}
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
$('signupBtn').onclick=async()=>{
 clearMsg();const email=$('email').value.trim(),password=$('password').value,full_name=$('fullName').value.trim(),unit_name=$('unitName').value.trim();
 if(!email||!password||!full_name)return msg('Nhập email, mật khẩu và họ tên để tạo tài khoản.','error');
 if(password.length<8)return msg('Mật khẩu cần ít nhất 8 ký tự.','error');
 $('signupBtn').disabled=true;
 const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name,unit_name}}});
 $('signupBtn').disabled=false;
 if(error)return msg('Không tạo được tài khoản: '+error.message,'error');
 if(data.session) await authChanged(data.user);
 else msg('Đã gửi yêu cầu tạo tài khoản. Nếu hệ thống yêu cầu xác nhận email, hãy xác nhận email rồi đăng nhập. Tài khoản đầu tiên sẽ là quản trị viên.','success');
};
$('logoutBtn').onclick=async()=>{await sb.auth.signOut();profile=null;me=null;authChanged(null);};
$('refreshBtn').onclick=loadAssignments;
async function loadStaff(){
 const {data,error}=await sb.from('staff_profiles').select('*').order('created_at',{ascending:true});
 if(error)return msg('Không tải được danh sách cán bộ: '+error.message,'error');
 profiles=data||[];
 $('staffList').innerHTML='<div class="tablewrap"><table><thead><tr><th>Họ tên</th><th>Đơn vị</th><th>Vai trò</th><th>Hoạt động</th><th>Lưu</th></tr></thead><tbody>'+profiles.map((p,i)=>'<tr><td><input data-profile="'+i+'" data-field="full_name" value="'+esc(p.full_name)+'"></td><td><input data-profile="'+i+'" data-field="unit_name" value="'+esc(p.unit_name)+'"></td><td><select data-profile="'+i+'" data-field="role"><option value="cadre" '+(p.role==='cadre'?'selected':'')+'>Cán bộ</option><option value="admin" '+(p.role==='admin'?'selected':'')+'>Quản trị viên</option></select></td><td><select data-profile="'+i+'" data-field="active"><option value="true" '+(p.active?'selected':'')+'>Đang hoạt động</option><option value="false" '+(!p.active?'selected':'')+'>Đã khóa</option></select></td><td><button class="btn secondary" data-save-profile="'+i+'">Lưu</button></td></tr>').join('')+'</tbody></table></div>';
 document.querySelectorAll('[data-save-profile]').forEach(b=>b.onclick=async()=>{
  const i=Number(b.dataset.saveProfile),p=profiles[i],changes={};
  document.querySelectorAll('[data-profile="'+i+'"]').forEach(el=>changes[el.dataset.field]=el.dataset.field==='active'?el.value==='true':el.value);
  if(p.user_id===me.id && changes.role!=='admin')return msg('Không thể tự hạ quyền quản trị viên đang đăng nhập.','error');
  const {error}=await sb.from('staff_profiles').update({...changes,updated_at:new Date().toISOString()}).eq('user_id',p.user_id);
  if(error)return msg('Không lưu được cán bộ: '+error.message,'error');
  msg('Đã cập nhật quyền và thông tin cán bộ.','success');await loadStaff();await loadRecords();
 });
 $('staffSelect').innerHTML='<option value="">Chọn cán bộ</option>'+profiles.filter(p=>p.active&&p.role==='cadre').map(p=>'<option value="'+p.user_id+'">'+esc(p.full_name||p.user_id)+(p.unit_name?' — '+esc(p.unit_name):'')+'</option>').join('');
}
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
async function loadAssignments(){
 if(!me||!profile)return;
 $('assignmentsList').textContent='Đang tải hồ sơ…';
 let q=sb.from('case_assignments').select('*').order('created_at',{ascending:false});
 if(profile.role!=='admin')q=q.eq('assigned_to',me.id);
 const {data,error}=await q;
 if(error){$('assignmentsList').textContent='Không tải được danh sách: '+error.message;return;}
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
