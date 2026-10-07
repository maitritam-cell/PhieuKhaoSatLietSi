# Ứng dụng lập Phiếu khảo sát liệt sĩ – Mẫu 01 & Mẫu 02

Ứng dụng web nhập dữ liệu, quản lý rà soát và xuất Phiếu khảo sát liệt sĩ theo quy định Bộ Công an:
- **Mẫu 01**: Khảo sát thông tin liệt sĩ đã xác định thông tin phần mộ và người hưởng trợ cấp (xuất Word .docx).
- **Mẫu 02**: Khảo sát thông tin liệt sĩ chưa xác định phần mộ và thân nhân dòng ngoại phục vụ thu mẫu ADN (xuất Word .docx & PDF .pdf).

## Công nghệ

- Frontend: HTML/CSS/JavaScript trong `public/index.html` và `public/app.js`.
- Phân công cán bộ & theo dõi tiến độ: `public/assignments.html` và `public/assignments.js`.
- Backend: Node.js + Express (`server.js`, `api/index.js`).
- Xuất Word: đọc mẫu DOCX (Mẫu 01 và Mẫu 02) và điền dữ liệu bằng `JSZip` + `@xmldom/xmldom`.
- Xuất PDF: dùng thư viện `pdf-lib` ở phía trình duyệt trực tiếp trên mẫu PDF 2 trang (Mẫu 02).
- Lưu dữ liệu: Google Sheets và Supabase.
- Tra cứu & Sửa: Tìm kiếm theo tên liệt sĩ, mã phiếu, CCCD, SĐT; lọc theo Mẫu 01/Mẫu 02; nạp dữ liệu vào form để chỉnh sửa và cập nhật.

## Cấu trúc chính

- `public/index.html`: giao diện nhập liệu, chuyển đổi Mẫu 01 / Mẫu 02, tra cứu và sửa phiếu.
- `public/app.js`: toàn bộ logic nghiệp vụ, xác thực dữ liệu, tra cứu, chuyển đổi form và xuất file.
- `public/assignments.html`: bảng điều khiển giao việc, phân công địa bàn và theo dõi tiến độ của từng cán bộ.
- `template/Mẫu 01.docx`: mẫu Word Mẫu 01 chuẩn quy định.
- `template/Mẫu 02.docx`: mẫu Word Mẫu 02 chuẩn quy định.
- `template/Mẫu 02.pdf`: mẫu PDF Mẫu 02.
- `server.js`: Express app với các API `/api/generate`, `/api/save-sheet`, `/api/records`.
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
