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

function getSpreadsheet_() {
  // Luôn mở đúng workbook được cấu hình, tránh trường hợp Apps Script
  // đang gắn với một Spreadsheet khác nhưng lại đọc nhầm dữ liệu.
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function normalizeSheetName_(name) {
  return clean_(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function findM01Sheet_(ss) {
  const exact = ss.getSheetByName(M1_SHEET_NAME);
  if (exact) return exact;

  const aliases = {
    m01: true,
    mau01: true,
    mau01_01: true,
    mau011: true,
    mau01_1: true
  };

  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const normalized = normalizeSheetName_(sheets[i].getName());
    if (aliases[normalized]) return sheets[i];
  }

  return null;
}

function sheetDiagnostics_(ss) {
  const sheets = ss.getSheets().map(function(sheet) {
    return {
      name: sheet.getName(),
      rows: sheet.getLastRow(),
      columns: sheet.getLastColumn()
    };
  });

  const m1 = findM01Sheet_(ss);

  return {
    spreadsheet_id: SPREADSHEET_ID,
    spreadsheet_url: ss.getUrl(),
    expected_m01_name: M1_SHEET_NAME,
    resolved_m01_name: m1 ? m1.getName() : '',
    m01_found: !!m1,
    m01_rows: m1 ? Math.max(m1.getLastRow() - 1, 0) : 0,
    m01_columns: m1 ? m1.getLastColumn() : 0,
    sheets: sheets
  };
}

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
  'Vị trí mộ trong nghĩa trang liệt sĩ',
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

    // Mẫu 01 được lưu ở sheet riêng 'M01', không trộn với Mẫu 02.
    const formType = clean_(p.form_type || p.loaiPhieu || p.mauPhieu || p.loaiMau || p.template || '').toLowerCase();
    const isM01 = formType === 'm01' || formType === 'mẫu 01' || formType === 'mau 01' || formType === '1' ||
      formType.indexOf('m01') >= 0 || formType.indexOf('mẫu 01') >= 0 || formType.indexOf('mau 01') >= 0;
    if (isM01) return saveM01_(p);

    const ss = getSpreadsheet_();
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
    const ss = getSpreadsheet_();
    const action = clean_(e && e.parameter && e.parameter.action).toLowerCase();

    // Endpoint chẩn đoán để kiểm tra chính xác Web App đang nhìn vào workbook/sheet nào.
    if (action === 'diagnose' || action === 'diagnostic') {
      return jsonResponse({
        ok: true,
        type: 'diagnostic',
        ...sheetDiagnostics_(ss)
      });
    }

    // Khi đọc không được tự tạo sheet M01, vì việc tự tạo sheet rỗng
    // sẽ che giấu lỗi triển khai hoặc lỗi tên workbook.
    const m1 = findM01Sheet_(ss);
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

    const m1Headers = m1 ? m1.getRange(1, 1, 1, m1.getLastColumn()).getDisplayValues()[0] : [];
    const m1Rows = m1 ? readData_(m1, m1.getLastColumn()) : [];
    m1Rows.forEach(function(row) {
      const rec = m1RowToRecord_(row, m1Headers);
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

      rec.data = m1RowToFrontend_(row, m1Headers);
      rec.data.record_id = rec.record_id;
      rec.data.relatives = [];
      records.push(rec);
    });

    return jsonResponse({
      ok: true,
      total: records.length,
      m01_found: !!m1,
      m01_sheet_name: m1 ? m1.getName() : '',
      m01_rows: m1Rows.length,
      records: records
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.stack ? err.stack : err) });
  }
}

function saveM01_(p) {
  const ss = getSpreadsheet_();
  const sheet = getOrCreateSheet_(ss, M1_SHEET_NAME, M1_HEADERS);
  const savedAt = formatNow_();

  const recordId = clean_(p.record_id || p.maPhieu || p.m01_record_id);
  const martyrName = clean_(p.martyr_name || p.hoTenLietSi);
  const fileId = clean_(p.file_id || p.maSoHoSoLS);
  const existing = findM01Row_(sheet, recordId, fileId, martyrName);

  // Vị trí mộ cụ thể: lấy trường vị trí hoặc ghép
  const graveLocation = clean_(p.grave_position || p.grave_location) || [
    (p.grave_area || p.area_number) ? ('Khu: ' + clean_(p.grave_area || p.area_number)) : '',
    (p.grave_plot || p.plot_number) ? ('Lô: ' + clean_(p.grave_plot || p.plot_number)) : '',
    (p.grave_row || p.row_number) ? ('Hàng: ' + clean_(p.grave_row || p.row_number)) : '',
    (p.grave_number || p.soMo) ? ('Mộ số: ' + clean_(p.grave_number || p.soMo)) : ''
  ].filter(Boolean).join('; ');

  // Địa chỉ nghĩa trang chi tiết: ghép hoặc lấy trường đầy đủ
  const cemeteryAddress = clean_(p.cemetery_address || p.diaChiNghiaTrang) || [
    clean_(p.grave_commune), clean_(p.grave_district), clean_(p.grave_province)
  ].filter(Boolean).join(', ');

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
  for(let i=0;i<data.length;i++) if(fid && clean_(data[i][11])===fid) return {row:i+2};
  for(let i=0;i<data.length;i++) if(name && clean_(data[i][14]).toLowerCase()===name) return {row:i+2};
  return null;
}

function formatM01Sheet_(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, M1_HEADERS.length).setWrap(true);
  styleHeader_(sheet, M1_HEADERS.length);

  // Các mã số quan trọng phải lưu dạng TEXT để không mất số 0 đầu.
  [6, 12, 13, 25].forEach(function(col) {
    sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1)
      .setNumberFormat('@');
  });
}

function setupM01() {
  const ss = getSpreadsheet_();
  const sheet = getOrCreateSheet_(ss, M1_SHEET_NAME, M1_HEADERS);

  // Định dạng các cột mã số dưới dạng TEXT để giữ số 0 đầu.
  [6, 12, 13, 25].forEach(function(col) {
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

function normalizeHeader_(value) {
  return clean_(value)
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function m1FindCol_(headers, aliases, fallback) {
  const normalizedHeaders = (headers || []).map(normalizeHeader_);
  const wanted = (aliases || []).map(normalizeHeader_);

  for (let i = 0; i < wanted.length; i++) {
    const exact = normalizedHeaders.indexOf(wanted[i]);
    if (exact >= 0) return exact;
  }

  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (wanted.some(function(w) {
      return w && (normalizedHeaders[i].indexOf(w) >= 0 || w.indexOf(normalizedHeaders[i]) >= 0);
    })) return i;
  }

  return fallback;
}

function m1Cell_(row, headers, aliases, fallback) {
  const col = m1FindCol_(headers, aliases, fallback);
  return col >= 0 && col < row.length ? clean_(row[col]) : '';
}

function m1RowToRecord_(row, headers) {
  return {
    record_id: m1Cell_(row, headers, ['Mã phiếu Mẫu 01', 'Mã phiếu', 'Mã phiếu M01'], 1) ||
               m1Cell_(row, headers, ['Mã số hồ sơ liệt sĩ', 'Mã hồ sơ liệt sĩ'], 11) ||
               ('M01-' + normalizeDate_(m1Cell_(row, headers, ['Thời gian lưu', 'Thời gian'], 0))),
    form_type: 'm01',
    loaiPhieu: 'Mẫu 01',
    martyr_name: m1Cell_(row, headers, ['Họ tên liệt sĩ', 'Họ và tên liệt sĩ', 'Tên liệt sĩ'], 14),
    martyr_dob: m1Cell_(row, headers, ['Ngày sinh LS', 'Ngày tháng năm sinh LS', 'Ngày sinh liệt sĩ'], 16),
    martyr_death_date: m1Cell_(row, headers, ['Ngày hy sinh', 'Ngày tháng năm hy sinh'], 21),
    martyr_hometown: m1Cell_(row, headers, ['Quê quán LS', 'Quê quán liệt sĩ'], 18),
    file_id: m1Cell_(row, headers, ['Mã số hồ sơ liệt sĩ', 'Mã hồ sơ liệt sĩ'], 11),
    ministry_file: m1Cell_(row, headers, ['Mã hồ sơ Bộ quản lý', 'Mã hồ sơ Bộ'], 12),
    province_file: m1Cell_(row, headers, ['Mã hồ sơ tỉnh quản lý', 'Mã hồ sơ Tỉnh'], 13),
    rep_name: m1Cell_(row, headers, ['Họ tên người đại diện', 'Họ và tên người đại diện', 'Người đại diện'], 2),
    rep_dob: m1Cell_(row, headers, ['Ngày sinh NĐD', 'Ngày sinh người đại diện'], 3),
    rep_gender: m1Cell_(row, headers, ['Giới tính NĐD', 'Giới tính người đại diện'], 4),
    rep_id: m1Cell_(row, headers, ['Số ĐDCN/CCCD NĐD', 'Số CCCD/ĐDCN NĐD', 'Số CCCD/ĐDCN'], 5),
    rep_issue_date: m1Cell_(row, headers, ['Ngày cấp NĐD', 'Ngày cấp'], 6),
    rep_issue_place: m1Cell_(row, headers, ['Nơi cấp NĐD', 'Nơi cấp'], 7),
    rep_hometown: m1Cell_(row, headers, ['Quê quán NĐD', 'Quê quán người đại diện'], 8),
    rep_address: m1Cell_(row, headers, ['Nơi thường trú NĐD', 'Nơi thường trú người đại diện', 'Nơi thường trú'], 9),
    rep_phone: m1Cell_(row, headers, ['Số điện thoại NĐD', 'Số điện thoại'], 10),
    has_relatives: 'Không',
    saved_at: m1Cell_(row, headers, ['Thời gian lưu', 'Thời gian'], 0),
    status: m1Cell_(row, headers, ['Trạng thái phiếu', 'Trạng thái'], 38) || 'Mới'
  };
}

function m1RowToFrontend_(row, headers) {
  return {
    record_id: m1Cell_(row, headers, ['Mã phiếu Mẫu 01', 'Mã phiếu', 'Mã phiếu M01'], 1) ||
               m1Cell_(row, headers, ['Mã số hồ sơ liệt sĩ', 'Mã hồ sơ liệt sĩ'], 11) ||
               ('M01-' + normalizeDate_(m1Cell_(row, headers, ['Thời gian lưu', 'Thời gian'], 0))),
    form_type: 'm01',
    loaiPhieu: 'Mẫu 01',

    rep_name: m1Cell_(row, headers, ['Họ tên người đại diện', 'Họ và tên người đại diện', 'Người đại diện'], 2),
    rep_dob: m1Cell_(row, headers, ['Ngày sinh NĐD', 'Ngày sinh người đại diện'], 3),
    rep_gender: m1Cell_(row, headers, ['Giới tính NĐD', 'Giới tính người đại diện'], 4),
    rep_id: m1Cell_(row, headers, ['Số ĐDCN/CCCD NĐD', 'Số CCCD/ĐDCN NĐD', 'Số CCCD/ĐDCN'], 5),
    rep_issue_date: m1Cell_(row, headers, ['Ngày cấp NĐD', 'Ngày cấp'], 6),
    rep_issue_place: m1Cell_(row, headers, ['Nơi cấp NĐD', 'Nơi cấp'], 7),
    rep_hometown: m1Cell_(row, headers, ['Quê quán NĐD', 'Quê quán người đại diện'], 8),
    rep_address: m1Cell_(row, headers, ['Nơi thường trú NĐD', 'Nơi thường trú người đại diện', 'Nơi thường trú'], 9),
    rep_phone: m1Cell_(row, headers, ['Số điện thoại NĐD', 'Số điện thoại'], 10),

    file_id: m1Cell_(row, headers, ['Mã số hồ sơ liệt sĩ', 'Mã hồ sơ liệt sĩ'], 11),
    ministry_file: m1Cell_(row, headers, ['Mã hồ sơ Bộ quản lý', 'Mã hồ sơ Bộ'], 12),
    province_file: m1Cell_(row, headers, ['Mã hồ sơ tỉnh quản lý', 'Mã hồ sơ Tỉnh'], 13),

    martyr_name: m1Cell_(row, headers, ['Họ tên liệt sĩ', 'Họ và tên liệt sĩ', 'Tên liệt sĩ'], 14),
    martyr_alias: m1Cell_(row, headers, ['Bí danh'], 15),
    martyr_dob: m1Cell_(row, headers, ['Ngày sinh LS', 'Ngày tháng năm sinh LS', 'Ngày sinh liệt sĩ'], 16),
    martyr_gender: m1Cell_(row, headers, ['Giới tính LS', 'Giới tính liệt sĩ'], 17),
    martyr_hometown: m1Cell_(row, headers, ['Quê quán LS', 'Quê quán liệt sĩ'], 18),
    martyr_rank: m1Cell_(row, headers, ['Cấp bậc, chức vụ khi hy sinh', 'Cấp bậc, chức vụ'], 19),
    martyr_unit: m1Cell_(row, headers, ['Cơ quan, đơn vị khi hy sinh', 'Cơ quan, đơn vị'], 20),
    martyr_death_date: m1Cell_(row, headers, ['Ngày hy sinh', 'Ngày tháng năm hy sinh'], 21),
    martyr_death_place: m1Cell_(row, headers, ['Nơi hy sinh'], 22),
    burial_place: m1Cell_(row, headers, ['Nơi an táng ban đầu'], 23),
    certificate_no: m1Cell_(row, headers, ['Số Bằng Tổ quốc ghi công', 'Số Bằng TQGC'], 24),
    decision_no: m1Cell_(row, headers, ['Quyết định số', 'Số Quyết định'], 25),
    decision_date: m1Cell_(row, headers, ['Ngày quyết định', 'Ngày QĐ'], 26),
    father: m1Cell_(row, headers, ['Con ông', 'Cha'], 27),
    mother: m1Cell_(row, headers, ['Con bà', 'Mẹ'], 28),
    wife: m1Cell_(row, headers, ['Vợ/Chồng', 'Vợ'], 29),

    grave_burial_type: m1Cell_(row, headers, ['Hình thức an táng / Tình trạng mộ', 'Hình thức an táng', 'Tình trạng mộ'], 30),
    tomb_status: m1Cell_(row, headers, ['Hình thức an táng / Tình trạng mộ', 'Tình trạng mộ'], 30),
    grave_cemetery_name: m1Cell_(row, headers, ['Tên nghĩa trang liệt sĩ / Nơi an táng', 'Tên nghĩa trang liệt sĩ', 'Nơi an táng'], 31),
    cemetery_name: m1Cell_(row, headers, ['Tên nghĩa trang liệt sĩ / Nơi an táng', 'Tên nghĩa trang liệt sĩ', 'Nơi an táng'], 31),
    cemetery_type: m1Cell_(row, headers, ['Loại nghĩa trang'], 32),
    cemetery_address: m1Cell_(row, headers, ['Địa chỉ nghĩa trang chi tiết', 'Địa chỉ nghĩa trang'], 33),
    exhumation_place: m1Cell_(row, headers, ['Địa điểm quy tập / an táng trước khi tiếp nhận', 'Địa điểm quy tập'], 34),
    exhumation_unit: m1Cell_(row, headers, ['Đơn vị quy tập / an táng trước khi tiếp nhận', 'Đơn vị quy tập'], 35),
    cemetery_burial_date: m1Cell_(row, headers, ['Thời gian đưa vào an táng tại nghĩa trang', 'Thời gian an táng'], 36),
    grave_position: m1Cell_(row, headers, ['Vị trí mộ trong nghĩa trang liệt sĩ', 'Vị trí mộ cụ thể', 'Vị trí mộ'], 37),
    grave_location: m1Cell_(row, headers, ['Vị trí mộ trong nghĩa trang liệt sĩ', 'Vị trí mộ cụ thể', 'Vị trí mộ'], 37),
    trangThai: m1Cell_(row, headers, ['Trạng thái phiếu', 'Trạng thái'], 38) || 'Mới',
    saved_at: m1Cell_(row, headers, ['Thời gian lưu', 'Thời gian'], 0)
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
