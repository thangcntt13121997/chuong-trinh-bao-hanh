# Chương trình Quản lý Bảo hành V0.1.0.1

Ứng dụng web dành cho siêu thị, số hóa quy trình từ các biểu mẫu BM-181, BM-182, BM-183 và BM-184.

## Tính năng đã có

- Đăng nhập nhân viên bằng Supabase Auth.
- Tạo bảo hành cho thiết bị mua mới; bắt buộc ảnh hóa đơn.
- Tra cứu khách theo họ tên hoặc số điện thoại; xem sản phẩm và lịch sử bảo hành.
- Tiếp nhận sản phẩm lỗi; dùng sản phẩm đã lưu hoặc tạo dữ liệu mới; bắt buộc ảnh hiện trạng.
- Ghi lỗi, tình trạng, nguyên nhân, hướng xử lý, phí dự kiến, NCC và ngày hẹn trả.
- Theo dõi vòng đời: Đã tiếp nhận → Chưa chuyển BH → Đã chuyển NCC → NCC trả → Chờ khách → Đã trả khách.
- Dashboard, lịch hẹn, cảnh báo quá hạn, nhật ký đổi trạng thái.
- Phân quyền nền tảng admin/staff/viewer, RLS và kho ảnh riêng tư.
- Chế độ dùng thử bằng localStorage khi chưa khai báo Supabase.
- Tự chốt bản in sau khi hoàn thành bước nghiệp vụ; bản đã chốt không đổi khi hồ sơ bị chỉnh sửa sau này.
- In đúng luồng: tiếp nhận hàng lỗi → BM-181; đổi hàng → BM-182; chuyển NCC → BM-183; sổ tháng → BM-184.
- Hàng mua mới có Phiếu xác nhận thông tin bảo hành và có thể in ngay.
- Mọi biểu mẫu đã chốt được lưu trong hồ sơ để in lại.

## Chạy thử trên máy tính

Yêu cầu Node.js 20 trở lên.

```bash
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị, thường là `http://localhost:5173`. Khi chưa có `.env`, bấm **Vào bản dùng thử**.

## Kết nối Supabase

1. Tạo project tại Supabase.
2. Với dự án mới, mở **SQL Editor**, dán và chạy toàn bộ `supabase/schema.sql`. Nếu đã chạy V0.1.0 trước đây, chỉ chạy `supabase/migrations/002_print_snapshots.sql`.
3. Vào **Authentication → Users**, tạo tài khoản nhân viên đầu tiên.
4. Trong SQL Editor, đổi tài khoản đầu tiên thành quản trị bằng câu lệnh ở cuối `schema.sql`.
5. Sao chép `.env.example` thành `.env` và điền Project URL cùng anon/public key.
6. Chạy lại `npm run dev`, đăng nhập bằng tài khoản vừa tạo.

Ảnh được lưu trong bucket riêng tư `warranty-files`, giới hạn 10 MB/ảnh. RLS chỉ cho tài khoản đang hoạt động truy cập.

## Đưa lên GitHub và Netlify

1. Tạo repository GitHub mới và tải toàn bộ thư mục này lên.
2. Trong Netlify chọn **Add new site → Import an existing project → GitHub**.
3. Build command: `npm run build`; Publish directory: `dist` (đã có trong `netlify.toml`).
4. Vào **Site configuration → Environment variables**, thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.
5. Deploy lại site.

## Dữ liệu nghiệp vụ được kế thừa từ biểu mẫu

- BM-181: biên nhận, khách hàng, sản phẩm, tình trạng, nguyên nhân, hướng xử lý, ngày nhận/trả; cảnh báo 60 ngày và phản hồi trong 3 ngày làm việc.
- BM-182: nhánh đổi mới miễn phí, đổi bù tiền hoặc trả hàng.
- BM-183: thông tin chuyển nhà cung cấp, phân loại và hiện trạng phụ kiện/niêm phong.
- BM-184: sổ theo dõi tập trung và bốn mốc kết quả xử lý.

## Ghi chú phiên bản

V0.1.0.1 bổ sung in biểu mẫu theo quy trình và cơ chế lưu bản chốt bất biến. Quản lý tài khoản trực tiếp trên giao diện, sửa/xóa có kiểm soát và nhật ký chi tiết vẫn là phạm vi mở rộng tiếp theo.
