# Warranty Management Core V0.1.1.4

## Permission Persistence + Full Faulty Item Intake

Bản vá trên V0.1.1.3, giữ nguyên database legacy hiện tại.

### Sửa lỗi phân quyền
- Tài khoản cũ không có `employee_code` vẫn lưu được quyền.
- Quyền tiếp tục được lưu tại `profiles.permissions`.
- Không bắt buộc chạy SQL mới nếu đã chạy migration V0.1.1.3.

### Khôi phục form Tiếp nhận hàng lỗi
Form sử dụng đầy đủ các trường có sẵn trong `service_cases`:
- Mã hồ sơ (có thể tự sinh)
- Thời điểm tiếp nhận
- Mô tả lỗi/yêu cầu khách
- Tình trạng ngoại quan
- Nhóm nguyên nhân/lỗi
- Hình thức xử lý
- Nhà cung cấp/TTBH
- Chi phí dự kiến
- Hẹn trả khách/xử lý xong
- Nhân viên phụ trách
- Phiếu bảo hành / tem / bao bì / hộp
- Nhiều ảnh sản phẩm lỗi/phụ kiện
- Ghi chú nội bộ

### Sửa tìm kiếm tiếp nhận
Có thể tìm sản phẩm bằng:
- Số điện thoại khách
- Tên khách
- Mã hóa đơn
- SKU
- Serial/IMEI
- Tên/brand/model sản phẩm

### Nâng cấp
1. Không chạy lại schema.sql hoặc các migration cũ.
2. Upload toàn bộ source V0.1.1.4 lên GitHub để ghi đè V0.1.1.3.
3. Giữ nguyên Environment Variables trên Netlify.
4. Netlify -> Deploys -> Trigger deploy -> Clear cache and deploy site.
5. Sau deploy nhấn Ctrl+F5.

### Kiểm tra quyền
Admin -> Nhân viên -> Phân quyền -> thay checkbox -> Lưu thay đổi & quyền.
Sau đó đăng xuất tài khoản nhân viên và đăng nhập lại để kiểm tra menu và quyền server.
