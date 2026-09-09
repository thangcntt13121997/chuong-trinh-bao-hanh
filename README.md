# Warranty Management Core V0.1.2.3

## Case Count & Legacy Customer Flow Hotfix

Bản này sửa 2 lỗi vận hành của V0.1.2.2:

1. Menu **Hồ sơ bảo hành** lấy số lượng hồ sơ thực tế từ `service_cases` thay vì hiển thị số cố định/không đồng bộ. Số được làm mới khi đổi trang.
2. Luồng **Khởi tạo dữ liệu khách cũ** được hiển thị cố định ở menu desktop và ngay đầu trang **Tiếp nhận hàng lỗi**, không cần phải tìm thất bại mới thấy nút.

Không cần SQL mới nếu đã chạy migration V0.1.2.2.

Sau khi upload lên GitHub, dùng **Clear cache and deploy site** trên Netlify rồi nhấn Ctrl+F5.
