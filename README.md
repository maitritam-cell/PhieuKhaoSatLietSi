# Ứng dụng lập Phiếu khảo sát liệt sĩ – Mẫu 02

Ứng dụng web nhập dữ liệu và xuất lại file Word dựa trên mẫu DOCX được cung cấp.

## Chạy trên Vercel
1. Tạo repository GitHub và upload toàn bộ thư mục này.
2. Import repository vào Vercel.
3. Vercel tự nhận `vercel.json` và Python function.
4. Mở URL sau khi deploy.

## Cấu trúc
- `public/index.html`: giao diện nhập liệu.
- `api/generate.py`: điền dữ liệu vào mẫu Word.
- `template/mau-02.docx`: mẫu Word gốc.

Dữ liệu bản nháp chỉ lưu trong trình duyệt bằng localStorage; phiên bản đầu chưa lưu hồ sơ lên cơ sở dữ liệu.