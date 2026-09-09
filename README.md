# Warranty Management Core V0.1.2.4.1

## Official Warranty Forms & Smart Printing

Nâng cấp từ V0.1.2.3, giữ nguyên toàn bộ luồng nghiệp vụ legacy và bổ sung hệ thống biểu mẫu chính thức BM-181 → BM-184.

### Tính năng mới
- BM-181.KD: Biên nhận bảo hành hàng điện gia dụng, 2 liên; có nút in ngay sau khi tiếp nhận và in lại trong chi tiết hồ sơ.
- BM-182.KD: Phiếu đổi hàng mới; chỉ bật khi hồ sơ có hình thức `free_exchange` hoặc `paid_exchange`.
- BM-183.KD: Bảng kê chuyển hàng về NCC; chọn nhiều hồ sơ trong danh sách rồi in chung một bảng kê.
- BM-184.KD: Sổ theo dõi danh mục hàng bảo hành tháng; tự lấy hồ sơ trong tháng hiện tại.
- Ghi nhật ký biểu mẫu đã tạo vào `generated_documents` để tra lại lịch sử in.
- Sau khi hoàn tất tiếp nhận, tự mở chi tiết hồ sơ với khối "Tiếp nhận thành công" và nút In BM-181.

### Nguồn biểu mẫu
Bản gốc người dùng cung cấp được giữ trong `templates/official/` để làm chuẩn đối chiếu:
- BM-181.KD.docx
- BM-182.KD.xlsx
- BM-183.KD.xlsx
- BM-184.KD.xlsx

### Database
Không cần chạy SQL mới nếu đang chạy V0.1.2.3/V0.1.2.2 đầy đủ. Bản này chỉ sử dụng bảng hiện có `generated_documents` để lưu lịch sử tạo biểu mẫu.

### Deploy
1. Ghi đè source V0.1.2.4 lên GitHub.
2. Giữ nguyên 4 Environment Variables trên Netlify.
3. Netlify → Deploys → Trigger deploy → Clear cache and deploy site.
4. Sau deploy nhấn Ctrl + F5.

### Kiểm tra nhanh
1. Tiếp nhận một hàng lỗi → Hoàn tất tiếp nhận → phải thấy nút **In BM-181 ngay**.
2. Hồ sơ đổi hàng → mở chi tiết → nút **BM-182** được bật.
3. Hồ sơ bảo hành → tick 2+ hồ sơ → **In BM-183**.
4. Hồ sơ bảo hành → **In BM-184 tháng này**.


## Hotfix V0.1.2.4.1
- Sửa lỗi Chrome mở BM ra `about:blank` nhưng không ghi nội dung.
- Bỏ `noopener,noreferrer` khỏi `window.open` để giữ WindowProxy, sau đó chủ động đặt `opener = null`.
- Không thay đổi database hoặc SQL.
