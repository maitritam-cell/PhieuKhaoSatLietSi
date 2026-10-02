const SPREADSHEET_ID='1avKXAzFRxGfXHnx9FHt8jM6_CsFDRqrbEsuezN3Azug';
const MAIN_SHEET='PHIEU_KHAO_SAT';
const REL_SHEET='PHU_LUC_1';

const MAIN_HEADERS=[
  'ma_phieu','ngay_luu','ho_ten_nguoi_dai_dien','ngay_sinh_nguoi_dai_dien','gioi_tinh_nguoi_dai_dien',
  'so_ddcn_nguoi_dai_dien','ngay_cap','noi_cap','que_quan_nguoi_dai_dien','noi_thuong_tru','so_dien_thoai',
  'ma_so_ho_so_liet_si','ma_ho_so_bo_quan_ly','ma_ho_so_tinh_quan_ly','ho_ten_liet_si','bi_danh',
  'ngay_sinh_liet_si','gioi_tinh_liet_si','que_quan_liet_si','cap_bac_chuc_vu','co_quan_don_vi',
  'ngay_hy_sinh','noi_hy_sinh','noi_an_tang_ban_dau','bang_to_quoc_ghi_cong_so','quyet_dinh_so','ngay_quyet_dinh',
  'con_ong','con_ba','vo','ubnd_date','ubnd_title','ubnd_name','police_date','police_title','police_name',
  'donvi_date','donvi_title','donvi_name','trang_thai','du_lieu_day_du'
];
const REL_HEADERS=['ma_phieu','stt','doi_tuong_uu_tien','so_ddcn_cccd_cmnd','ho_va_ten','ngay_sinh','gioi_tinh','ho_ten_bo','ho_ten_me','noi_thuong_tru','trang_thai','chu_ky'];

function sheet_(name){
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh=ss.getSheetByName(name);
  if(!sh)sh=ss.insertSheet(name);
  return sh;
}
function setup(){
  const main=sheet_(MAIN_SHEET);
  if(main.getLastRow()===0)main.getRange(1,1,1,MAIN_HEADERS.length).setValues([MAIN_HEADERS]);
  else main.getRange(1,1,1,MAIN_HEADERS.length).setValues([MAIN_HEADERS]);
  const rel=sheet_(REL_SHEET);
  if(rel.getLastRow()===0)rel.getRange(1,1,1,REL_HEADERS.length).setValues([REL_HEADERS]);
  else rel.getRange(1,1,1,REL_HEADERS.length).setValues([REL_HEADERS]);
  main.setFrozenRows(1);rel.setFrozenRows(1);
  main.autoResizeColumns(1,MAIN_HEADERS.length);rel.autoResizeColumns(1,REL_HEADERS.length);
}

function json_(obj,callback){
  const s=JSON.stringify(obj);
  if(callback){
    return ContentService.createTextOutput(callback+'('+s.replace(/<\\/script/gi,'<\\\\/script>')+');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e){
  setup();
  try{
    const data=JSON.parse(e?.postData?.contents||'{}');
    const full=JSON.parse(data.duLieuDayDu||'{}');
    const ma=String(data.maPhieu||full.record_id||('LS02-'+Date.now()));

    const main=sheet_(MAIN_SHEET);
    const row=[
      ma,new Date(),full.rep_name||data.hoTenNguoiDaiDien||'',full.rep_dob||'',full.rep_gender||'',
      full.rep_id||'',full.rep_issue_date||'',full.rep_issue_place||'',full.rep_hometown||'',full.rep_address||'',full.rep_phone||data.soDienThoai||'',
      full.file_id||'',full.ministry_file||'',full.province_file||'',full.martyr_name||data.hoTenLietSi||'',full.martyr_alias||'',
      full.martyr_dob||'',full.martyr_gender||'',full.martyr_hometown||'',full.martyr_rank||'',full.martyr_unit||'',
      full.martyr_death_date||'',full.martyr_death_place||'',full.burial_place||'',full.certificate_no||'',full.decision_no||'',full.decision_date||'',
      full.father||'',full.mother||'',full.wife||'',full.ubnd_date||'',full.ubnd_title||'',full.ubnd_name||'',
      full.police_date||'',full.police_title||'',full.police_name||'',full.donvi_date||'',full.donvi_title||'',full.donvi_name||'',
      data.trangThai||'Mới',JSON.stringify(full)
    ];

    const values=main.getDataRange().getValues();
    let target=-1;
    for(let i=1;i<values.length;i++){
      if(String(values[i][0])===ma){target=i+1;break;}
    }
    if(target>0)main.getRange(target,1,1,row.length).setValues([row]);
    else main.appendRow(row);

    const rel=sheet_(REL_SHEET);
    const relValues=rel.getDataRange().getValues();
    const keep=[];
    for(let i=1;i<relValues.length;i++)if(String(relValues[i][0])!==ma)keep.push(relValues[i]);
    if(relValues.length>1){
      rel.getRange(2,1,Math.max(1,relValues.length-1),REL_HEADERS.length).clearContent();
      if(keep.length)rel.getRange(2,1,keep.length,REL_HEADERS.length).setValues(keep);
    }
    const relRows=(full.relatives||[]).slice(0,6).map((r,i)=>[
      ma,i+1,r.relationship||'',r.id||'',r.name||'',r.dob||'',r.gender||'',r.father||'',r.mother||'',r.address||'',r.status||'',r.signature||''
    ]);
    if(relRows.length)rel.getRange(rel.getLastRow()+1,1,relRows.length,REL_HEADERS.length).setValues(relRows);

    return json_({ok:true,maPhieu:ma,savedAt:new Date().toISOString()});
  }catch(err){
    return json_({ok:false,error:String(err)});
  }
}

function doGet(e){
  setup();
  const p=e?.parameter||{};
  const action=p.action||'list';
  const callback=p.callback||'';

  try{
    const main=sheet_(MAIN_SHEET);
    const rows=main.getDataRange().getValues();
    const out=[];
    for(let i=1;i<rows.length;i++){
      const r=rows[i];
      if(!r[0])continue;
      const item={};
      MAIN_HEADERS.forEach((h,j)=>item[h]=r[j]??'');
      if(action==='get'&&p.maPhieu&&String(item.ma_phieu)!==String(p.maPhieu))continue;
      const q=String(p.q||'').toLowerCase().trim();
      if(q&&![item.ma_phieu,item.ma_so_ho_so_liet_si,item.ho_ten_liet_si,item.ho_ten_nguoi_dai_dien].join(' ').toLowerCase().includes(q))continue;
      out.push(item);
    }
    if(action==='get')return json_({ok:true,item:out[0]||null},callback);
    return json_({ok:true,items:out.slice(0,200),count:out.length},callback);
  }catch(err){
    return json_({ok:false,error:String(err)},callback);
  }
}
