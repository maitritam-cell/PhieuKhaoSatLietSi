import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Locate template files (Mẫu 02 and Mẫu 01)
let templatePath = path.join(__dirname, 'template', 'Mẫu 02.docx');
if (!fs.existsSync(templatePath)) {
  templatePath = path.join(__dirname, 'Mẫu 02.docx');
}

let templatePathM01 = path.join(__dirname, 'template', 'Mẫu 01.docx');
if (!fs.existsSync(templatePathM01)) {
  templatePathM01 = path.join(__dirname, 'Mẫu 01.docx');
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


function setParagraphText(doc, paragraph, text) {
  if (!paragraph) return;
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const pPr = Array.from(paragraph.childNodes).find(node => node.nodeName === 'w:pPr');
  const firstRun = Array.from(paragraph.childNodes).find(node => node.nodeName === 'w:r');
  const oldRPr = firstRun && Array.from(firstRun.childNodes).find(node => node.nodeName === 'w:rPr');
  const rPr = oldRPr ? oldRPr.cloneNode(true) : null;
  Array.from(paragraph.childNodes).forEach(node => {
    if (node !== pPr) paragraph.removeChild(node);
  });
  const run = doc.createElementNS(W, 'w:r');
  if (rPr) run.appendChild(rPr);
  const t = doc.createElementNS(W, 'w:t');
  t.setAttribute('xml:space', 'preserve');
  t.textContent = text;
  run.appendChild(t);
  paragraph.appendChild(run);
}

function formatVietnameseDecisionDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'ngày.... tháng... năm ......';
  let match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (match) return 'ngày ' + match[1].padStart(2, '0') + ' tháng ' + match[2].padStart(2, '0') + ' năm ' + match[3];
  match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return 'ngày ' + match[3].padStart(2, '0') + ' tháng ' + match[2].padStart(2, '0') + ' năm ' + match[1];
  return raw;
}

function applyConfirmationBlock(doc, body) {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

  function makeParagraph(text, opts = {}) {
    const p = doc.createElementNS(W, 'w:p');
    const pPr = doc.createElementNS(W, 'w:pPr');

    const jc = doc.createElementNS(W, 'w:jc');
    jc.setAttribute('w:val', opts.align || 'center');
    pPr.appendChild(jc);

    const spacing = doc.createElementNS(W, 'w:spacing');
    spacing.setAttribute('w:before', '0');
    spacing.setAttribute('w:after', String(opts.after ?? 40));
    pPr.appendChild(spacing);
    p.appendChild(pPr);

    const r = doc.createElementNS(W, 'w:r');
    const rPr = doc.createElementNS(W, 'w:rPr');

    const fonts = doc.createElementNS(W, 'w:rFonts');
    fonts.setAttribute('w:ascii', 'Times New Roman');
    fonts.setAttribute('w:hAnsi', 'Times New Roman');
    fonts.setAttribute('w:cs', 'Times New Roman');
    rPr.appendChild(fonts);

    if (opts.bold) rPr.appendChild(doc.createElementNS(W, 'w:b'));
    if (opts.italic) rPr.appendChild(doc.createElementNS(W, 'w:i'));

    const t = doc.createElementNS(W, 'w:t');
    t.setAttribute('xml:space', 'preserve');
    t.textContent = text;
    r.appendChild(rPr);
    r.appendChild(t);
    p.appendChild(r);
    return p;
  }

  function replaceCell(cell, lines) {
    // Giữ nguyên tcPr để bảo toàn kích thước, đường viền và vị trí của ô trong mẫu.
    const children = [];
    for (let i = 0; i < cell.childNodes.length; i++) {
      const child = cell.childNodes[i];
      if (child.nodeName !== 'w:tcPr') children.push(child);
    }
    children.forEach(child => cell.removeChild(child));

    for (const line of lines) {
      cell.appendChild(makeParagraph(line.text, line));
    }
  }

  const blocks = [
    {
      // Mẫu gốc đang ghi "Xác nhận của UBND cấp xã", không phải "UBND phường".
      // Vì vậy phải nhận diện cả cách ghi của mẫu gốc.
      keywords: ['Xác nhận của UBND phường', 'Xác nhận của UBND cấp xã', 'UBND cấp xã'],
      lines: [
        { text: 'Phan Rang, ngày …… tháng 9 năm 2026', italic: true },
        { text: 'Xác nhận của UBND phường' },
        { text: 'về nội dung khai trên bản khai là đúng', after: 280 },
        // Chừa khoảng trống chữ ký giữa chức vụ và họ tên, đủ để ký tay.
        { text: 'CHỦ TỊCH', bold: true, after: 960 },
        { text: 'Lê Hoài Nam', bold: true, after: 40 }
      ]
    },
    {
      // Mẫu gốc đang ghi "Xác nhận của Công an cấp xã".
      keywords: ['Xác nhận của Công an phường', 'Xác nhận của Công an cấp xã', 'Công an cấp xã'],
      lines: [
        { text: 'Phan Rang, ngày …… tháng 8 năm 2026', italic: true },
        { text: 'Xác nhận của Công an phường' },
        { text: 'về nội dung thông tin dữ liệu dân cư của các cá nhân trên bản khai là đúng.' },
        { text: 'KT. TRƯỞNG CÔNG AN PHƯỜNG', bold: true, after: 40 },
        // Chức danh nằm trên chữ ký; chừa khoảng trống rộng để ký tay.
        { text: 'PHÓ TRƯỞNG CÔNG AN PHƯỜNG', bold: true, after: 720 },
        { text: 'Trung tá Trương Thành Trung', bold: true, after: 40 }
      ]
    },
    {
      keywords: ['Xác nhận của Sở Nội vụ'],
      lines: [
        { text: 'Khánh Hòa, ngày …… tháng …… năm 2026', italic: true },
        { text: 'Xác nhận của Sở Nội vụ' },
        { text: 'nội dung khai trên bản khai là đúng.' },
        // Chừa khoảng trống ký tay trước khi ghi họ tên/chức danh.
        { text: 'GIÁM ĐỐC', bold: true, after: 720 }
      ]
    }
  ];
  // Quan trọng: thay trực tiếp NỘI DUNG TRONG Ô đang có của mẫu,
  // không xóa ô rồi chèn xuống cuối tài liệu. Nhờ vậy bố cục 2 ô phía trên
  // và ô Sở Nội vụ ở giữa phía dưới được giữ nguyên như mẫu gốc.
  const cells = body.getElementsByTagName('w:tc');
  const used = new Set();
  const matchedCells = [];

  for (const block of blocks) {
    for (let i = 0; i < cells.length; i++) {
      if (used.has(i)) continue;
      const cell = cells[i];
      const text = Array.from(cell.getElementsByTagName('w:t'))
        .map(t => t.textContent || '')
        .join('')
        .replace(/\\s+/g, ' ')
        .trim();

      if (block.keywords.some(keyword => text.includes(keyword))) {
        replaceCell(cell, block.lines);
        used.add(i);
        matchedCells.push(cell);
        break;
      }
    }
  }

  // Đảm bảo hai ô xác nhận trên cùng hàng chiếm hai nửa bằng nhau.
  // Chỉ cập nhật cột UBND/Công an; khu vực Sở Nội vụ phía dưới không đổi.
  const [ubndCell, policeCell] = matchedCells;
  if (ubndCell && policeCell && ubndCell.parentNode === policeCell.parentNode) {
    const row = ubndCell.parentNode;
    const rowCells = Array.from(row.childNodes).filter(node => node.nodeName === 'w:tc');
    const getCellWidth = (cell) => {
      const tcPr = Array.from(cell.childNodes).find(node => node.nodeName === 'w:tcPr');
      const tcW = tcPr && Array.from(tcPr.childNodes).find(node => node.nodeName === 'w:tcW');
      return Number(tcW?.getAttribute('w:w')) || 0;
    };
    const totalWidth = getCellWidth(ubndCell) + getCellWidth(policeCell);
    if (totalWidth > 0) {
      const equalWidth = String(Math.round(totalWidth / 2));
      for (const cell of [ubndCell, policeCell]) {
        let tcPr = Array.from(cell.childNodes).find(node => node.nodeName === 'w:tcPr');
        if (!tcPr) {
          tcPr = doc.createElementNS(W, 'w:tcPr');
          cell.insertBefore(tcPr, cell.firstChild);
        }
        let tcW = Array.from(tcPr.childNodes).find(node => node.nodeName === 'w:tcW');
        if (!tcW) {
          tcW = doc.createElementNS(W, 'w:tcW');
          tcPr.insertBefore(tcW, tcPr.firstChild);
        }
        tcW.setAttribute('w:w', equalWidth);
        tcW.setAttribute('w:type', 'dxa');
      }

      // Đồng bộ lưới cột của bảng nếu bảng chỉ có hai cột xác nhận.
      const table = row.parentNode;
      const grid = Array.from(table.childNodes).find(node => node.nodeName === 'w:tblGrid');
      const gridCols = grid && Array.from(grid.childNodes).filter(node => node.nodeName === 'w:gridCol');
      if (rowCells.length === 2 && gridCols?.length === 2) {
        const gridTotal = gridCols.reduce((sum, col) => sum + (Number(col.getAttribute('w:w')) || 0), 0);
        if (gridTotal > 0) {
          const gridHalf = String(Math.round(gridTotal / 2));
          gridCols.forEach(col => col.setAttribute('w:w', gridHalf));
        }
      }
    }
  }

  // Fallback cho mẫu cũ không đặt khu vực xác nhận trong bảng:
  // thay ngay tại các paragraph chứa tiêu đề, thay vì append ở cuối.
  const remaining = blocks.filter((_, idx) => !Array.from(used).some(i => i === idx));
  if (remaining.length) {
    const paragraphs = body.getElementsByTagName('w:p');
    for (const block of remaining) {
      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const text = Array.from(p.getElementsByTagName('w:t'))
          .map(t => t.textContent || '')
          .join('')
          .replace(/\\s+/g, ' ')
          .trim();
        if (!text.includes(block.keyword)) continue;

        const parent = p.parentNode;
        if (!parent) continue;

        const old = [];
        for (let j = 0; j < parent.childNodes.length; j++) {
          const node = parent.childNodes[j];
          if (node.nodeName === 'w:p') old.push(node);
        }
        const startIndex = old.indexOf(p);
        old.slice(startIndex, Math.min(startIndex + block.lines.length, old.length))
          .forEach(node => parent.removeChild(node));

        let anchor = p;
        for (const line of block.lines) {
          const np = makeParagraph(line.text, line);
          parent.insertBefore(np, anchor);
        }
        break;
      }
    }
  }
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

  const repIssueDate = data.rep_issue_date || data.ngayCapCCCD || data['Ngày cấp'] || '......';
  const repIssuePlace = data.rep_issue_place || data.noiCapCCCD || data['Nơi cấp'] || '......';
  if (data.rep_id || repIssueDate || repIssuePlace) {
    setParagraphText(doc, paragraphs[6], `Số ĐDCN: ${data.rep_id || '............'}; Ngày cấp: ${repIssueDate}; Nơi cấp: ${repIssuePlace}`);
  }
  if (data.martyr_name || data.martyr_alias) {
    setParagraphText(doc, paragraphs[13], `Họ và tên liệt sĩ: ${data.martyr_name || ''}; Bí danh: ${data.martyr_alias || ''}`);
  }

  const hasDecisionInfo = data.certificate_no || data.decision_no || data.decision_date;
  if (hasDecisionInfo) {
    const decisionLine = `Bằng Tổ quốc ghi công số: ${data.certificate_no || '...........'}; Quyết định số: ${data.decision_no || '...........'}; ${formatVietnameseDecisionDate(data.decision_date)} của Thủ tướng Chính phủ.`;
    setParagraphText(doc, paragraphs[21], decisionLine);
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

  applyConfirmationBlock(doc, body);

  const serializer = new XMLSerializer();
  const newXml = serializer.serializeToString(doc);
  zip.file('word/document.xml', newXml);
  return await zip.generateAsync({ type: 'nodebuffer' });
}

async function fillDocumentM01(data) {
  const buf = fs.readFileSync(templatePathM01);
  const zip = await JSZip.loadAsync(buf);
  const xmlStr = await zip.file('word/document.xml').async('text');
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, 'application/xml');
  const body = doc.getElementsByTagName('w:body')[0];

  const paragraphs = [];
  for (let i = 0; i < body.childNodes.length; i++) {
    const node = body.childNodes[i];
    if (node.nodeName === 'w:p') paragraphs.push(node);
  }

  function formatLine(p, formattedText) {
    if (!p) return;
    const pPr = p.getElementsByTagName('w:pPr')[0];
    const firstR = p.getElementsByTagName('w:r')[0];
    let rPr = null;
    if (firstR) {
      const existingRpr = firstR.getElementsByTagName('w:rPr')[0];
      if (existingRpr) rPr = existingRpr.cloneNode(true);
    }
    const toRemove = [];
    for (let c = p.firstChild; c; c = c.nextSibling) {
      if (c !== pPr) toRemove.push(c);
    }
    toRemove.forEach(c => p.removeChild(c));

    const r = doc.createElement('w:r');
    if (rPr) r.appendChild(rPr);
    const t = doc.createElement('w:t');
    t.setAttribute('xml:space', 'preserve');
    t.textContent = formattedText;
    r.appendChild(t);
    p.appendChild(r);
  }

  // 1. Thông tin người đại diện thân nhân hoặc hưởng trợ cấp thờ cúng liệt sĩ
  if (paragraphs[4]) formatLine(paragraphs[4], `Họ và tên: ${data.rep_name || ''}`);
  if (paragraphs[5]) formatLine(paragraphs[5], `Ngày tháng năm sinh: ${data.rep_dob || ''}; Giới tính: ${data.rep_gender || ''}`);
  if (paragraphs[6]) formatLine(paragraphs[6], `Số ĐDCN: ${data.rep_id || '............'}; Ngày cấp: ${data.rep_issue_date || data.ngayCapCCCD || data['Ngày cấp'] || '......'}; Nơi cấp: ${data.rep_issue_place || data.noiCapCCCD || data['Nơi cấp'] || '......'}`);
  if (paragraphs[7]) formatLine(paragraphs[7], `Quê quán: ${data.rep_hometown || ''}`);
  if (paragraphs[8]) formatLine(paragraphs[8], `Nơi thường trú: ${data.rep_address || ''}`);
  if (paragraphs[9]) formatLine(paragraphs[9], `Số điện thoại: ${data.rep_phone || ''}`);

  // 2. Thông tin về liệt sĩ
  if (paragraphs[11]) formatLine(paragraphs[11], `Mã số hồ sơ liệt sĩ: ${data.file_id || ''}`);
  if (paragraphs[12]) formatLine(paragraphs[12], `Mã hồ sơ Bộ quản lý: ${data.ministry_file || ''}   Mã hồ sơ tỉnh quản lý: ${data.province_file || ''}`);
  if (paragraphs[13]) formatLine(paragraphs[13], `Họ và tên liệt sĩ: ${data.martyr_name || ''}; Bí danh: ${data.martyr_alias || ''}`);
  if (paragraphs[14]) formatLine(paragraphs[14], `Ngày tháng năm sinh: ${data.martyr_dob || ''}; Giới tính: ${data.martyr_gender || ''}`);
  if (paragraphs[15]) formatLine(paragraphs[15], `Quê quán: ${data.martyr_hometown || ''}`);
  if (paragraphs[16]) formatLine(paragraphs[16], `Cấp bậc, chức vụ khi hy sinh: ${data.martyr_rank || ''}`);
  if (paragraphs[17]) formatLine(paragraphs[17], `Cơ quan, đơn vị khi hy sinh: ${data.martyr_unit || ''}`);
  if (paragraphs[18]) formatLine(paragraphs[18], `Ngày tháng năm hy sinh: ${data.martyr_death_date || ''}`);
  if (paragraphs[19]) formatLine(paragraphs[19], `Nơi hy sinh (nếu có): ${data.martyr_death_place || ''}`);
  if (paragraphs[20]) formatLine(paragraphs[20], `Nơi an táng ban đầu: ${data.burial_place || ''}`);

  const certDateStr = formatVietnameseDecisionDate(data.decision_date);
  if (paragraphs[21]) formatLine(paragraphs[21], `Bằng Tổ quốc ghi công số: ${data.certificate_no || '...........'}; Quyết định số: ${data.decision_no || '...........'}; ${certDateStr} của Thủ tướng Chính phủ.`);
  if (paragraphs[22]) formatLine(paragraphs[22], `Con ông: ${data.father || ''}`);
  if (paragraphs[23]) formatLine(paragraphs[23], `Con bà: ${data.mother || ''}`);
  if (paragraphs[24]) formatLine(paragraphs[24], `Vợ/Chồng: ${data.wife || ''}`);

  // 3. Thông tin phần mộ liệt sĩ đã xác định
  const graveBurialType = (data.grave_burial_type || data.tomb_status || '').trim();
  const isNoRemains = graveBurialType.includes('không có');
  if (paragraphs[25]) {
    formatLine(paragraphs[25], `Thông tin về phần mộ liệt sĩ:   ${isNoRemains ? '[  ]' : '[X]'} Mộ có hài cốt liệt sĩ      ${isNoRemains ? '[X]' : '[  ]'} Mộ không có hài cốt liệt sĩ`);
  }

  const cemName = (data.grave_cemetery_name || data.cemetery_name || '').trim();
  if (paragraphs[26]) formatLine(paragraphs[26], `Tên nghĩa trang: ${cemName}`);

  const cemType = (data.cemetery_type || '').trim();
  const isOtherCem = cemType.includes('Ngoài');
  if (paragraphs[27]) {
    formatLine(paragraphs[27], `   ${isOtherCem ? '[  ]' : '[X]'} Nghĩa trang liệt sĩ                                                                  ${isOtherCem ? '[X]' : '[  ]'} Ngoài nghĩa trang liệt sĩ`);
  }

  const cemAddress = (data.cemetery_address || [data.grave_commune, data.grave_district, data.grave_province].filter(Boolean).join(', ') || '').trim();
  if (paragraphs[28]) formatLine(paragraphs[28], `Nghĩa trang thuộc tỉnh/thành phố (ghi rõ địa chỉ chi tiết, xã, huyện, tỉnh): ${cemAddress}`);

  const exhPlace = (data.exhumation_place || '').trim();
  if (paragraphs[30]) formatLine(paragraphs[30], `Địa điểm quy tập hoặc an táng hài cốt trước khi tiếp nhận: ${exhPlace}`);

  const exhUnit = (data.exhumation_unit || '').trim();
  if (paragraphs[31]) formatLine(paragraphs[31], `Đơn vị quy tập hoặc an táng hài cốt trước khi tiếp nhận: ${exhUnit}`);

  const burialDate = (data.cemetery_burial_date || '').trim();
  if (paragraphs[32]) formatLine(paragraphs[32], `Thời gian đưa vào an táng trong nghĩa trang liệt sĩ: ${burialDate}`);

  const gravePos = (data.grave_position || [
    data.grave_number ? 'Số mộ: ' + data.grave_number : '',
    data.grave_row ? 'Hàng: ' + data.grave_row : '',
    data.grave_plot ? 'Lô: ' + data.grave_plot : '',
    data.grave_area ? 'Khu: ' + data.grave_area : ''
  ].filter(Boolean).join(', ') || '').trim();
  if (paragraphs[33]) {
    formatLine(paragraphs[33], `Vị trí mộ trong nghĩa trang liệt sĩ: ${gravePos || 'Số mộ...., hàng......., lô...., khu .......................................'}`);
  }

  applyConfirmationBlock(doc, body);

  const serializer = new XMLSerializer();
  const newXml = serializer.serializeToString(doc);
  zip.file('word/document.xml', newXml);
  return await zip.generateAsync({ type: 'nodebuffer' });
}

// Generate Word document route
app.post('/api/generate', async (req, res) => {
  try {
    const data = req.body || {};
    const isM01 = data.form_type === 'm01' || data.loaiPhieu === 'Mẫu 01';
    const content = isM01 ? await fillDocumentM01(data) : await fillDocument(data);
    const prefix = isM01 ? 'Phieu_khao_sat_liet_si_Mau_01' : 'Phieu_khao_sat_liet_si_Mau_02';
    const asciiName = (data.martyr_name || 'LS')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${prefix}_${asciiName}.docx`;
    const encodedFilename = encodeURIComponent(`${prefix}_${(data.martyr_name || 'LS')}.docx`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Length', content.length);
    res.send(content);
  } catch (err) {
    console.error('Error generating document:', err);
    res.status(500).json({ error: err.message });
  }
});

const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDJfEZo5tYBS4emSeQfAL8XbS8OSE4a26P8FEUnVRd9af4LKhFZlhI1a4gyyygcAE/exec';
const DEFAULT_SUPABASE_URL = 'https://zyvckivbwwlhmpkbonze.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_1ojllrmwxQSMPZWtO6VBqw_5oygalyC';

async function getStaffFromToken(token) {
  if (!token) return null;
  const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  try {
    const userRes = await fetch(supabaseUrl + '/auth/v1/user', {
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + token
      }
    });
    if (!userRes.ok) return null;
    const user = await userRes.json();

    const profileRes = await fetch(
      supabaseUrl + '/rest/v1/staff_profiles?select=user_id,role,active,full_name&user_id=eq.' +
      encodeURIComponent(user.id) + '&limit=1',
      {
        headers: {
          apikey: key,
          Authorization: 'Bearer ' + (process.env.SUPABASE_SERVICE_ROLE_KEY || token)
        }
      }
    );
    const profiles = profileRes.ok ? await profileRes.json() : [];
    const profile = profiles[0] || { user_id: user.id, role: 'staff', active: true };
    return { user, profile };
  } catch (err) {
    console.warn('getStaffFromToken error:', err.message);
    return null;
  }
}

// Endpoint to test connection to Google Apps Script / Google Sheets
app.all('/api/test-connection', async (req, res) => {
  try {
    const appsScriptUrl = ((req.method === 'POST' ? req.body?.appsScriptUrl : req.query?.appsScriptUrl) || '').trim() || DEFAULT_APPS_SCRIPT_URL;

    if (!appsScriptUrl.startsWith('https://script.google.com/macros/s/')) {
      return res.status(400).json({
        ok: false,
        error: 'Đường dẫn Google Apps Script không hợp lệ (phải bắt đầu bằng https://script.google.com/macros/s/...)'
      });
    }

    const testUrl = appsScriptUrl + (appsScriptUrl.includes('?') ? '&' : '?') + 'action=list';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const googleRes = await fetch(testUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

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

    let parsed = null;
    try { parsed = JSON.parse(responseText); } catch (e) {}

    if (parsed && parsed.ok !== false) {
      const count = parsed.total !== undefined ? parsed.total : (Array.isArray(parsed.records) ? parsed.records.length : 0);
      return res.json({
        ok: true,
        message: `Đã kết nối thành công tới Google Sheets (hiện có ${count} phiếu trong trang tính).`,
        total: count
      });
    }

    if (googleRes.ok) {
      return res.json({
        ok: true,
        message: 'Kết nối thành công tới Google Apps Script.'
      });
    }

    return res.status(googleRes.status).json({
      ok: false,
      error: parsed?.error || `Google Apps Script trả về lỗi HTTP ${googleRes.status}`
    });
  } catch (err) {
    console.error('Test connection error:', err);
    return res.status(500).json({
      ok: false,
      error: (err.name === 'AbortError') ? 'Kết nối tới Google Apps Script quá thời gian (hơn 20 giây).' : ('Lỗi khi kết nối: ' + err.message)
    });
  }
});

// Proxy endpoint to save to Google Sheets via Google Apps Script (and optional Supabase)
app.post('/api/save-sheet', async (req, res) => {
  try {
    const payload = req.body || {};

    // Bypass auth for test ping requests
    if (payload.record_id === 'TEST-PING' || payload.isTest) {
      return res.json({ ok: true, message: 'Kết nối máy chủ thành công' });
    }

    const authorization = req.headers.authorization || '';
    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      const staff = await getStaffFromToken(token);
      if (staff && staff.profile && staff.profile.role !== 'admin') {
        const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
        try {
          const linksRes = await fetch(supabaseUrl + '/rest/v1/staff_to_dan_pho?select=to_dan_pho_id,to_dan_pho(name)&staff_id=eq.' + encodeURIComponent(staff.user.id), {
            headers: { apikey: key, Authorization: 'Bearer ' + (process.env.SUPABASE_SERVICE_ROLE_KEY || token) }
          });
          const links = linksRes.ok ? await linksRes.json() : [];
          const names = links.map(x => x.to_dan_pho && x.to_dan_pho.name).filter(Boolean);
          const nums = names.map(n => (String(n).match(/\d+/) || [])[0]).filter(Boolean);
          if (nums.length > 0) {
            const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const address = norm(payload.rep_address || payload.noiThuongTruNDD || '');
            const allowed = nums.some(n => new RegExp('\\bto\\s*dan\\s*pho\\s*' + n + '\\b').test(address));
            if (!allowed) {
              return res.status(403).json({ ok: false, error: 'Chỉ được lưu phiếu có nơi thường trú thuộc Tổ dân phố được phân công.' });
            }
          }
        } catch (terrErr) {
          console.warn('Territory check error:', terrErr.message);
        }
      }
    }

    const appsScriptUrl = (payload.appsScriptUrl || '').trim() || DEFAULT_APPS_SCRIPT_URL;

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
      file_id: payload.file_id || '',
      form_type: payload.form_type || '',
      loaiPhieu: payload.loaiPhieu || ''
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
    const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (supabaseUrl && serviceKey) {
      try {
        const recordId = payload.record_id || payload.file_id || ('LS02-' + Date.now());
        const supabaseEndpoint = `${supabaseUrl}/rest/v1/m02_records?on_conflict=record_id`;
        await fetch(supabaseEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
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

    const staff = await getStaffFromToken(token);
    if (!staff || !staff.profile.active || (requiredRole && staff.profile.role !== requiredRole)) {
      res.status(403).json({ ok: false, error: 'Tài khoản không có quyền thực hiện thao tác này hoặc phiên đăng nhập không hợp lệ.' });
      return null;
    }
    return staff;
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
  const appsScriptUrl = (req.query.appsScriptUrl || '').trim() || DEFAULT_APPS_SCRIPT_URL;

  // Hợp nhất cả Mẫu 02 (Supabase) và Mẫu 01 (Google Sheets M01).
  // Khóa có loại mẫu để không ghi đè hai phiếu cùng mã hồ sơ nhưng khác mẫu.
  const adminRecordKey = r => {
    const d = r && r.data && typeof r.data === 'object' ? r.data : {};
    const isM01 = r.form_type === 'm01' || r.loaiPhieu === 'Mẫu 01' ||
      d.form_type === 'm01' || d.loaiPhieu === 'Mẫu 01' ||
      !!d.grave_cemetery_name || !!d.cemetery_address || !!d.exhumation_place || !!d.grave_position;
    const identity = String(r.record_id || d.record_id || r.file_id || d.file_id || r.martyr_name || d.martyr_name || '').trim();
    return identity ? (isM01 ? 'm01::' : 'm02::') + identity : '';
  };
  const merged = new Map();
  let googleAppsScriptDiagnostic = null;

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      let queryUrl = process.env.SUPABASE_URL.replace(/\/+$/, '') +
        '/rest/v1/m02_records?select=*&order=updated_at.desc&limit=500';
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
        const dbRecords = await dbRes.json();
        for (const r of (dbRecords || [])) {
          const key = adminRecordKey(r);
          if (!key) continue;
          merged.set(key, {
            ...r,
            form_type: r.form_type || 'm02',
            loaiPhieu: r.loaiPhieu || 'Mẫu 02'
          });
        }
      }
    } catch (e) {
      console.warn('Admin Supabase query error, continue with Sheets:', e.message);
    }
  }

  if (appsScriptUrl && appsScriptUrl.startsWith('https://script.google.com/')) {
    try {
      const gRes = await fetch(appsScriptUrl + '?action=list&q=' + encodeURIComponent(q), { redirect: 'follow' });
      if (gRes.ok) {
        const gData = await gRes.json();
        const sheetRecords = Array.isArray(gData.records) ? gData.records : [];
        for (const r of sheetRecords) {
          const key = adminRecordKey(r);
          if (!key) continue;

          const previous = merged.get(key) || {};
          const previousData = previous.data && typeof previous.data === 'object' ? previous.data : {};
          const currentData = r.data && typeof r.data === 'object' ? r.data : {};

          const isM01 = r.form_type === 'm01' ||
            r.loaiPhieu === 'Mẫu 01' ||
            currentData.form_type === 'm01' ||
            currentData.loaiPhieu === 'Mẫu 01';

          merged.set(key, {
            ...previous,
            ...r,
            form_type: isM01 ? 'm01' : (r.form_type || previous.form_type || 'm02'),
            loaiPhieu: isM01 ? 'Mẫu 01' : (r.loaiPhieu || previous.loaiPhieu || 'Mẫu 02'),
            data: { ...previousData, ...currentData }
          });
        }
        // Khi endpoint đọc dữ liệu trả về 0 Mẫu 01, gọi endpoint chẩn đoán
        // để biết chính xác workbook/sheet mà Web App đang đọc.
        const hasM01 = sheetRecords.some(r =>
          r.form_type === 'm01' ||
          r.loaiPhieu === 'Mẫu 01' ||
          (r.data && (r.data.form_type === 'm01' || r.data.loaiPhieu === 'Mẫu 01'))
        );
        if (!hasM01) {
          try {
            const dRes = await fetch(appsScriptUrl + '?action=diagnose', { redirect: 'follow' });
            if (dRes.ok) googleAppsScriptDiagnostic = await dRes.json();
          } catch (diagnoseErr) {
            console.warn('Apps Script diagnostic error:', diagnoseErr.message);
          }
        }
      } else {
        console.warn('Admin Apps Script returned HTTP ' + gRes.status);
      }
    } catch (e) {
      console.warn('Admin Apps Script query error:', e.message);
    }
  }

  let records = Array.from(merged.values());

  // Chuẩn hóa các trường chính để giao hồ sơ và phân loại theo nơi thường trú hoạt động
  // cho cả Mẫu 01 lẫn Mẫu 02.
  records = records.map(r => {
    const d = r.data && typeof r.data === 'object' ? r.data : {};
    const isM01 = r.form_type === 'm01' || r.loaiPhieu === 'Mẫu 01' || d.form_type === 'm01' || d.loaiPhieu === 'Mẫu 01' || String(r.record_id || '').toUpperCase().includes('M01') || String(r.file_id || '').toUpperCase().includes('M01') || !!d.grave_cemetery_name || !!d.cemetery_address || !!d.exhumation_place || !!d.grave_position;
    return {
      ...r,
      form_type: isM01 ? 'm01' : 'm02',
      loaiPhieu: isM01 ? 'Mẫu 01' : 'Mẫu 02',
      record_id: r.record_id || d.record_id || r.file_id || d.file_id || '',
      martyr_name: r.martyr_name || d.martyr_name || d['Họ tên liệt sĩ'] || '',
      file_id: r.file_id || d.file_id || d['Mã số hồ sơ liệt sĩ'] || '',
      rep_name: r.rep_name || d.rep_name || d['Họ tên người đại diện'] || '',
      rep_phone: r.rep_phone || d.rep_phone || d['Số điện thoại NĐD'] || '',
      rep_address: r.rep_address || d.rep_address || d.noiThuongTruNDD || d['Nơi thường trú NĐD'] || '',
      data: {
        ...d,
        form_type: isM01 ? 'm01' : 'm02',
        loaiPhieu: isM01 ? 'Mẫu 01' : 'Mẫu 02'
      }
    };
  });

  return res.json({
    ok: true,
    total: records.length,
    records,
    google_apps_script_diagnostic: googleAppsScriptDiagnostic
  });
});

// Admin endpoints to view and manage to_dan_pho
app.get('/api/admin/to-dan-pho', async (req, res) => {
  const staff = await requireStaff(req, res, 'admin');
  if (!staff) return;

  const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || req.headers.authorization?.replace(/^Bearer\s+/i, '') || DEFAULT_SUPABASE_KEY;

  try {
    const listRes = await fetch(supabaseUrl + '/rest/v1/to_dan_pho?select=*&order=id', {
      headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey }
    });
    if (!listRes.ok) {
      return res.status(500).json({ ok: false, error: 'Không đọc được danh sách tổ dân phố.' });
    }
    const data = await listRes.json();
    return res.json({ ok: true, data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/admin/to-dan-pho/update', async (req, res) => {
  const staff = await requireStaff(req, res, 'admin');
  if (!staff) return;

  const { id, name } = req.body || {};
  if (!id || !name || !String(name).trim()) {
    return res.status(400).json({ ok: false, error: 'Thiếu mã (ID) hoặc tên tổ dân phố.' });
  }

  const cleanName = String(name).trim();
  const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || req.headers.authorization?.replace(/^Bearer\s+/i, '') || DEFAULT_SUPABASE_KEY;

  try {
    const updateRes = await fetch(supabaseUrl + '/rest/v1/to_dan_pho?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ name: cleanName, updated_at: new Date().toISOString() })
    });
    if (!updateRes.ok) {
      const err = await updateRes.text();
      return res.status(updateRes.status).json({ ok: false, error: err || 'Không thể cập nhật tổ dân phố.' });
    }
    const data = await updateRes.json();
    return res.json({ ok: true, data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/admin/to-dan-pho/format-two-digits', async (req, res) => {
  const staff = await requireStaff(req, res, 'admin');
  if (!staff) return;

  const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || req.headers.authorization?.replace(/^Bearer\s+/i, '') || DEFAULT_SUPABASE_KEY;

  try {
    const listRes = await fetch(supabaseUrl + '/rest/v1/to_dan_pho?select=id,name&order=id', {
      headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey }
    });
    if (!listRes.ok) {
      return res.status(500).json({ ok: false, error: 'Không đọc được danh sách tổ dân phố.' });
    }
    const list = await listRes.json();
    let updatedCount = 0;
    for (const item of list) {
      const numMatch = String(item.name || '').match(/\d+/);
      if (numMatch && numMatch[0].length === 1) {
        const newNum = '0' + numMatch[0];
        const newName = item.name.replace(numMatch[0], newNum);
        await fetch(supabaseUrl + '/rest/v1/to_dan_pho?id=eq.' + encodeURIComponent(item.id), {
          method: 'PATCH',
          headers: {
            'apikey': serviceKey,
            'Authorization': 'Bearer ' + serviceKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: newName, updated_at: new Date().toISOString() })
        });
        updatedCount++;
      }
    }
    return res.json({
      ok: true,
      updatedCount,
      message: `Đã chuẩn hóa ${updatedCount} tổ dân phố sang định dạng 2 chữ số (01-09).`
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// Endpoint to search or list records
app.get('/api/records', async (req, res) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  let staff = null;
  if (token) {
    staff = await getStaffFromToken(token);
  }

  const q = (req.query.q || '').trim().toLowerCase();
  const appsScriptUrl = (req.query.appsScriptUrl || '').trim() || DEFAULT_APPS_SCRIPT_URL;
  let records = [];
  const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

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

  // Mẫu 01 đang có các mã phiếu bị trùng nhau trong Sheet. Không gộp theo mã phiếu,
  // vì cách đó làm mất dòng mới/đầy đủ khi có hai dòng trùng mã.
  const isM01Record = r => {
    const d = r && r.data && typeof r.data === 'object' ? r.data : {};
    return String(r.form_type || d.form_type || '').toLowerCase() === 'm01' ||
      String(r.loaiPhieu || d.loaiPhieu || '') === 'Mẫu 01' ||
      !!d.grave_cemetery_name || !!d.cemetery_address || !!d.exhumation_place || !!d.grave_position;
  };
  const recordIdentity = r => {
    const d = r && r.data && typeof r.data === 'object' ? r.data : {};
    return String(r.record_id || d.record_id || r.maPhieu || d.maPhieu || r.file_id || d.file_id || '').trim();
  };
  const m01IdentityCounts = new Map();
  for (const r of sheetRecords) {
    if (!isM01Record(r)) continue;
    const identity = recordIdentity(r);
    if (identity) m01IdentityCounts.set(identity, (m01IdentityCounts.get(identity) || 0) + 1);
  }
  const duplicateM01Ids = new Set([...m01IdentityCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id));
  let m01Ordinal = 0;
  sheetRecords = sheetRecords.map(r => {
    if (!isM01Record(r)) return r;
    const d = r && r.data && typeof r.data === 'object' ? r.data : {};
    m01Ordinal++;
    const sheetRow = Number(r.m01_sheet_row || d.m01_sheet_row) || (m01Ordinal + 1);
    const identity = recordIdentity(r);
    const isDuplicateId = !!identity && duplicateM01Ids.has(identity);
    return {
      ...r,
      m01_sheet_row: sheetRow,
      m01_duplicate_id: isDuplicateId,
      source_record_id: identity,
      data: { ...d, m01_sheet_row: sheetRow, m01_duplicate_id: isDuplicateId, source_record_id: identity }
    };
  });

  // Dùng số dòng làm khóa cho Mẫu 01 trùng mã, giữ cả hai dòng.
  const mergeRecordKey = r => {
    const d = r && r.data && typeof r.data === 'object' ? r.data : {};
    const isM01 = isM01Record(r);
    const identity = recordIdentity(r);
    const row = Number(r.m01_sheet_row || d.m01_sheet_row || 0);
    if (isM01 && (r.m01_duplicate_id || d.m01_duplicate_id) && row >= 2) return 'm01::row:' + row;
    return identity ? (isM01 ? 'm01::' : 'm02::') + identity : '';
  };
  const merged = new Map();
  for (const r of sheetRecords) {
    const key = mergeRecordKey(r);
    if (key) merged.set(key, { ...r, data: r.data && typeof r.data === 'object' ? { ...r.data } : r.data });
  }
  for (const r of records) {
    const identity = recordIdentity(r);
    // Một bản ghi DB trùng mã không xác định được nó thuộc dòng M01 nào; nguồn chuẩn là Sheet.
    if (isM01Record(r) && identity && duplicateM01Ids.has(identity)) continue;
    const key = mergeRecordKey(r);
    if (!key) continue;
    const previous = merged.get(key) || {};
    const previousData = previous.data && typeof previous.data === 'object' ? previous.data : {};
    const currentData = r.data && typeof r.data === 'object' ? r.data : {};
    merged.set(key, { ...previous, ...r, data: { ...previousData, ...currentData } });
  }
  records = Array.from(merged.values());

  records = records.map(r => {
    const d = r.data && typeof r.data === 'object' ? r.data : {};
    const isM01 = r.form_type === 'm01' || r.loaiPhieu === 'Mẫu 01' || d.form_type === 'm01' || d.loaiPhieu === 'Mẫu 01' || String(r.record_id || '').toUpperCase().includes('M01') || String(r.file_id || '').toUpperCase().includes('M01') || !!d.grave_cemetery_name || !!d.cemetery_address || !!d.exhumation_place || !!d.grave_position;
    return {
      ...r,
      form_type: isM01 ? 'm01' : 'm02',
      loaiPhieu: isM01 ? 'Mẫu 01' : 'Mẫu 02',
      record_id: r.record_id || d.record_id || r.file_id || d.file_id || '',
      martyr_name: r.martyr_name || d.martyr_name || d['Họ tên liệt sĩ'] || '',
      file_id: r.file_id || d.file_id || d['Mã số hồ sơ liệt sĩ'] || '',
      rep_name: r.rep_name || d.rep_name || d['Họ tên người đại diện'] || '',
      rep_phone: r.rep_phone || d.rep_phone || d['Số điện thoại NĐD'] || '',
      rep_address: r.rep_address || d.rep_address || d.noiThuongTruNDD || d['Nơi thường trú NĐD'] || '',
      data: {
        ...d,
        form_type: isM01 ? 'm01' : 'm02',
        loaiPhieu: isM01 ? 'Mẫu 01' : 'Mẫu 02'
      }
    };
  });

  const qTerritories = (req.query.territories || '').split(',').map(s => s.trim()).filter(Boolean);
  const isTerritoryRestricted = (staff && staff.profile && staff.profile.role !== 'admin') || qTerritories.length > 0;

  if (isTerritoryRestricted) {
    let ids = [];
    if (staff && staff.user && staff.user.id) {
      const headers = { apikey: serviceKey, Authorization: 'Bearer ' + (process.env.SUPABASE_SERVICE_ROLE_KEY || token) };
      const linksUrl = supabaseUrl + '/rest/v1/staff_to_dan_pho?select=to_dan_pho_id&staff_id=eq.' +
        encodeURIComponent(staff.user.id);
      try {
        const linksRes = await fetch(linksUrl, { headers });
        if (linksRes.ok) {
          const links = await linksRes.json();
          ids = [...new Set((links || []).map(x => String(x.to_dan_pho_id || '').trim()).filter(Boolean))];
        }
      } catch (e) {
        console.warn('Error loading staff territory assignments:', e.message);
      }
    }

    if (!ids.length && !qTerritories.length) {
      return res.json({ ok: true, records: [], message: 'Tài khoản chưa được gán tổ dân phố.' });
    }

    let names = [];
    if (ids.length) {
      const idFilter = ids.map(id => '"' + id.replace(/"/g, '') + '"').join(',');
      try {
        const territoryRes = await fetch(
          supabaseUrl + '/rest/v1/to_dan_pho?select=id,name&id=in.(' + encodeURIComponent(idFilter) + ')',
          { headers }
        );
        if (territoryRes.ok) {
          const territories = await territoryRes.json();
          names = (territories || []).map(x => x.name).filter(Boolean);
        }
      } catch (_) {}

      if (!names.length) {
        names = ids.map(id => 'Tổ dân phố ' + id);
      }
    }
    if (qTerritories.length) {
      names = [...new Set([...names, ...qTerritories])];
    }

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
      const addresses = [];
      [
        d.rep_address, d.noiThuongTruNDD, d['Nơi thường trú NĐD'], d['Nơi thường trú người đại diện'], d['Nơi thường trú'],
        r.rep_address, r.noiThuongTruNDD, r['Nơi thường trú NĐD'], r['Nơi thường trú người đại diện'], r['Nơi thường trú'], r.address
      ].forEach(a => { if (a) addresses.push(a); });

      const rels = d.relatives || r.relatives;
      if (Array.isArray(rels)) {
        rels.forEach(rel => {
          if (rel && typeof rel === 'object') {
            if (rel.address) addresses.push(rel.address);
            if (rel.noiThuongTru) addresses.push(rel.noiThuongTru);
          }
        });
      }

      const combined = addresses.map(normalize).join(' ');
      if (!combined) return false;

      const numMatch = nums.some(n => {
        const intVal = parseInt(n, 10);
        return new RegExp('(?:^|\\s)(?:to\\s*dan\\s*pho|tdp|to|khom)(?:\\s*so)?\\s*0?' + intVal + '(?:\\s|$|[,.])').test(combined);
      });
      if (numMatch) return true;

      return names.some(t => {
        const nt = normalize(t);
        return nt && combined.includes(nt);
      });
    });
  }
  let appsScriptDiagnostic = null;
  if (appsScriptUrl && appsScriptUrl.startsWith('https://script.google.com/')) {
    try {
      const dRes = await fetch(appsScriptUrl + '?action=diagnose', { redirect: 'follow' });
      if (dRes.ok) appsScriptDiagnostic = await dRes.json();
    } catch (e) {
      console.warn('Apps Script diagnostic query error:', e.message);
    }
  }
  return res.json({ ok: true, records, apps_script_diagnostic: appsScriptDiagnostic });
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