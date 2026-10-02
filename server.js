import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

function resolveTemplatePath(){
  const candidates = [
    path.join(__dirname,'template','Mẫu 02.docx'),
    path.join(__dirname,'template','mau-02.docx'),
    path.join(__dirname,'Mẫu 02.docx'),
    path.join(__dirname,'mau-02.docx')
  ];
  const found=candidates.find(p=>fs.existsSync(p));
  if(!found)throw new Error('Không tìm thấy file mẫu Word Mẫu 02.docx trong thư mục template hoặc thư mục gốc.');
  return found;
}

app.use(express.json({limit:'10mb'}));

function paragraphText(p){
  const nodes=p.getElementsByTagName('w:t');
  let out='';
  for(let i=0;i<nodes.length;i++)out+=nodes[i].textContent||'';
  return out;
}

function replaceParagraph(doc,p,label,value){
  const val=String(value??'').trim();
  if(!val)return false;
  const text=paragraphText(p);
  if(!text.includes(label))return false;
  const newText=text.replace(label,label+' '+val);

  const runs=[];
  for(let i=0;i<p.childNodes.length;i++){
    if(p.childNodes[i].nodeName==='w:r')runs.push(p.childNodes[i]);
  }
  runs.forEach(r=>p.removeChild(r));

  const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const r=doc.createElementNS(ns,'w:r');
  const rPr=doc.createElementNS(ns,'w:rPr');
  const fonts=doc.createElementNS(ns,'w:rFonts');
  fonts.setAttribute('w:ascii','Times New Roman');
  fonts.setAttribute('w:hAnsi','Times New Roman');
  fonts.setAttribute('w:cs','Times New Roman');
  rPr.appendChild(fonts);r.appendChild(rPr);
  const t=doc.createElementNS(ns,'w:t');
  t.setAttribute('xml:space','preserve');t.textContent=newText;r.appendChild(t);
  p.appendChild(r);
  return true;
}

function replaceOccurrence(doc,paragraphs,label,occurrence,value){
  if(!String(value??'').trim())return false;
  let seen=0;
  for(const p of paragraphs){
    if(paragraphText(p).includes(label)){
      seen++;
      if(seen===occurrence)return replaceParagraph(doc,p,label,value);
    }
  }
  return false;
}

function setCellText(doc,cell,val){
  const strVal=String(val??'');
  const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  let p=null;
  for(let i=0;i<cell.childNodes.length;i++){
    if(cell.childNodes[i].nodeName==='w:p'){p=cell.childNodes[i];break;}
  }
  if(!p){p=doc.createElementNS(ns,'w:p');cell.appendChild(p);}
  const runs=[];
  for(let i=0;i<p.childNodes.length;i++)if(p.childNodes[i].nodeName==='w:r')runs.push(p.childNodes[i]);
  runs.forEach(r=>p.removeChild(r));

  const r=doc.createElementNS(ns,'w:r');
  const rPr=doc.createElementNS(ns,'w:rPr');
  const fonts=doc.createElementNS(ns,'w:rFonts');
  fonts.setAttribute('w:ascii','Times New Roman');
  fonts.setAttribute('w:hAnsi','Times New Roman');
  fonts.setAttribute('w:cs','Times New Roman');
  rPr.appendChild(fonts);r.appendChild(rPr);
  const t=doc.createElementNS(ns,'w:t');
  t.setAttribute('xml:space','preserve');t.textContent=strVal;r.appendChild(t);
  p.appendChild(r);
}

async function fillDocument(data){
  const templatePath=resolveTemplatePath();
  const buf=fs.readFileSync(templatePath);
  const zip=await JSZip.loadAsync(buf);
  const documentFile=zip.file('word/document.xml');
  if(!documentFile)throw new Error('Mẫu Word không chứa word/document.xml hợp lệ.');
  const xmlStr=await documentFile.async('text');

  const doc=new DOMParser().parseFromString(xmlStr,'application/xml');
  const body=doc.getElementsByTagName('w:body')[0];
  if(!body)throw new Error('Không đọc được nội dung mẫu Word.');

  const paragraphs=[];
  for(let i=0;i<body.childNodes.length;i++){
    if(body.childNodes[i].nodeName==='w:p')paragraphs.push(body.childNodes[i]);
  }

  // Trang 1 – bám theo nhãn của Mẫu 02, không phụ thuộc số thứ tự paragraph.
  replaceOccurrence(doc,paragraphs,'Họ và tên:',1,data.rep_name);
  replaceOccurrence(doc,paragraphs,'Ngày tháng năm sinh:',1,data.rep_dob);
  replaceOccurrence(doc,paragraphs,'Giới tính:',1,data.rep_gender);
  replaceOccurrence(doc,paragraphs,'Số ĐDCN',1,data.rep_id);
  replaceOccurrence(doc,paragraphs,'Ngày cấp',1,data.rep_issue_date);
  replaceOccurrence(doc,paragraphs,'Nơi cấp:',1,data.rep_issue_place);
  replaceOccurrence(doc,paragraphs,'Quê quán:',1,data.rep_hometown);
  replaceOccurrence(doc,paragraphs,'Nơi thường trú:',1,data.rep_address);
  replaceOccurrence(doc,paragraphs,'Số điện thoại:',1,data.rep_phone);

  replaceOccurrence(doc,paragraphs,'Mã số hồ sơ liệt sĩ:',1,data.file_id);
  replaceOccurrence(doc,paragraphs,'Mã hồ sơ Bộ quản lý:',1,data.ministry_file);
  replaceOccurrence(doc,paragraphs,'Mã hồ sơ tỉnh quản lý:',1,data.province_file);
  replaceOccurrence(doc,paragraphs,'Họ và tên liệt sĩ:',1,data.martyr_name);
  replaceOccurrence(doc,paragraphs,'Bí danh:',1,data.martyr_alias);
  replaceOccurrence(doc,paragraphs,'Ngày tháng năm sinh:',2,data.martyr_dob);
  replaceOccurrence(doc,paragraphs,'Giới tính:',2,data.martyr_gender);
  replaceOccurrence(doc,paragraphs,'Quê quán:',2,data.martyr_hometown);
  replaceOccurrence(doc,paragraphs,'Cấp bậc, chức vụ khi hy sinh:',1,data.martyr_rank);
  replaceOccurrence(doc,paragraphs,'Cơ quan, đơn vị khi hy sinh:',1,data.martyr_unit);
  replaceOccurrence(doc,paragraphs,'Ngày tháng năm hy sinh:',1,data.martyr_death_date);
  replaceOccurrence(doc,paragraphs,'Nơi hy sinh (nếu có):',1,data.martyr_death_place);
  replaceOccurrence(doc,paragraphs,'Nơi an táng ban đầu:',1,data.burial_place);
  replaceOccurrence(doc,paragraphs,'Bằng Tổ quốc ghi công số',1,data.certificate_no);
  replaceOccurrence(doc,paragraphs,'Quyết định số',1,data.decision_no);
  replaceOccurrence(doc,paragraphs,'ngày',1,data.decision_date);
  replaceOccurrence(doc,paragraphs,'Con ông:',1,data.father);
  replaceOccurrence(doc,paragraphs,'Con bà:',1,data.mother);
  replaceOccurrence(doc,paragraphs,'Vợ:',1,data.wife);

  // Phụ lục 1 – chỉ ghi vào 6 dòng STT thật; mẫu DOCX có các dòng phụ do ô gộp dọc.
  const tables=Array.from(body.childNodes).filter(n=>n.nodeName==='w:tbl');
  if(tables.length>=3){
    const table=tables[2];
    const rows=[];
    for(let i=0;i<table.childNodes.length;i++){
      if(table.childNodes[i].nodeName==='w:tr')rows.push(table.childNodes[i]);
    }
    const byStt={};
    for(const row of rows){
      const cells=[];
      for(let i=0;i<row.childNodes.length;i++)if(row.childNodes[i].nodeName==='w:tc')cells.push(row.childNodes[i]);
      if(!cells.length)continue;
      const first=paragraphText(cells[0]).trim();
      if(/^[1-6]$/.test(first))byStt[first]=cells;
    }
    const rels=data.relatives||[];
    for(let i=0;i<6;i++){
      const cells=byStt[String(i+1)];
      if(!cells)continue;
      const r=rels[i]||{};
      const vals=[r.id,r.name,r.dob,r.gender,r.father,r.mother,r.address,r.status,r.signature];
      // DOCX columns: 0=STT, 1=đối tượng, 2..10=dữ liệu.
      for(let k=0;k<9;k++){
        const cellIndex=k+2;
        if(cells[cellIndex])setCellText(doc,cells[cellIndex],vals[k]);
      }
    }
  }

  zip.file('word/document.xml',new XMLSerializer().serializeToString(doc));
  return zip.generateAsync({type:'nodebuffer'});
}

const SUPABASE_URL=process.env.SUPABASE_URL||'';
const SUPABASE_SERVICE_ROLE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||'';

function dbReady(){
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

async function supabaseRequest(endpoint, options={}){
  if(!dbReady()) throw new Error('Chưa cấu hình SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trên Vercel.');
  const response=await fetch(SUPABASE_URL+'/rest/v1/'+endpoint,{
    ...options,
    headers:{
      apikey:SUPABASE_SERVICE_ROLE_KEY,
      Authorization:'Bearer '+SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type':'application/json',
      ...(options.headers||{})
    }
  });
  const raw=await response.text();
  let body=null;
  try{body=raw?JSON.parse(raw):null;}catch{body=raw;}
  if(!response.ok){
    const detail=typeof body==='string'?body:body?.message||body?.hint||JSON.stringify(body);
    throw new Error('Supabase '+response.status+': '+detail);
  }
  return body;
}

function cleanRecord(data){
  const d={...data};
  d.record_id=String(d.record_id||'').trim();
  if(!d.record_id)d.record_id='LS02-'+Date.now();
  d.martyr_name=String(d.martyr_name||'').trim();
  d.martyr_hometown=String(d.martyr_hometown||'').trim();
  d.file_id=String(d.file_id||'').trim();
  d.rep_name=String(d.rep_name||'').trim();
  return d;
}

app.get('/api/records',async(req,res)=>{
  try{
    const rows=await supabaseRequest('m02_records?select=record_id,status,martyr_name,martyr_hometown,file_id,rep_name,created_at,updated_at&order=updated_at.desc&limit=200');
    const q=String(req.query.q||'').toLowerCase().trim();
    const items=(Array.isArray(rows)?rows:[]).filter(r=>!q||[r.record_id,r.martyr_name,r.martyr_hometown,r.file_id,r.rep_name].join(' ').toLowerCase().includes(q));
    res.json({ok:true,items,count:items.length});
  }catch(err){
    console.error('List records error:',err);
    res.status(503).json({ok:false,error:err.message});
  }
});

app.get('/api/records/:recordId',async(req,res)=>{
  try{
    const id=encodeURIComponent(req.params.recordId);
    const rows=await supabaseRequest('m02_records?select=*&record_id=eq.'+id+'&limit=1');
    const row=Array.isArray(rows)?rows[0]:null;
    if(!row)return res.status(404).json({ok:false,error:'Không tìm thấy hồ sơ.'});
    res.json({ok:true,record:row.data,row});
  }catch(err){
    console.error('Get record error:',err);
    res.status(503).json({ok:false,error:err.message});
  }
});

app.post('/api/records',async(req,res)=>{
  try{
    const data=cleanRecord(req.body||{});
    if(!data.martyr_name)return res.status(400).json({ok:false,error:'Thiếu Họ và tên liệt sĩ.'});
    const row={
      record_id:data.record_id,
      status:'Mới',
      martyr_name:data.martyr_name,
      martyr_hometown:data.martyr_hometown,
      file_id:data.file_id,
      rep_name:data.rep_name,
      data,
      updated_at:new Date().toISOString()
    };
    const saved=await supabaseRequest('m02_records?on_conflict=record_id',{
      method:'POST',
      headers:{Prefer:'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify(row)
    });
    const item=Array.isArray(saved)?saved[0]:saved;
    res.json({ok:true,record:item?.data||data,meta:item||null});
  }catch(err){
    console.error('Save record error:',err);
    res.status(503).json({ok:false,error:err.message});
  }
});

app.delete('/api/records/:recordId',async(req,res)=>{
  try{
    const id=encodeURIComponent(req.params.recordId);
    await supabaseRequest('m02_records?record_id=eq.'+id,{method:'DELETE'});
    res.json({ok:true});
  }catch(err){
    console.error('Delete record error:',err);
    res.status(503).json({ok:false,error:err.message});
  }
});

app.post('/api/generate',async(req,res)=>{
  try{
    const data=req.body||{};
    if(!data.martyr_name){
      return res.status(400).json({error:'Thiếu Họ và tên liệt sĩ.'});
    }
    const content=await fillDocument(data);
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition','attachment; filename="Phieu_khao_sat_liet_si.docx"');
    res.setHeader('Content-Length',content.length);
    res.send(content);
  }catch(err){
    console.error('Error generating document:',err);
    res.status(500).json({error:err?.message||'Không tạo được file Word.'});
  }
});

app.get('/api/health',(req,res)=>{
  let template='missing';
  try{template=path.relative(__dirname,resolveTemplatePath());}catch{}
  res.json({status:'ok',runtime:'node',template,storage:'supabase',databaseConfigured:dbReady()});
});

if(fs.existsSync(path.join(__dirname,'public')))app.use(express.static(path.join(__dirname,'public')));
if(fs.existsSync(path.join(__dirname,'template')))app.use('/template',express.static(path.join(__dirname,'template')));
app.use(express.static(__dirname));

app.get('*',(req,res)=>{
  const pub=path.join(__dirname,'public','index.html');
  const root=path.join(__dirname,'index.html');
  res.sendFile(fs.existsSync(pub)?pub:root);
});

if(process.env.VERCEL!=='1'){
  app.listen(PORT,HOST,()=>console.log(`Server listening at http://${HOST}:${PORT}`));
}

export default app;
