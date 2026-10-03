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

// Locate template file (check template/Mẫu 02.docx or Mẫu 02.docx at root)
let templatePath = path.join(__dirname, 'template', 'Mẫu 02.docx');
if (!fs.existsSync(templatePath)) {
  templatePath = path.join(__dirname, 'Mẫu 02.docx');
}

app.use(express.json({ limit: '10mb' }));

// Helper to replace label in a paragraph with label + ' ' + value
function replaceFirst(doc, p, label, value) {
  const val = (value || '').trim();
  if (!val) return false;
  
  const tNodes = p.getElementsByTagName('w:t');
  const texts = [];
  for (let i = 0; i < tNodes.length; i++) {
    texts.push(tNodes[i].textContent || '');
  }
  const text = texts.join('');
  if (!text.includes(label)) return false;

  const newText = text.replace(label, label + ' ' + val);

  // Remove existing runs from this paragraph
  const runs = [];
  for (let i = 0; i < p.childNodes.length; i++) {
    if (p.childNodes[i].nodeName === 'w:r') {
      runs.push(p.childNodes[i]);
    }
  }
  for (const r of runs) {
    p.removeChild(r);
  }

  // Create replacement run preserving Times New Roman font
  const rElem = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:r');
  const rPr = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rPr');
  const rFonts = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rFonts');
  rFonts.setAttribute('w:ascii', 'Times New Roman');
  rFonts.setAttribute('w:hAnsi', 'Times New Roman');
  rFonts.setAttribute('w:cs', 'Times New Roman');
  rPr.appendChild(rFonts);
  rElem.appendChild(rPr);

  const tElem = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:t');
  tElem.setAttribute('xml:space', 'preserve');
  tElem.textContent = newText;
  rElem.appendChild(tElem);

  p.appendChild(rElem);
  return true;
}

// Helper to set cell text in a table row
function setCellText(doc, cell, val) {
  const strVal = String(val ?? '');
  let p = null;
  for (let i = 0; i < cell.childNodes.length; i++) {
    if (cell.childNodes[i].nodeName === 'w:p') {
      p = cell.childNodes[i];
      break;
    }
  }
  if (!p) {
    p = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:p');
    cell.appendChild(p);
  }

  const runs = [];
  for (let i = 0; i < p.childNodes.length; i++) {
    if (p.childNodes[i].nodeName === 'w:r') {
      runs.push(p.childNodes[i]);
    }
  }
  for (const r of runs) {
    p.removeChild(r);
  }

  const rElem = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:r');
  const rPr = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rPr');
  const rFonts = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rFonts');
  rFonts.setAttribute('w:ascii', 'Times New Roman');
  rFonts.setAttribute('w:hAnsi', 'Times New Roman');
  rFonts.setAttribute('w:cs', 'Times New Roman');
  rPr.appendChild(rFonts);
  rElem.appendChild(rPr);

  const tElem = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:t');
  tElem.setAttribute('xml:space', 'preserve');
  tElem.textContent = strVal;
  rElem.appendChild(tElem);

  p.appendChild(rElem);
}

async function fillDocument(data) {
  const buf = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(buf);
  const xmlStr = await zip.file('word/document.xml').async('text');
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, 'application/xml');
  const body = doc.getElementsByTagName('w:body')[0];

  const paragraphs = [];
  const tables = [];
  for (let i = 0; i < body.childNodes.length; i++) {
    const node = body.childNodes[i];
    if (node.nodeName === 'w:p') paragraphs.push(node);
    if (node.nodeName === 'w:tbl') tables.push(node);
  }

  const mapping = {
    4: [['Họ và tên:', data.rep_name]],
    5: [['Ngày tháng năm sinh:', data.rep_dob], ['Giới tính:', data.rep_gender]],
    6: [['Số ĐDCN', data.rep_id], ['Ngày cấp', data.rep_issue_date], ['Nơi cấp:', data.rep_issue_place]],
    7: [['Quê quán:', data.rep_hometown]],
    8: [['Nơi thường trú:', data.rep_address]],
    9: [['Số điện thoại:', data.rep_phone]],
    12: [['Mã hồ sơ Bộ quản lý:', data.ministry_file], ['Mã hồ sơ tỉnh quản lý:', data.province_file]],
    13: [['Họ và tên liệt sĩ:', data.martyr_name], ['Bí danh:', data.martyr_alias]],
    14: [['Ngày tháng năm sinh:', data.martyr_dob], ['Giới tính:', data.martyr_gender]],
    15: [['Quê quán:', data.martyr_hometown]],
    16: [['Cấp bậc, chức vụ khi hy sinh:', data.martyr_rank]],
    17: [['Cơ quan, đơn vị khi hy sinh:', data.martyr_unit]],
    18: [['Ngày tháng năm hy sinh:', data.martyr_death_date]],
    19: [['Nơi hy sinh (nếu có):', data.martyr_death_place]],
    20: [['Nơi an táng ban đầu:', data.burial_place]],
    21: [['Bằng Tổ quốc ghi công số', data.certificate_no], ['Quyết định số', data.decision_no], ['ngày', data.decision_date]],
    22: [['Con ông:', data.father]],
    23: [['Con bà:', data.mother]],
    24: [['Vợ:', data.wife]]
  };

  for (const [idxStr, items] of Object.entries(mapping)) {
    const idx = parseInt(idxStr, 10);
    if (idx < paragraphs.length) {
      const p = paragraphs[idx];
      for (const [label, value] of items) {
        if (value) replaceFirst(doc, p, label, value);
      }
    }
  }

  if (tables.length >= 3) {
    const table = tables[2];
    const rows = [];
    for (let i = 0; i < table.childNodes.length; i++) {
      if (table.childNodes[i].nodeName === 'w:tr') rows.push(table.childNodes[i]);
    }
    const relatives = data.relatives || [];
    const colIndices = [2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (let i = 0; i < Math.min(relatives.length, 10); i++) {
      if (i + 2 >= rows.length) break;
      const row = rows[i + 2];
      const cells = [];
      for (let j = 0; j < row.childNodes.length; j++) {
        if (row.childNodes[j].nodeName === 'w:tc') cells.push(row.childNodes[j]);
      }
      const rel = relatives[i] || {};
      const vals = [
        rel.id || '',
        rel.name || '',
        rel.dob || '',
        rel.gender || '',
        rel.father || '',
        rel.mother || '',
        rel.address || '',
        rel.status || '',
        rel.signature || ''
      ];
      for (let k = 0; k < colIndices.length; k++) {
        const colIdx = colIndices[k];
        if (colIdx < cells.length) {
          setCellText(doc, cells[colIdx], vals[k]);
        }
      }
    }
  }

  const serializer = new XMLSerializer();
  const newXml = serializer.serializeToString(doc);
  zip.file('word/document.xml', newXml);
  return await zip.generateAsync({ type: 'nodebuffer' });
}

// Generate Word document route
app.post('/api/generate', async (req, res) => {
  try {
    const data = req.body || {};
    const content = await fillDocument(data);
    const filename = 'Phieu_khao_sat_liet_si.docx';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', content.length);
    res.send(content);
  } catch (err) {
    console.error('Error generating document:', err);
    res.status(500).json({ error: err.message });
  }
});

// Proxy endpoint to save to Google Sheets via Google Apps Script (and optional Supabase)
app.post('/api/save-sheet', async (req, res) => {
  try {
    const staff = await requireStaff(req, res);
    if (!staff) return;
    const payload = req.body || {};
    if (staff.profile.role !== 'admin') {
      const supabaseUrl = process.env.SUPABASE_URL.replace(/\/+$/, '');
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const linksRes = await fetch(supabaseUrl + '/rest/v1/staff_to_dan_pho?select=to_dan_pho_id,to_dan_pho(name)&staff_id=eq.' + encodeURIComponent(staff.user.id), {
        headers: { apikey: key, Authorization: 'Bearer ' + key }
      });
      const links = linksRes.ok ? await linksRes.json() : [];
      const names = links.map(x => x.to_dan_pho && x.to_dan_pho.name).filter(Boolean);
      const nums = names.map(n => (String(n).match(/\d+/) || [])[0]).filter(Boolean);
      const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const address = norm(payload.rep_address || payload.noiThuongTruNDD || '');
      const allowed = nums.some(n => new RegExp('\\bto\\s*dan\\s*pho\\s*' + n + '\\b').test(address));
      if (!allowed) return res.status(403).json({ ok: false, error: 'Chỉ được lưu phiếu có nơi thường trú thuộc Tổ dân phố được phân công.' });
    }
    const appsScriptUrl = (payload.appsScriptUrl || '').trim() ||
      'https://script.google.com/macros/s/AKfycbxDJfEZo5tYBS4emSeQfAL8XbS8OSE4a26P8FEUnVRd9af4LKhFZlhI1a4gyyygcAE/exec';

    if (!appsScriptUrl.startsWith('https://script.google.com/')) {
      return res.status(400).json({
        ok: false,
        error: 'Đường dẫn Google Apps Script không hợp lệ (phải bắt đầu bằng https://script.google.com/macros/s/...)'
      });
    }

    const queryParams = new URLSearchParams({
      record_id: payload.record_id || payload.maPhieu || '',
      maPhieu: payload.file_id || payload.maPhieu || payload.record_id || '',
      hoTenLietSi: payload.martyr_name || payload.hoTenLietSi || '',
      ngaySinh: payload.martyr_dob || payload.ngaySinh || '',
      ngayHySinh: payload.martyr_death_date || payload.ngayHySinh || '',
      queQuan: payload.martyr_hometown || payload.queQuan || '',
      hoTenNguoiDaiDien: payload.rep_name || payload.hoTenNguoiDaiDien || '',
      soDienThoai: payload.rep_phone || payload.soDienThoai || '',
      trangThai: payload.trangThai || 'Mới',
      donVi: payload.martyr_unit || payload.donVi || '',
      ghiChu: payload.martyr_death_place || payload.ghiChu || '',
      ngayQuyetDinh: payload.decision_date || payload.ngayQuyetDinh || '',
      soQuyetDinh: payload.decision_no || payload.soQuyetDinh || '',
      soBangTQGC: payload.certificate_no || payload.soBangTQGC || '',
      soCCCD: payload.rep_id || payload.soCCCD || '',
      gioiTinhLS: payload.martyr_gender || payload.gioiTinhLS || '',
      gioiTinhNDD: payload.rep_gender || payload.gioiTinhNDD || '',
      queQuanNDD: payload.rep_hometown || payload.queQuanNDD || '',
      noiThuongTruNDD: payload.rep_address || payload.noiThuongTruNDD || '',
      capBac: payload.martyr_rank || payload.capBac || '',
      file_id: payload.file_id || ''
    });

    const targetUrl = appsScriptUrl + (appsScriptUrl.includes('?') ? '&' : '?') + queryParams.toString();

    // Send full JSON payload to Google Apps Script
    const googleRes = await fetch(targetUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await googleRes.text();
    const finalUrl = googleRes.url || '';

    if (finalUrl.includes('accounts.google.com') || responseText.includes('ServiceLogin') || responseText.includes('IdentifierInput')) {
      return res.status(403).json({
        ok: false,
        isAuthError: true,
        error: 'Bản triển khai Google Apps Script đang yêu cầu đăng nhập tài khoản. Vui lòng vào Google Apps Script -> Quản lý bản triển khai (Manage deployments) -> Chỉnh sửa (Edit) -> Đặt "Ai có quyền truy cập" (Who has access) là "Bất kỳ ai" (Anyone).'
      });
    }

    if (googleRes.status === 404 || responseText.includes('找不到網頁') || responseText.includes('Không tìm thấy tệp') || responseText.includes('Page Not Found')) {
      return res.status(404).json({
        ok: false,
        isNotFoundError: true,
        error: 'Không tìm thấy đường dẫn Google Apps Script Web App (404). Vui lòng kiểm tra lại URL bản triển khai Web App hoặc cập nhật URL mới.'
      });
    }

    if (!googleRes.ok && googleRes.status >= 400) {
      return res.status(googleRes.status).json({
        ok: false,
        error: `Google Apps Script trả về mã lỗi HTTP ${googleRes.status}`
      });
    }

    // Optional: If Supabase connection is configured, also upsert record to database
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const recordId = payload.record_id || payload.file_id || ('LS02-' + Date.now());
        const supabaseEndpoint = `${process.env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/m02_records?on_conflict=record_id`;
        await fetch(supabaseEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Prefer': 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify([{
            record_id: recordId,
            status: payload.trangThai || 'Mới',
            martyr_name: payload.martyr_name || payload.hoTenLietSi || '',
            martyr_hometown: payload.martyr_hometown || payload.queQuan || '',
            file_id: payload.file_id || '',
            rep_name: payload.rep_name || payload.hoTenNguoiDaiDien || '',
            data: payload,
            updated_at: new Date().toISOString()
          }])
        });
      } catch (dbErr) {
        console.warn('Supabase optional upsert warning:', dbErr.message);
      }
    }

    let parsedGoogleResult = {};
    try { parsedGoogleResult = JSON.parse(responseText); } catch (e) {}

    res.json({
      ok: true,
      message: parsedGoogleResult.message || 'Đã lưu thành công vào Google Sheets',
      action: parsedGoogleResult.action || 'saved',
      record_id: payload.record_id || payload.maPhieu
    });
  } catch (err) {
    console.error('Error saving to Google Sheets:', err);
    res.status(500).json({
      ok: false,
      error: 'Lỗi khi gửi dữ liệu tới Google Apps Script: ' + err.message
    });
  }
});

// Admin-only record endpoint used by the assignment console.
async function requireStaff(req, res, requiredRole = null) {
  try {
    const authorization = req.headers.authorization || '';
    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      res.status(401).json({ ok: false, error: 'Thiếu phiên đăng nhập.' });
      return null;
    }

    const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceRoleKey) {
      res.status(500).json({ ok: false, error: 'Thiếu cấu hình xác thực máy chủ.' });
      return null;
    }

    const userRes = await fetch(supabaseUrl + '/auth/v1/user', {
      headers: {
        apikey: serviceRoleKey,
        Authorization: 'Bearer ' + token
      }
    });
    if (!userRes.ok) {
      res.status(401).json({ ok: false, error: 'Phiên đăng nhập không hợp lệ.' });
      return null;
    }
    const user = await userRes.json();

    const profileRes = await fetch(
      supabaseUrl + '/rest/v1/staff_profiles?select=user_id,role,active&user_id=eq.' +
      encodeURIComponent(user.id) + '&limit=1',
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: 'Bearer ' + serviceRoleKey
        }
      }
    );
    const profiles = profileRes.ok ? await profileRes.json() : [];
    const profile = profiles[0];
    if (!profile || !profile.active || (requiredRole && profile.role !== requiredRole)) {
      res.status(403).json({ ok: false, error: 'Tài khoản không có quyền thực hiện thao tác này.' });
      return null;
    }
    return { user, profile };
  } catch (err) {
    console.error('Admin auth error:', err);
    res.status(500).json({ ok: false, error: 'Không xác thực được tài khoản.' });
    return null;
  }
}

app.get('/api/admin-records', async (req, res) => {
  const staff = await requireStaff(req, res, 'admin');
  if (!staff) return;

  const q = (req.query.q || '').trim().toLowerCase();
  const appsScriptUrl = (req.query.appsScriptUrl || '').trim();

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      let queryUrl = process.env.SUPABASE_URL.replace(/\/+$/, '') +
        '/rest/v1/m02_records?select=*&order=updated_at.desc&limit=100';
      if (q) {
        queryUrl += '&or=(martyr_name.ilike.*' + encodeURIComponent(q) +
          '*,record_id.ilike.*' + encodeURIComponent(q) +
          '*,rep_name.ilike.*' + encodeURIComponent(q) +
          '*,file_id.ilike.*' + encodeURIComponent(q) + '*)';
      }
      const dbRes = await fetch(queryUrl, {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      });
      if (dbRes.ok) {
        return res.json({ ok: true, source: 'supabase', records: await dbRes.json() });
      }
    } catch (e) {
      console.warn('Admin Supabase query error, fallback to sheets:', e.message);
    }
  }

  if (appsScriptUrl && appsScriptUrl.startsWith('https://script.google.com/')) {
    try {
      const gRes = await fetch(appsScriptUrl + '?action=list&q=' + encodeURIComponent(q), { redirect: 'follow' });
      if (gRes.ok) return res.json(await gRes.json());
    } catch (e) {
      console.warn('Admin Apps Script query error:', e.message);
    }
  }

  return res.json({ ok: true, records: [] });
});

// Endpoint to search or list records
app.get('/api/records', async (req, res) => {
  const staff = await requireStaff(req, res);
  if (!staff) return;

  const q = (req.query.q || '').trim().toLowerCase();
  const appsScriptUrl = (req.query.appsScriptUrl || '').trim();
  let records = [];
  const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // Đọc dữ liệu từ Supabase nếu được cấu hình.
  if (supabaseUrl && serviceKey) {
    try {
      let queryUrl = supabaseUrl + '/rest/v1/m02_records?select=*&order=updated_at.desc&limit=500';
      if (q) {
        queryUrl += '&or=(martyr_name.ilike.*' + encodeURIComponent(q) +
          '*,record_id.ilike.*' + encodeURIComponent(q) +
          '*,rep_name.ilike.*' + encodeURIComponent(q) +
          '*,file_id.ilike.*' + encodeURIComponent(q) + '*)';
      }
      const dbRes = await fetch(queryUrl, {
        headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey }
      });
      if (dbRes.ok) records = await dbRes.json();
    } catch (e) {
      console.warn('Supabase query error:', e.message);
    }
  }

  // Đọc thêm Google Sheets để không bỏ sót phiếu chưa đồng bộ sang Supabase.
  let sheetRecords = [];
  if (appsScriptUrl && appsScriptUrl.startsWith('https://script.google.com/')) {
    try {
      const gRes = await fetch(appsScriptUrl + '?action=list&q=' + encodeURIComponent(q), { redirect: 'follow' });
      if (gRes.ok) {
        const data = await gRes.json();
        if (Array.isArray(data.records)) sheetRecords = data.records;
      }
    } catch (e) {
      console.warn('Apps Script query error:', e.message);
    }
  }

  // Hợp nhất hai nguồn theo mã phiếu, tránh bỏ sót bản ghi chỉ có trên Google Sheets.
  const merged = new Map();
  for (const r of sheetRecords) {
    const key = String(r.record_id || r.file_id || r.maPhieu || '').trim();
    if (key) merged.set(key, { ...r, data: r.data && typeof r.data === 'object' ? { ...r.data } : r.data });
  }
  for (const r of records) {
    const key = String(r.record_id || r.file_id || r.maPhieu || '').trim();
    if (!key) continue;
    const previous = merged.get(key) || {};
    const previousData = previous.data && typeof previous.data === 'object' ? previous.data : {};
    const currentData = r.data && typeof r.data === 'object' ? r.data : {};
    merged.set(key, { ...previous, ...r, data: { ...previousData, ...currentData } });
  }
  records = Array.from(merged.values());

  if (staff.profile.role !== 'admin') {
    // Lấy phân công bằng ID trước, sau đó truy vấn danh mục tổ riêng
    // để tránh trường hợp PostgREST không trả về quan hệ nhúng to_dan_pho(name).
    const headers = { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey };
    const linksUrl = supabaseUrl + '/rest/v1/staff_to_dan_pho?select=to_dan_pho_id&staff_id=eq.' +
      encodeURIComponent(staff.user.id);
    const linksRes = await fetch(linksUrl, { headers });
    if (!linksRes.ok) {
      console.warn('Could not load staff territory assignments:', linksRes.status);
      return res.status(500).json({ ok: false, error: 'Không đọc được phân công tổ dân phố của cán bộ.' });
    }
    const links = await linksRes.json();
    const ids = [...new Set(links.map(x => String(x.to_dan_pho_id || '').trim()).filter(Boolean))];

    // Không bỏ lọc khi tài khoản chưa có phân công; giữ nguyên nguyên tắc giới hạn địa bàn.
    if (!ids.length) {
      return res.json({ ok: true, records: [], message: 'Tài khoản chưa được gán tổ dân phố.' });
    }

    const idFilter = ids.map(id => '"' + id.replace(/"/g, '') + '"').join(',');
    const territoryRes = await fetch(
      supabaseUrl + '/rest/v1/to_dan_pho?select=id,name&id=in.(' + encodeURIComponent(idFilter) + ')',
      { headers }
    );
    if (!territoryRes.ok) {
      console.warn('Could not load territory names:', territoryRes.status);
      return res.status(500).json({ ok: false, error: 'Không đọc được danh mục tổ dân phố.' });
    }
    const territories = await territoryRes.json();
    const names = territories.map(x => x.name).filter(Boolean);
    const normalize = v => String(v || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .toLowerCase()
      .replace(/[.,;:/_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const nums = names.map(n => (String(n).match(/\d+/) || [])[0]).filter(Boolean);

    records = records.filter(r => {
      const d = r.data && typeof r.data === 'object' ? r.data : {};
      const address = normalize(
        d.rep_address || d.noiThuongTruNDD || d['Nơi thường trú NĐD'] ||
        d['Nơi thường trú người đại diện'] || d['Nơi thường trú'] ||
        r.rep_address || r.noiThuongTruNDD || r['Nơi thường trú NĐD'] ||
        r['Nơi thường trú người đại diện'] || r['Nơi thường trú'] || r.address || ''
      );
      return nums.some(n => {
        // Match "Tổ dân phố 30", "TDP 30", "Tổ 30" and spacing/punctuation variants.
        return new RegExp('(?:^|\\s)(?:to\\s*dan\\s*pho|tdp|to)(?:\\s*so)?\\s*' + String(n) + '(?:\\s|$)').test(address);
      });
    });
  }
  return res.json({ ok: true, records });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static assets from public/ or root
if (fs.existsSync(path.join(__dirname, 'public'))) {
  app.use(express.static(path.join(__dirname, 'public')));
}
if (fs.existsSync(path.join(__dirname, 'template'))) {
  app.use('/template', express.static(path.join(__dirname, 'template')));
}
app.use(express.static(__dirname));

// Fallback to index.html
app.get('*', (req, res) => {
  if (fs.existsSync(path.join(__dirname, 'public', 'index.html'))) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// Vercel imports the Express app as a serverless function.
// Keep the local listener only when running this file directly.
if (process.env.VERCEL !== '1') {
  app.listen(PORT, HOST, () => {
    console.log(`Server listening at http://${HOST}:${PORT}`);
  });
}

export default app;
