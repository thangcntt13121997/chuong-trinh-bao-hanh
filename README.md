# Warranty Management Core V0.1.1.2

## Legacy Schema Compatibility & Full Feature Restore

Phiên bản này được xây lại theo **database thực tế đang có** của siêu thị:
`customers`, `products`, `service_cases`, `service_appointments`, `case_events`, `attachments`, `generated_documents`, `audit_logs`, `profiles`.

### Không còn dùng
V0.1.1.2 **không sử dụng** các bảng `invoices` hoặc `warranty_items`. Không chạy lại các SQL cũ đã tạo cho kiến trúc đó.

## Chức năng
- Đăng nhập bằng **tên đăng nhập** thay vì bắt buộc email.
- Dashboard theo customers / products / service_cases / appointments.
- Lưu bảo hành mới: khách hàng, nhiều sản phẩm, mã hóa đơn, ngày mua, SKU, hãng, model, serial, phiếu BH, hạn BH, ảnh hóa đơn.
- Tra cứu chung theo tên/SĐT/SKU/serial/mã hóa đơn/mã hồ sơ.
- Chi tiết sản phẩm, chỉnh sửa, upload/xem ảnh hóa đơn bằng signed URL.
- Tiếp nhận hồ sơ bảo hành/sửa chữa trên `service_cases`.
- Theo dõi trạng thái, lịch sử `case_events`, lịch hẹn `service_appointments`, file `attachments`, tài liệu `generated_documents`.
- Quản lý nhân viên: tạo, username, phân quyền Admin/Staff/Viewer, khóa/mở, lưu trữ, reset password.
- Nhật ký thay đổi dùng đúng schema `audit_logs` hiện tại.
- Xóa sản phẩm theo kiểu lưu trữ mềm.

## Nâng cấp database hiện tại
Chỉ chạy file:

`supabase/upgrade_v0.1.1.2_legacy_compat.sql`

**Không chạy lại** `schema.sql`, `upgrade_v0.1.1.sql`, `upgrade_v0.1.1.1.sql`.

Migration chỉ bổ sung các cột tương thích như `products.invoice_number`, cột lưu trữ mềm, username/profile còn thiếu, index và bucket private `warranty-files`; không xóa 9 bảng hiện tại.

## Netlify Environment Variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Có thể giữ `VITE_SUPABASE_ANON_KEY` cũ, nhưng V0.1.1.2 ưu tiên `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Deploy
1. Chạy migration SQL nói trên trong Supabase SQL Editor.
2. Upload toàn bộ source V0.1.1.2 lên repository GitHub để ghi đè source ứng dụng hiện tại.
3. Không upload `.env` lên GitHub.
4. Netlify → Deploys → Trigger deploy → **Clear cache and deploy site**.
5. Đăng nhập bằng username hiện có. Migration tự lấy email từ `auth.users` và tạo username cho tài khoản cũ nếu cần.

## Lưu ý file hóa đơn
File mới được lưu ở bucket private `warranty-files`; bảng `attachments` chỉ giữ đường dẫn. Link xem file là signed URL 5 phút.
