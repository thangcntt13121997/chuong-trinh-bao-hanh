# Warranty Management Core V0.1.1.3

## Permission Repair & Old UI Restore

Bản này nâng trực tiếp từ V0.1.1.2 và giữ nguyên database legacy hiện tại.

### Thay đổi chính
- Khôi phục giao diện vận hành gần với bản cũ, đặc biệt trên điện thoại.
- Thanh menu dưới mobile: Tổng quan / Bảo hành mua mới / Tiếp nhận hàng lỗi / Hồ sơ bảo hành.
- Bổ sung màn hình **Tiếp nhận hàng lỗi** riêng: tìm sản phẩm đã mua -> chọn sản phẩm -> ghi nhận lỗi/tình trạng/phụ kiện -> tạo hồ sơ xử lý.
- Dashboard quay lại kiểu vận hành: hồ sơ đang xử lý, chờ NCC, lịch sắp tới, quá hạn trả khách, hồ sơ mới tiếp nhận và lịch sắp tới.
- Phân quyền nhân viên theo từng chức năng bằng checkbox. Quyền được kiểm tra tại Netlify Function phía server.
- Staff cũ sau migration được cấp đủ quyền nghiệp vụ mặc định, tránh tình trạng đã phân quyền nhưng giao diện/API không hiểu.
- Profile giao diện lấy qua API server thay vì truy vấn trực tiếp bảng profiles, tránh lỗi do RLS cũ làm menu biến mất.

## Nâng cấp từ V0.1.1.2
1. Supabase -> SQL Editor.
2. Chạy duy nhất:
   `supabase/upgrade_v0.1.1.3_permissions_and_ui.sql`
3. Upload toàn bộ source V0.1.1.3 lên GitHub để ghi đè source hiện tại.
4. Giữ nguyên 4 biến Netlify:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PUBLISHABLE_KEY
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
5. Netlify -> Deploys -> Trigger deploy -> Clear cache and deploy site.

## Kiểm tra sau deploy
- Admin `it` vào Nhân viên -> chọn một nhân viên -> bấm **Đủ quyền nhân viên** -> **Lưu thay đổi & quyền**.
- Đăng xuất, đăng nhập tài khoản nhân viên đó.
- Menu phải có Bảo hành mua mới, Tiếp nhận hàng lỗi, Tra cứu và Hồ sơ bảo hành.
- Tạo thử một hồ sơ tiếp nhận hàng lỗi từ sản phẩm đã lưu.

Không chạy lại schema.sql hoặc migration V0.1.1/V0.1.1.1 cũ.
