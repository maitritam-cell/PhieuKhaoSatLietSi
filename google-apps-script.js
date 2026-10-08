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
  'Tình trạng thân nhân thuộc diện thu mẫu',
  'Trạng thái phiếu'
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

const M1_SHEET_NAME = 'M01';

const M1_HEADERS = [
  'Thời gian lưu',
  'Mã phiếu Mẫu 01',
  'Họ tên người đại diện',
  'Ngày sinh NĐD',
  'Giới tính NĐD',
  'Số ĐDCN/CCCD NĐD',
  'Ngày cấp NĐD',
  'Nơi cấp NĐD',
  'Quê quán NĐD',
  'Nơi thường trú NĐD',
  'Số điện thoại NĐD',
  'Quan hệ với liệt sĩ',
  'Chế độ trợ cấp đang hưởng',
  'Mã số hồ sơ liệt sĩ',
  'Mã hồ sơ Bộ quản lý',
  'Mã hồ sơ tỉnh quản lý',
  'Họ tên liệt sĩ',
  'Bí danh',
  'Ngày sinh LS',
  'Giới tính LS',
  'Quê quán LS',
  'Cấp bậc, chức vụ khi hy sinh',
  'Cơ quan, đơn vị khi hy sinh',
  'Ngày hy sinh',
  'Nơi hy sinh',
  'Nơi an táng ban đầu',
  'Số Bằng Tổ quốc ghi công',
  'Quyết định số',
  'Ngày quyết định',
  'Con ông',
  'Con bà',
  'Vợ/Chồng',
  'Hình thức an táng / Tình trạng mộ',
  'Tên nghĩa trang liệt sĩ / Nơi an táng',
  'Loại nghĩa trang',
  'Địa chỉ nghĩa trang chi tiết',
  'Địa điểm quy tập / an táng trước khi tiếp nhận',
  'Đơn vị quy tập / an táng trước khi tiếp nhận',
  'Thời gian đưa vào an táng tại nghĩa trang',
  'Vị trí mộ cụ thể (Khu, Lô, Hàng, Số mộ)',
  'Thông tin ghi trên bia mộ & Nội dung cụ thể',
  'Tình trạng hài cốt trong mộ & Quy tập',
  'Ghi chú về phần mộ / Di vật kèm theo',
  'Trạng thái phiếu'
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

    // Mẫu 01 được lưu ở sheet riêng, không trộn với Mẫu 02.
    const formType = clean_(p.form_type || p.mauPhieu || p.loaiMau || p.template || '').toLowerCase();
    const isM01 = formType === 'm01' || formType === 'mẫu 01' || formType === 'mau 01' || formType === '1' ||
      formType.indexOf('mẫu 01') >= 0 || formType.indexOf('mau 01') >= 0;
    if (isM01) return saveM01_(p);

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
      normalizeRelativesChoice_(p.has_relatives || p.tinhTrangThanNhan) || (relatives.length > 0 ? 'Có' : 'Không'),
      clean_(p.trangThai || p.status) || (oldIdentity ? 'Đã cập nhật' : 'Mới')
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
    const m1 = getOrCreateSheet_(ss, M1_SHEET_NAME, M1_HEADERS);
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

    const m1Rows = readData_(m1, M1_HEADERS.length);
    m1Rows.forEach(function(row) {
      const rec = m1RowToRecord_(row);
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

      rec.data = m1RowToFrontend_(row);
      rec.data.record_id = rec.record_id;
      rec.data.relatives = [];
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

function saveM01_(p) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet_(ss, M1_SHEET_NAME, M1_HEADERS);
  const savedAt = formatNow_();

  const recordId = clean_(p.record_id || p.maPhieu || p.m01_record_id);
  const martyrName = clean_(p.martyr_name || p.hoTenLietSi);
  const fileId = clean_(p.file_id || p.maSoHoSoLS);
  const existing = findM01Row_(sheet, recordId, fileId, martyrName);

  // Vị trí mộ cụ thể: ghép hoặc lấy trường đầy đủ
  const graveLocation = clean_(p.grave_location) || [
    (p.grave_area || p.area_number) ? ('Khu: ' + clean_(p.grave_area || p.area_number)) : '',
    (p.grave_plot || p.plot_number) ? ('Lô: ' + clean_(p.grave_plot || p.plot_number)) : '',
    (p.grave_row || p.row_number) ? ('Hàng: ' + clean_(p.grave_row || p.row_number)) : '',
    (p.grave_number || p.soMo) ? ('Mộ số: ' + clean_(p.grave_number || p.soMo)) : ''
  ].filter(Boolean).join('; ');

  // Địa chỉ nghĩa trang chi tiết: ghép hoặc lấy trường đầy đủ
  const cemeteryAddress = clean_(p.cemetery_address || p.diaChiNghiaTrang) || [
    clean_(p.grave_commune), clean_(p.grave_district), clean_(p.grave_province)
  ].filter(Boolean).join(', ');

  // Thông tin ghi trên bia mộ & Nội dung cụ thể
  const graveStele = clean_(p.grave_stele) || [
    clean_(p.grave_stele_info), clean_(p.grave_stele_content)
  ].filter(Boolean).join(' - ');

  // Tình trạng hài cốt trong mộ & Quy tập
  const graveRemains = clean_(p.grave_remains) || [
    clean_(p.grave_remains_status), clean_(p.grave_gathered_status)
  ].filter(Boolean).join('; ');

  const row = [
    savedAt,
    recordId,
    clean_(p.rep_name || p.hoTenNguoiDaiDien),
    clean_(p.rep_dob || p.ngaySinhNDD),
    clean_(p.rep_gender || p.gioiTinhNDD),
    clean_(p.rep_id || p.soCCCD || p.soDDCN),
    clean_(p.rep_issue_date || p.ngayCapCCCD),
    clean_(p.rep_issue_place || p.noiCapCCCD),
    clean_(p.rep_hometown || p.queQuanNDD),
    clean_(p.rep_address || p.noiThuongTruNDD),
    clean_(p.rep_phone || p.soDienThoai),
    clean_(p.rep_relationship || p.quanHeVoiLS),
    clean_(p.rep_subsidy_type || p.cheDoTroCap),
    fileId,
    clean_(p.ministry_file || p.maBoQuanLy),
    clean_(p.province_file || p.maTinhQuanLy),
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
    clean_(p.grave_burial_type || p.tomb_status || p.tinhTrangMoLS),
    clean_(p.grave_cemetery_name || p.cemetery_name || p.tenNghiaTrang),
    clean_(p.cemetery_type || p.loaiNghiaTrang),
    cemeteryAddress,
    clean_(p.exhumation_place || p.diaDiemQuyTapAnTang),
    clean_(p.exhumation_unit || p.donViQuyTapAnTang),
    clean_(p.cemetery_burial_date || p.thoiGianDuaVaoAnTang),
    graveLocation,
    graveStele,
    graveRemains,
    clean_(p.grave_notes || p.ghiChuMo),
    clean_(p.trangThai || p.status) || (existing ? 'Đã cập nhật' : 'Mới')
  ];

  if (existing) sheet.getRange(existing.row, 1, 1, M1_HEADERS.length).setValues([row]);
  else sheet.appendRow(row);
  formatM01Sheet_(sheet);

  return jsonResponse({
    ok:true, form_type:'M01', action:existing?'updated':'inserted',
    record_id:recordId || fileId || ('M01-'+savedAt), martyr_name:martyrName,
    saved_at:savedAt, sheet:M1_SHEET_NAME,
    message:existing?'Đã cập nhật thông tin Mẫu 01 vào sheet riêng.':'Đã lưu thông tin Mẫu 01 vào sheet riêng.'
  });
}

function findM01Row_(sheet, recordId, fileId, martyrName) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const data = sheet.getRange(2, 1, lastRow - 1, M1_HEADERS.length).getValues();
  const rid=clean_(recordId), fid=clean_(fileId), name=clean_(martyrName).toLowerCase();
  for(let i=0;i<data.length;i++) if(rid && clean_(data[i][1])===rid) return {row:i+2};
  for(let i=0;i<data.length;i++) if(fid && clean_(data[i][13])===fid) return {row:i+2};
  for(let i=0;i<data.length;i++) if(name && clean_(data[i][16]).toLowerCase()===name) return {row:i+2};
  return null;
}

function formatM01Sheet_(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, M1_HEADERS.length).setWrap(true);
  styleHeader_(sheet, M1_HEADERS.length);

  // Các mã số quan trọng phải lưu dạng TEXT để không mất số 0 đầu.
  [6, 12, 13, 26].forEach(function(col) {
    sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1)
      .setNumberFormat('@');
  });
}

function setupM01() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet_(ss, M1_SHEET_NAME, M1_HEADERS);

  // Định dạng các cột mã số dưới dạng TEXT để giữ số 0 đầu.
  [6, 12, 13, 26].forEach(function(col) {
    sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1)
      .setNumberFormat('@');
  });

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, M1_HEADERS.length).setWrap(true);
  styleHeader_(sheet, M1_HEADERS.length);

  return 'Đã khởi tạo trang M01 với ' + M1_HEADERS.length + ' cột.';
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
    status: clean_(row[31]) || 'Mới'
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
    trangThai: clean_(row[31]) || 'Mới',

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

function m1RowToRecord_(row) {
  return {
    record_id: clean_(row[1]) || clean_(row[13]) || ('M01-' + normalizeDate_(row[0])),
    form_type: 'm01',
    loaiPhieu: 'Mẫu 01',
    martyr_name: clean_(row[16]),
    martyr_dob: clean_(row[18]),
    martyr_death_date: clean_(row[23]),
    martyr_hometown: clean_(row[20]),
    file_id: clean_(row[13]),
    ministry_file: clean_(row[14]),
    province_file: clean_(row[15]),
    rep_name: clean_(row[2]),
    rep_phone: clean_(row[10]),
    rep_relationship: clean_(row[11]),
    rep_subsidy_type: clean_(row[12]),
    has_relatives: 'Không',
    saved_at: clean_(row[0]),
    status: clean_(row[43]) || 'Mới'
  };
}

function m1RowToFrontend_(row) {
  return {
    record_id: clean_(row[1]) || clean_(row[13]) || ('M01-' + normalizeDate_(row[0])),
    form_type: 'm01',
    loaiPhieu: 'Mẫu 01',
    rep_name: clean_(row[2]),
    rep_dob: clean_(row[3]),
    rep_gender: clean_(row[4]),
    rep_id: clean_(row[5]),
    rep_issue_date: clean_(row[6]),
    rep_issue_place: clean_(row[7]),
    rep_hometown: clean_(row[8]),
    rep_address: clean_(row[9]),
    rep_phone: clean_(row[10]),
    rep_relationship: clean_(row[11]),
    rep_subsidy_type: clean_(row[12]),
    file_id: clean_(row[13]),
    ministry_file: clean_(row[14]),
    province_file: clean_(row[15]),
    martyr_name: clean_(row[16]),
    martyr_alias: clean_(row[17]),
    martyr_dob: clean_(row[18]),
    martyr_gender: clean_(row[19]),
    martyr_hometown: clean_(row[20]),
    martyr_rank: clean_(row[21]),
    martyr_unit: clean_(row[22]),
    martyr_death_date: clean_(row[23]),
    martyr_death_place: clean_(row[24]),
    burial_place: clean_(row[25]),
    certificate_no: clean_(row[26]),
    decision_no: clean_(row[27]),
    decision_date: clean_(row[28]),
    father: clean_(row[29]),
    mother: clean_(row[30]),
    wife: clean_(row[31]),
    grave_burial_type: clean_(row[32]),
    tomb_status: clean_(row[32]),
    grave_cemetery_name: clean_(row[33]),
    cemetery_name: clean_(row[33]),
    cemetery_type: clean_(row[34]),
    cemetery_address: clean_(row[35]),
    exhumation_place: clean_(row[36]),
    exhumation_unit: clean_(row[37]),
    cemetery_burial_date: clean_(row[38]),
    grave_location: clean_(row[39]),
    grave_stele: clean_(row[40]),
    grave_stele_content: clean_(row[40]),
    grave_remains: clean_(row[41]),
    grave_notes: clean_(row[42]),
    trangThai: clean_(row[43]) || 'Mới',
    saved_at: clean_(row[0])
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
