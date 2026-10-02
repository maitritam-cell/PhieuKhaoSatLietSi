# PHIẾU KHẢO SÁT LIỆT SĨ – MẪU 02

Ứng dụng nhập liệu, lưu trữ và xuất Phiếu khảo sát liệt sĩ theo Mẫu 02.

## Bám theo Mẫu 02

Biểu mẫu có 3 phần chính: thông tin người đại diện; thông tin về liệt sĩ; và Phụ lục 1 về thân nhân theo họ ngoại với 6 nhóm ưu tiên và 11 cột. Phần xác nhận UBND cấp xã, Công an cấp xã và Sở Nội vụ được đưa vào dữ liệu hồ sơ để lưu cùng phiếu.

## Công nghệ

- Frontend: `public/index.html` + `public/app.js`.
- Backend: Node.js + Express.
- Xuất Word: JSZip + XML DOM, điền trực tiếp vào DOCX Mẫu 02.
- Xuất PDF: pdf-lib, chèn dữ liệu lên mẫu PDF gốc.
- Lưu trữ: Google Sheets qua Google Apps Script; đồng thời lưu bản sao cục bộ bằng localStorage.

## Cấu trúc

- `public/index.html`: giao diện nhập liệu.
- `public/app.js`: xử lý biểu mẫu, nháp, kho bản lưu, lưu Google Sheets và xuất PDF/Word.
- `api/index.js`: entrypoint Node.js cho Vercel.
- `server.js`: Express app và API `/api/generate`.
- `template/Mẫu 02.docx`: mẫu Word.
- `google-apps-script/Code.gs`: mã Apps Script cho hai sheet `PHIEU_KHAO_SAT` và `PHU_LUC_1`.

## Lưu trữ

1. Mỗi hồ sơ được cấp mã dạng `LS02-YYYYMMDDHHMMSS-XXXXX`.
2. Bấm **Lưu hồ sơ** để gửi toàn bộ dữ liệu, bao gồm 6 dòng Phụ lục 1, sang Google Sheets.
3. Ứng dụng đồng thời lưu bản sao trên thiết bị hiện tại để có thể mở lại và tìm kiếm.
4. Xuất Word/PDF chỉ mở sau khi hồ sơ đã được lưu.

## Apps Script

Mở `google-apps-script/Code.gs`, sao chép toàn bộ mã vào Apps Script gắn với bảng Google Sheets đang dùng, chạy `setup()` một lần, sau đó triển khai Web app. URL Web app được đặt trong `public/app.js`.

## Vercel

Đây là ứng dụng Node.js/Express, không phải Python. Repository không cần `vercel.json`; Vercel có thể nhận diện Express/Node từ mã nguồn. Vercel hiện hỗ trợ Node.js 22 cho Builds và Functions.

Nếu Project Settings của Vercel hiện đang để **Python**, đổi **Framework Preset** sang **Other** và bật Override nếu giao diện yêu cầu. Đặt **Root Directory** là thư mục gốc của repository, không phải `api` hay một thư mục Python. Sau đó Redeploy commit mới.

