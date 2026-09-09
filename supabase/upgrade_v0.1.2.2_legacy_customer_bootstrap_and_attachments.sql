-- V0.1.2.2 - Legacy customer bootstrap & attachment compatibility
-- Không xóa dữ liệu. Chỉ nới CHECK constraint kind để tương thích ảnh hóa đơn và ảnh tiếp nhận mới.

alter table if exists public.attachments
  drop constraint if exists attachments_check;

alter table if exists public.attachments
  drop constraint if exists attachments_kind_check;

alter table if exists public.attachments
  drop constraint if exists attachments_kind_nonempty_check;

alter table if exists public.attachments
  add constraint attachments_kind_nonempty_check
  check (char_length(trim(kind)) > 0);

-- Các kind chương trình sử dụng từ phiên bản này:
-- receipt = hóa đơn/chứng từ mua hàng
-- service = ảnh hàng lỗi/phụ kiện/phiếu tiếp nhận
-- Các kind legacy khác vẫn được giữ nguyên và tiếp tục hợp lệ.
