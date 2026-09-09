# Warranty Management Core V0.1.2.1

Bản vá tương thích CHECK constraint legacy của `service_cases`.

- service_type: `free_warranty`, `paid_warranty`, `free_exchange`, `paid_exchange`
- cause_category: `technical`, `user`, `unknown`
- status: `received`, `pending_supplier`, `sent_supplier`, `supplier_returned`, `ready_for_customer`, `returned_customer`, `cancelled`
- Không cần chạy SQL mới. Chỉ thay source và redeploy Netlify.
- Backend có lớp mapping tương thích để các giá trị cũ như `warranty`, `repair`, `processing`, `waiting_supplier` không còn làm lỗi CHECK constraint.

# Warranty Management Core V0.1.2.0

## Mục tiêu phiên bản
V0.1.2.0 lấy **chương trình cũ đang vận hành** làm baseline. Nguyên tắc của nhánh này là **nâng cấp nhưng không loại bỏ nghiệp vụ cũ**.

### Giữ nguyên và khôi phục
- Tổng quan bảo hành: hồ sơ đang xử lý, đã chuyển NCC, lịch hẹn, quá hạn, hồ sơ mới, lịch sắp tới.
- Tạo bảo hành mua mới: khách hàng, nhiều sản phẩm trên cùng hóa đơn, SKU, hãng/NCC, model, serial/IMEI, phiếu BH, ngày mua, hạn BH, ảnh hóa đơn.
- Tiếp nhận sản phẩm lỗi: tìm khách/sản phẩm cũ, tình trạng, mô tả lỗi, nguyên nhân, hướng xử lý, NCC/TTBH, phí dự kiến, lịch hẹn, người phụ trách, phụ kiện/tem/hộp, nhiều ảnh.
- Hồ sơ bảo hành: tìm kiếm, lọc trạng thái, xem chi tiết, cập nhật trạng thái, lịch hẹn, lịch sử xử lý, file đính kèm.
- Tra cứu khách hàng: SĐT, tên, SKU, serial, hóa đơn và mã hồ sơ.
- Nút in danh sách BM-184 tháng hiện tại dùng giao diện in của trình duyệt.

### Nâng cấp mới vẫn được giữ
- Đăng nhập bằng username.
- Admin quản lý nhân viên.
- Phân quyền theo từng chức năng.
- Khóa/mở khóa, lưu trữ, reset mật khẩu.
- Audit log.
- Supabase Storage private + signed URL.
- Netlify Functions kiểm tra quyền phía server.

## Database
Phiên bản này tiếp tục dùng schema legacy hiện tại:
`customers`, `products`, `service_cases`, `service_appointments`, `case_events`, `attachments`, `generated_documents`, `audit_logs`, `profiles`.

**Không chạy lại schema.sql hoặc migration V0.1.1.x nếu Supabase hiện tại đã chạy V0.1.1.3.** V0.1.2.0 không yêu cầu migration database mới.

## Environment variables trên Netlify
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Deploy
1. Giải nén source.
2. Ghi đè toàn bộ source cũ trên GitHub (đặc biệt `src/` và `netlify/functions/`).
3. Không upload `.env` lên GitHub.
4. Netlify → Deploys → Trigger deploy → **Clear cache and deploy site**.
5. Sau khi xanh, trình duyệt Windows dùng `Ctrl + F5`.

## Kiểm tra sau deploy
- Staff đủ quyền thấy: Tổng quan, Tạo bảo hành mua mới, Tiếp nhận hàng lỗi, Hồ sơ bảo hành, Tra cứu khách hàng.
- Admin có thêm: Nhân viên & phân quyền, Nhật ký thay đổi.
- Tạo bảo hành với 2 sản phẩm trên một hóa đơn và kiểm tra tra cứu lại.
- Tiếp nhận sản phẩm lỗi từ sản phẩm đã lưu, thêm lịch hẹn và file ảnh.
- Admin bỏ một quyền của staff → đăng nhập staff và kiểm tra menu/API đều bị chặn đúng.
