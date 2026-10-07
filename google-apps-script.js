/**
 * GOOGLE APPS SCRIPT – PHIẾU KHẢO SÁT LIỆT SĨ (MẪU 02)
 *
 * Lưu đúng cấu trúc workbook:
 *   1) "Thông tin khảo sát"  : 30 cột
 *   2) "Thân nhân họ ngoại"   : 12 cột
 *
 * Không ghi dữ liệu thân nhân vào một ô JSON duy nhất.
 * Mỗi thân nhân được lưu thành một dòng ở sheet "Thân nhân họ ngoại".
 */

const SPREADSHEET_ID = '1ysZmp1k2YNeb4P0AculFHmvpNsQ49o9FL-g8Wsk4hNo';
const MAIN_SHEET_NAME = 'Thông tin khảo sát';
const REL_SHEET_NAME = 'Thân nhân họ ngoại';
const TZ = 'Asia/Ho_Chi_Minh';

const MAIN_HEADERS = [
  'Thời gian lưu',
  'Họ tên liệt sĩ',
  'Bí danh',
  'Ngày sinh LS',
  'Giới tính LS',
  'Quê quán LS',
  'Cấp bậc, chức vụ',
  'Cơ quan, đơn vị',
  'Ngày hy sinh',
  'Nơi hy sinh',
  'Nơi an táng ban đầu',
  'Số Bằng TQGC',
  'Quyết định số',
  'Ngày QĐ',
  'Bố liệt sĩ',
  'Mẹ liệt sĩ',
  'Vợ/chồng LS',
  'Mã hồ sơ Bộ',
  'Mã hồ sơ Tỉnh',
  'Mã số hồ sơ LS',
  'Người đại diện',
  'Ngày sinh NĐD',
  'Giới tính NĐD',
  'Số CCCD/ĐDCN',
  'Ngày cấp',
  'Nơi cấp',
  'Quê quán NĐD',
  'Nơi thường trú NĐD',
  'Số điện thoại',
  'Số thân nhân kê khai',
  'Tình trạng thân nhân thuộc diện thu mẫu'
];

const REL_HEADERS = [
  'Thời gian lưu',
  'Họ tên liệt sĩ',
  'STT',
  'Đối tượng ưu tiên',
  'Số ĐDCN/CCCD',
  'Họ và tên',
  'Ngày tháng năm sinh',
  'Giới tính',
  'Họ tên bố',
  'Họ tên mẹ',
  'Nơi thường trú',
  'Trạng thái'
];

const RELATIONSHIPS = [
  'Mẹ đẻ liệt sĩ',
  'Mẹ đẻ của mẹ đẻ liệt sĩ',
  'Anh chị em cùng mẹ đẻ với liệt sĩ',
  'Anh chị em cùng mẹ đẻ của mẹ đẻ liệt sĩ',
  'Anh chị em con của chị gái, em gái mẹ đẻ liệt sĩ',
  'Con của chị gái, em gái liệt sĩ'
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const p = parsePayload_(e);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const main = getOrCreateSheet_(ss, MAIN_SHEET_NAME, MAIN_HEADERS);
    const rel = getOrCreateSheet_(ss, REL_SHEET_NAME, REL_HEADERS);

    const martyrName = clean_(p.martyr_name || p.hoTenLietSi);
    const fileId = clean_(p.file_id || p.martyr_file_id || p.maSoHoSoLS);
    const oldIdentity = findMainRow_(main, martyrName, fileId);

    const oldSavedAt = oldIdentity ? clean_(oldIdentity.savedAt) : '';
    const savedAt = formatNow_();

    const relatives = normalizeRelatives_(p.relatives, martyrName);

    const mainRow = [
      savedAt,
      martyrName,
      clean_(p.martyr_alias || p.biDanh),
      clean_(p.martyr_dob || p.ngaySinh),
      clean_(p.martyr_gender || p.gioiTinhLS),
      clean_(p.martyr_hometown || p.queQuan),
      clean_(p.martyr_rank || p.capBac),
      clean_(p.martyr_unit || p.donVi),
      clean_(p.martyr_death_date || p.ngayHySinh),
      clean_(p.martyr_death_place || p.noiHySinh),
      clean_(p.burial_place || p.noiAnTang),
      clean_(p.certificate_no || p.soBangTQGC),
      clean_(p.decision_no || p.soQuyetDinh),
      clean_(p.decision_date || p.ngayQuyetDinh),
      clean_(p.father || p.hoTenBo),
      clean_(p.mother || p.hoTenMe),
      clean_(p.wife || p.hoTenVo),
      clean_(p.ministry_file || p.maBoQuanLy),
      clean_(p.province_file || p.maTinhQuanLy),
      fileId,
      clean_(p.rep_name || p.hoTenNguoiDaiDien),
      clean_(p.rep_dob || p.ngaySinhNDD),
      clean_(p.rep_gender || p.gioiTinhNDD),
      clean_(p.rep_id || p.soCCCD),
      clean_(p.rep_issue_date || p.ngayCapCCCD),
      clean_(p.rep_issue_place || p.noiCapCCCD),
      clean_(p.rep_hometown || p.queQuanNDD),
      clean_(p.rep_address || p.noiThuongTruNDD),
      clean_(p.rep_phone || p.soDienThoai),
      relatives.length,
      normalizeRelativesChoice_(p.has_relatives || p.tinhTrangThanNhan) || (relatives.length > 0 ? 'Có' : 'Không')
    ];

    if (oldIdentity) {
      main.getRange(oldIdentity.row, 1, 1, MAIN_HEADERS.length).setValues([mainRow]);
      if (oldSavedAt) {
        deleteRelatives_(rel, oldSavedAt, martyrName);
      }
    } else {
      main.appendRow(mainRow);
    }

    if (relatives.length) {
      const relRows = relatives.map(function(r, i) {
        return [
          savedAt,
          martyrName,
          i + 1,
          clean_(r.relationship || RELATIONSHIPS[i] || ''),
          clean_(r.id),
          clean_(r.name),
          clean_(r.dob),
          clean_(r.gender),
          clean_(r.father),
          clean_(r.mother),
          clean_(r.address),
          clean_(r.status)
        ];
      });
      rel.getRange(rel.getLastRow() + 1, 1, relRows.length, REL_HEADERS.length).setValues(relRows);
    }

    formatSheets_(main, rel);

    return jsonResponse({
      ok: true,
      action: oldIdentity ? 'updated' : 'inserted',
      record_id: p.record_id || fileId || ('LS02-' + savedAt),
      martyr_name: martyrName,
      relatives_count: relatives.length,
      saved_at: savedAt,
      message: oldIdentity
        ? 'Đã cập nhật phiếu và danh sách thân nhân vào 2 sheet.'
        : 'Đã lưu phiếu và danh sách thân nhân vào 2 sheet.'
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.stack ? err.stack : err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const main = getOrCreateSheet_(ss, MAIN_SHEET_NAME, MAIN_HEADERS);
    const rel = getOrCreateSheet_(ss, REL_SHEET_NAME, REL_HEADERS);

    const q = clean_(e && e.parameter && e.parameter.q).toLowerCase();
    const mainRows = readData_(main, MAIN_HEADERS.length);
    const relRows = readData_(rel, REL_HEADERS.length);

    const relativeMap = {};
    relRows.forEach(function(row) {
      const key = key_(row[0], row[1]); // thời gian lưu + họ tên LS
      if (!relativeMap[key]) relativeMap[key] = [];
      relativeMap[key].push({
        priority: numberOr_(row[2], relativeMap[key].length + 1),
        relationship: clean_(row[3]),
        id: clean_(row[4]),
        name: clean_(row[5]),
        dob: clean_(row[6]),
        gender: clean_(row[7]),
        father: clean_(row[8]),
        mother: clean_(row[9]),
        address: clean_(row[10]),
        status: clean_(row[11])
      });
    });

    const records = [];
    mainRows.forEach(function(row) {
      const rec = rowToRecord_(row);
      const searchText = [
        rec.record_id,
        rec.martyr_name,
        rec.file_id,
        rec.ministry_file,
        rec.province_file,
        rec.rep_name,
        rec.rep_phone
      ].join(' ').toLowerCase();

      if (q && searchText.indexOf(q) === -1) return;

      rec.data = mainRowToFrontend_(row);
      rec.data.record_id = rec.record_id;
      rec.data.relatives = relativeMap[key_(rec.saved_at, rec.martyr_name)] || [];
      records.push(rec);
    });

    return jsonResponse({
      ok: true,
      total: records.length,
      records: records
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.stack ? err.stack : err) });
  }
}

function parsePayload_(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (_) {}
  }
  return (e && e.parameter) || {};
}

function getOrCreateSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    styleHeader_(sheet, headers.length);
    return sheet;
  }

  // Luôn kiểm tra hàng đầu tiên. Nếu thiếu tiêu đề, chèn hàng mới ở đầu
  // để giữ nguyên toàn bộ dữ liệu đang có bên dưới.
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    styleHeader_(sheet, headers.length);
    return sheet;
  }

  const existingCols = Math.max(sheet.getLastColumn(), 0);
  const firstRow = sheet.getRange(1, 1, 1, Math.max(existingCols, headers.length)).getDisplayValues()[0]
    .map(function(v) { return clean_(v); });

  // Nếu các tiêu đề hiện tại là tiền tố của cấu trúc mới, chỉ bổ sung
  // những cột còn thiếu ở bên phải, không chèn thêm một hàng tiêu đề mới.
  const prefixMatches = existingCols > 0 &&
    Math.min(existingCols, headers.length) > 0 &&
    headers.slice(0, Math.min(existingCols, headers.length)).every(function(h, i) {
      return firstRow[i] === h;
    });

  if (prefixMatches && existingCols < headers.length) {
    sheet.getRange(1, existingCols + 1, 1, headers.length - existingCols)
      .setValues([headers.slice(existingCols)]);
  } else {
    const hasExpectedHeader = existingCols === headers.length &&
      headers.every(function(h, i) { return firstRow[i] === h; });

    if (!hasExpectedHeader) {
      // Chỉ chèn hàng mới khi cấu trúc tiêu đề thực sự không tương thích.
      sheet.insertRowBefore(1);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }

  styleHeader_(sheet, headers.length);
  return sheet;
}

function styleHeader_(sheet, width) {
  const r = sheet.getRange(1, 1, 1, width);
  r.setFontWeight('bold');
  r.setBackground('#f1f5f9');
  r.setVerticalAlignment('middle');
}

function formatSheets_(main, rel) {
  main.getRange(1, 1, 1, MAIN_HEADERS.length).setWrap(true);
  rel.getRange(1, 1, 1, REL_HEADERS.length).setWrap(true);
  main.setFrozenRows(1);
  rel.setFrozenRows(1);
}

function readData_(sheet, cols) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, Math.min(cols, sheet.getLastColumn())).getValues();
}

function findMainRow_(sheet, martyrName, fileId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const data = sheet.getRange(2, 1, lastRow - 1, MAIN_HEADERS.length).getValues();
  const fileTarget = clean_(fileId);
  const nameTarget = clean_(martyrName).toLowerCase();

  // Ưu tiên mã số hồ sơ LS vì đây là trường nhận diện ổn định trong Mẫu 02.
  if (fileTarget) {
    for (let i = 0; i < data.length; i++) {
      if (clean_(data[i][19]) === fileTarget) {
        return { row: i + 2, savedAt: data[i][0] };
      }
    }
  }

  // Khi không có mã hồ sơ LS thì dùng họ tên để hỗ trợ bản ghi cũ.
  if (nameTarget) {
    for (let i = 0; i < data.length; i++) {
      if (clean_(data[i][1]).toLowerCase() === nameTarget) {
        return { row: i + 2, savedAt: data[i][0] };
      }
    }
  }

  return null;
}

function deleteRelatives_(sheet, savedAt, martyrName) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  const targetTime = clean_(savedAt);
  const targetName = clean_(martyrName).toLowerCase();
  const rows = [];

  for (let i = 0; i < data.length; i++) {
    if (clean_(data[i][0]) === targetTime &&
        clean_(data[i][1]).toLowerCase() === targetName) {
      rows.push(i + 2);
    }
  }

  rows.reverse().forEach(function(rowNum) {
    sheet.deleteRow(rowNum);
  });
}

function normalizeRelatives_(items, martyrName) {
  if (!Array.isArray(items)) return [];

  return items.filter(function(r) {
    if (!r) return false;
    return clean_(r.name) !== '' || clean_(r.id) !== '';
  }).slice(0, 6).map(function(r, i) {
    return {
      priority: i + 1,
      relationship: clean_(r.relationship || RELATIONSHIPS[i] || ''),
      id: clean_(r.id),
      name: clean_(r.name),
      dob: clean_(r.dob),
      gender: clean_(r.gender),
      father: clean_(r.father),
      mother: clean_(r.mother),
      address: clean_(r.address),
      status: clean_(r.status)
    };
  });
}

function rowToRecord_(row) {
  return {
    record_id: clean_(row[19]) || ('LS02-' + normalizeDate_(row[0]) + '-' + hashKey_(row[1])),
    martyr_name: clean_(row[1]),
    martyr_dob: clean_(row[3]),
    martyr_death_date: clean_(row[8]),
    martyr_hometown: clean_(row[5]),
    file_id: clean_(row[19]),
    ministry_file: clean_(row[17]),
    province_file: clean_(row[18]),
    rep_name: clean_(row[20]),
    rep_phone: clean_(row[28]),
    has_relatives: normalizeRelativesChoice_(row[30]) || (numberOr_(row[29], 0) > 0 ? 'Có' : 'Không'),
    tinhTrangThanNhan: normalizeRelativesChoice_(row[30]) || (numberOr_(row[29], 0) > 0 ? 'Có' : 'Không'),
    saved_at: clean_(row[0]),
    status: 'Mới'
  };
}

function mainRowToFrontend_(row) {
  return {
    record_id: clean_(row[19]) || ('LS02-' + normalizeDate_(row[0]) + '-' + hashKey_(row[1])),
    rep_name: clean_(row[20]),
    rep_dob: clean_(row[21]),
    rep_gender: clean_(row[22]),
    rep_id: clean_(row[23]),
    rep_issue_date: clean_(row[24]),
    rep_issue_place: clean_(row[25]),
    rep_hometown: clean_(row[26]),
    rep_address: clean_(row[27]),
    rep_phone: clean_(row[28]),

    has_relatives: normalizeRelativesChoice_(row[30]) || (numberOr_(row[29], 0) > 0 ? 'Có' : 'Không'),
    tinhTrangThanNhan: normalizeRelativesChoice_(row[30]) || (numberOr_(row[29], 0) > 0 ? 'Có' : 'Không'),

    file_id: clean_(row[19]),
    ministry_file: clean_(row[17]),
    province_file: clean_(row[18]),

    martyr_name: clean_(row[1]),
    martyr_alias: clean_(row[2]),
    martyr_dob: clean_(row[3]),
    martyr_gender: clean_(row[4]),
    martyr_hometown: clean_(row[5]),
    martyr_rank: clean_(row[6]),
    martyr_unit: clean_(row[7]),
    martyr_death_date: clean_(row[8]),
    martyr_death_place: clean_(row[9]),
    burial_place: clean_(row[10]),
    certificate_no: clean_(row[11]),
    decision_no: clean_(row[12]),
    decision_date: clean_(row[13]),
    father: clean_(row[14]),
    mother: clean_(row[15]),
    wife: clean_(row[16]),

    saved_at: clean_(row[0]),
    trangThai: 'Mới'
  };
}

function normalizeRelativesChoice_(value) {
  const s = clean_(value).toLowerCase();
  if (!s) return '';
  if (s === 'có' || s === 'co' || s === 'c') return 'Có';
  if (s === 'không' || s === 'khong' || s === 'k' || s === 'no') return 'Không';
  return clean_(value);
}

function key_(a, b) {
  return clean_(a) + '||' + clean_(b).toLowerCase();
}

function clean_(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function numberOr_(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDate_(v) {
  return clean_(v).replace(/[^0-9]/g, '');
}

function hashKey_(v) {
  const s = clean_(v);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).toUpperCase();
}

function formatNow_() {
  return Utilities.formatDate(new Date(), TZ, 'HH:mm:ss dd/MM/yyyy');
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
