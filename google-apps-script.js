/**
 * GOOGLE APPS SCRIPT CHO PHIẾU KHẢO SÁT LIỆT SĨ (MẪU 02)
 * Hỗ trợ:
 * 1. Lưu đầy đủ toàn bộ 33+ trường thông tin (Liệt sĩ, Người đại diện, Quyết định, Bằng TQGC, Thân nhân).
 * 2. Tự động kiểm tra: Nếu mã phiếu đã tồn tại -> CẬP NHẬT (Sửa dòng cũ), nếu chưa có -> THÊM DÒNG MỚI.
 * 3. Hỗ trợ tra cứu (GET request): Tìm kiếm trực tiếp dữ liệu từ Google Sheets về ứng dụng web.
 *
 * CÁCH CÀI ĐẶT:
 * 1. Mở Google Sheet -> Tiện ích mở rộng -> Apps Script.
 * 2. Xóa code cũ, dán toàn bộ đoạn code này vào file Code.gs.
 * 3. Bấm biểu tượng Đĩa mềm để Lưu (Save).
 * 4. Bấm Triển khai (Deploy) -> Quản lý bản triển khai (Manage deployments).
 * 5. Bấm Chỉnh sửa (biểu tượng cây bút), chọn:
 *    - Thực thi dưới dạng (Execute as): "Tôi" (tài khoản của bạn)
 *    - Ai có quyền truy cập (Who has access): BẮT BUỘC CHỌN "Bất kỳ ai" (Anyone).
 * 6. Bấm Triển khai và sao chép URL Web App dán vào ứng dụng web.
 */

const HEADERS = [
  'Mã phiếu',
  'Họ tên liệt sĩ',
  'Bí danh',
  'Ngày sinh liệt sĩ',
  'Giới tính liệt sĩ',
  'Quê quán liệt sĩ',
  'Cấp bậc chức vụ khi hy sinh',
  'Cơ quan đơn vị khi hy sinh',
  'Ngày tháng năm hy sinh',
  'Nơi hy sinh',
  'Nơi an táng ban đầu',
  'Bằng TQGC số',
  'Quyết định số',
  'Ngày quyết định',
  'Con ông',
  'Con bà',
  'Vợ',
  'Mã hồ sơ liệt sĩ',
  'Mã hồ sơ Bộ',
  'Mã hồ sơ tỉnh',
  'Họ tên người đại diện',
  'Ngày sinh người đại diện',
  'Giới tính người đại diện',
  'Số CCCD người đại diện',
  'Ngày cấp CCCD',
  'Nơi cấp CCCD',
  'Quê quán người đại diện',
  'Nơi thường trú người đại diện',
  'Số điện thoại',
  'Thời gian lưu/cập nhật',
  'Trạng thái',
  'Tóm tắt thân nhân họ ngoại',
  'Dữ liệu JSON đầy đủ'
];

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var p = {};
    if (e && e.postData && e.postData.contents) {
      try {
        p = JSON.parse(e.postData.contents);
      } catch (err) {
        p = e.parameter || {};
      }
    } else if (e && e.parameter) {
      p = e.parameter;
    }

    var recordId = p.record_id || p.maPhieu || ('LS02-' + new Date().getTime());
    var now = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    // Tóm tắt thân nhân
    var relativesSummary = '';
    if (p.relatives && Array.isArray(p.relatives)) {
      relativesSummary = p.relatives
        .filter(function(r) { return r && (r.name || r.id); })
        .map(function(r, idx) { return (idx + 1) + '. ' + (r.relationship || '') + ': ' + (r.name || '') + ' (' + (r.id || '') + ')'; })
        .join('\n');
    }

    // Nếu sheet còn trống hoặc dòng 1 chưa có header, tạo tiêu đề cột
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f1f5f9');
    }

    var rowData = [
      recordId,
      p.martyr_name || p.hoTenLietSi || '',
      p.martyr_alias || p.biDanh || '',
      p.martyr_dob || p.ngaySinh || '',
      p.martyr_gender || p.gioiTinhLS || '',
      p.martyr_hometown || p.queQuan || '',
      p.martyr_rank || p.capBac || '',
      p.martyr_unit || p.donVi || '',
      p.martyr_death_date || p.ngayHySinh || '',
      p.martyr_death_place || p.noiHySinh || p.ghiChu || '',
      p.burial_place || p.noiAnTang || '',
      p.certificate_no || p.soBangTQGC || '',
      p.decision_no || p.soQuyetDinh || '',
      p.decision_date || p.ngayQuyetDinh || '',
      p.father || p.hoTenBo || '',
      p.mother || p.hoTenMe || '',
      p.wife || p.hoTenVo || '',
      p.file_id || '',
      p.ministry_file || p.maBoQuanLy || '',
      p.province_file || p.maTinhQuanLy || '',
      p.rep_name || p.hoTenNguoiDaiDien || '',
      p.rep_dob || p.ngaySinhNDD || '',
      p.rep_gender || p.gioiTinhNDD || '',
      p.rep_id || p.soCCCD || '',
      p.rep_issue_date || p.ngayCapCCCD || '',
      p.rep_issue_place || p.noiCapCCCD || '',
      p.rep_hometown || p.queQuanNDD || '',
      p.rep_address || p.noiThuongTruNDD || '',
      p.rep_phone || p.soDienThoai || '',
      now,
      p.trangThai || 'Mới',
      relativesSummary,
      p.duLieuDayDu || JSON.stringify(p)
    ];

    // Kiểm tra xem mã phiếu này đã tồn tại chưa để SỬA/CẬP NHẬT thay vì ghi đè tạo bản sao
    var existingRow = -1;
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        var cellVal = String(ids[i][0]).trim();
        if (cellVal && (cellVal === String(recordId).trim() || (p.file_id && cellVal === String(p.file_id).trim()))) {
          existingRow = i + 2; // +2 vì index mảng từ 0 và có header dòng 1
          break;
        }
      }
    }

    if (existingRow > 0) {
      // Cập nhật đúng dòng đã có
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
      return jsonResponse({
        ok: true,
        action: 'updated',
        row: existingRow,
        record_id: recordId,
        message: 'Đã cập nhật thông tin phiếu thành công trên Google Sheets'
      });
    } else {
      // Thêm dòng mới
      sheet.appendRow(rowData);
      return jsonResponse({
        ok: true,
        action: 'inserted',
        row: sheet.getLastRow(),
        record_id: recordId,
        message: 'Đã thêm phiếu mới thành công vào Google Sheets'
      });
    }
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: err.toString()
    });
  }
}

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return jsonResponse({ ok: true, records: [] });
    }

    var q = (e && e.parameter && e.parameter.q ? e.parameter.q : '').trim().toLowerCase();
    var numCols = Math.min(sheet.getLastColumn(), HEADERS.length);
    var data = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();

    var records = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var recordId = String(row[0] || '');
      var martyrName = String(row[1] || '');
      var fileId = String(row[17] || '');
      var repName = String(row[20] || '');
      var repPhone = String(row[28] || '');
      var fullText = (recordId + ' ' + martyrName + ' ' + fileId + ' ' + repName + ' ' + repPhone).toLowerCase();

      if (!q || fullText.indexOf(q) !== -1) {
        var fullJson = null;
        if (row[32]) {
          try { fullJson = JSON.parse(row[32]); } catch (e) {}
        }

        records.push({
          record_id: recordId,
          martyr_name: martyrName,
          martyr_dob: row[3] || '',
          martyr_death_date: row[8] || '',
          martyr_hometown: row[5] || '',
          file_id: fileId,
          rep_name: repName,
          rep_phone: repPhone,
          saved_at: row[29] || '',
          status: row[30] || 'Mới',
          data: fullJson
        });
      }
    }

    return jsonResponse({
      ok: true,
      total: records.length,
      records: records
    });
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: err.toString()
    });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
