# Ứng dụng lập Phiếu khảo sát liệt sĩ – Mẫu 02

Ứng dụng web nhập dữ liệu và xuất Phiếu khảo sát liệt sĩ theo Mẫu 02, hỗ trợ xuất Word/PDF và lưu dữ liệu vào Google Sheets.

## Công nghệ

- Frontend: HTML/CSS/JavaScript trong `public/index.html`.
- Backend: Node.js + Express.
- Xuất Word: đọc mẫu DOCX và điền dữ liệu bằng `JSZip` + `@xmldom/xmldom`.
- Xuất PDF: dùng thư viện `pdf-lib` ở phía trình duyệt.
- Lưu dữ liệu: Google Sheets thông qua Google Apps Script.

## Cấu trúc chính

- `public/index.html`: giao diện nhập liệu.
- `index.html`: bản dự phòng của giao diện.
- `api/index.js`: entrypoint Node.js cho Vercel.
- `server.js`: Express app và API `/api/generate`.
- `template/Mẫu 02.docx`: mẫu Word gốc.
- `vercel.json`: cấu hình Vercel, ép dự án dùng Framework Preset "Other" và Node.js 22.

## Chạy cục bộ

```bash
npm install
npm run dev
```

Sau đó mở `http://localhost:3000`.

## Chạy trên Vercel

Repository này là ứng dụng Node.js/Express, không phải Python. Cấu hình trong `vercel.json` đặt:

- Framework: `null` (tương đương "Other").
- Runtime function: `nodejs22.x`.
- Build command: `npm run build`.

Nếu Project Settings của Vercel đang đặt Framework Preset là Python, cấu hình `framework: null` trong `vercel.json` sẽ ghi đè thiết lập đó cho các deployment mới.

## Lưu ý

Chức năng "Lưu vào Google Sheets" gửi dữ liệu đến Google Apps Script; sau khi lưu thành công, nút Xuất Word/PDF mới được mở.
