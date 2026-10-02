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

// Proxy endpoint to save to Google Sheets via Google Apps Script
app.post('/api/save-sheet', async (req, res) => {
  try {
    const payload = req.body || {};
    const appsScriptUrl = (payload.appsScriptUrl || '').trim() ||
      'https://script.google.com/macros/s/AKfycbwXHveyxf6Z1Hi-P-Ex9RtELyGszNRGhHsGMv6vVEsb43HcFyg3sbTa2XKvtJfkiT0orw/exec';

    if (!appsScriptUrl.startsWith('https://script.google.com/')) {
      return res.status(400).json({
        ok: false,
        error: 'Đường dẫn Google Apps Script không hợp lệ (phải bắt đầu bằng https://script.google.com/macros/s/...)'
      });
    }

    const queryParams = new URLSearchParams({
      maPhieu: payload.maPhieu || '',
      hoTenLietSi: payload.hoTenLietSi || '',
      ngaySinh: payload.ngaySinh || '',
      ngayHySinh: payload.ngayHySinh || '',
      queQuan: payload.queQuan || '',
      hoTenNguoiDaiDien: payload.hoTenNguoiDaiDien || '',
      soDienThoai: payload.soDienThoai || '',
      trangThai: payload.trangThai || 'Mới',
      donVi: payload.donVi || '',
      ghiChu: payload.ghiChu || '',
      ngayQuyetDinh: payload.ngayQuyetDinh || '',
      soQuyetDinh: payload.soQuyetDinh || '',
      soBangTQGC: payload.soBangTQGC || '',
      soCCCD: payload.soCCCD || ''
    });

    const targetUrl = appsScriptUrl + (appsScriptUrl.includes('?') ? '&' : '?') + queryParams.toString();

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

    res.json({
      ok: true,
      message: 'Đã lưu thành công vào Google Sheets'
    });
  } catch (err) {
    console.error('Error saving to Google Sheets:', err);
    res.status(500).json({
      ok: false,
      error: 'Lỗi khi gửi dữ liệu tới Google Apps Script: ' + err.message
    });
  }
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
