# Ứng dụng lập Phiếu khảo sát liệt sĩ – Mẫu 02

Ứng dụng web nhập dữ liệu và xuất Phiếu khảo sát liệt sĩ theo Mẫu 02, hỗ trợ xuất Word/PDF và lưu dữ liệu vào Google Sheets.

## Công nghệ

- Frontend: HTML/CSS/JavaScript trong `public/index.html` và `public/app.js`.
- Backend: Node.js + Express (`server.js`, `api/index.js`).
- Xuất Word: đọc mẫu DOCX và điền dữ liệu bằng `JSZip` + `@xmldom/xmldom`.
- Xuất PDF: dùng thư viện `pdf-lib` ở phía trình duyệt trực tiếp trên mẫu PDF 2 trang.
- Lưu dữ liệu: Google Sheets (hỗ trợ đầy đủ 33 cột, tự động cập nhật dòng cũ khi sửa hoặc thêm dòng mới) và tùy chọn Supabase.
- Tra cứu & Sửa: Tìm kiếm theo tên liệt sĩ, mã phiếu, CCCD, SĐT; nạp dữ liệu vào form để chỉnh sửa và ghi đè cập nhật.

## Cấu trúc chính

- `public/index.html`: giao diện nhập liệu, tra cứu và sửa phiếu.
- `public/app.js`: toàn bộ logic nghiệp vụ, xác thực dữ liệu, tra cứu và xuất file.
- `google-apps-script.js`: mã nguồn Google Apps Script chuẩn đầy đủ 33 cột (hỗ trợ thêm mới, sửa dòng cũ và tra cứu).
- `server.js`: Express app với các API `/api/generate`, `/api/save-sheet`, `/api/records`.
- `template/Mẫu 02.docx`: mẫu Word gốc.
- `vercel.json`: cấu hình triển khai Vercel.

## Hướng dẫn cài đặt Google Apps Script lưu đầy đủ & sửa phiếu

1. Trong Google Sheet: vào **Tiện ích mở rộng** &rarr; **Apps Script**.
2. Sao chép nội dung từ file `google-apps-script.js` dán vào file `Code.gs` và bấm Lưu.
3. Bấm **Triển khai (Deploy)** &rarr; **Quản lý bản triển khai (Manage deployments)** &rarr; **Sửa (Edit)**.
4. Tại mục **"Ai có quyền truy cập" (Who has access)**: bắt buộc chọn **"Bất kỳ ai" (Anyone)**.
5. Sao chép URL Web App (đuôi `/exec`) và dán vào nút **⚙️ Cấu hình Sheet** trên ứng dụng.

## Lưu ý

- Các trường có dấu `*` là bắt buộc nhập. Hệ thống sẽ kiểm tra chặt chẽ trước khi cho phép lưu hoặc xuất file.
- Khi chỉnh sửa phiếu đã có, hệ thống sẽ tự động cập nhật đúng dòng tương ứng trên Google Sheets thay vì tạo thêm dòng trùng lặp.
