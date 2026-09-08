-- V0.1.1.3 - Permission Repair + Receive Faulty Workflow
-- Chạy sau V0.1.1.2. Không xóa dữ liệu hiện tại.

alter table public.profiles
  add column if not exists permissions jsonb;

-- Admin luôn được toàn quyền. Staff cũ được cấp đầy đủ quyền nghiệp vụ mặc định.
update public.profiles
set permissions = case
  when role = 'admin' then jsonb_build_object(
    'create_warranty', true,
    'receive_faulty', true,
    'search', true,
    'view_cases', true,
    'edit_cases', true,
    'manage_appointments', true,
    'upload_files', true
  )
  when role = 'staff' then coalesce(permissions, '{}'::jsonb) || jsonb_build_object(
    'create_warranty', true,
    'receive_faulty', true,
    'search', true,
    'view_cases', true,
    'edit_cases', true,
    'manage_appointments', true,
    'upload_files', true
  )
  else coalesce(permissions, '{}'::jsonb) || jsonb_build_object(
    'create_warranty', false,
    'receive_faulty', false,
    'search', true,
    'view_cases', true,
    'edit_cases', false,
    'manage_appointments', false,
    'upload_files', false
  )
end;

alter table public.profiles
  alter column permissions set default '{}'::jsonb;

-- Đồng bộ hai cột trạng thái đã tồn tại từ các phiên bản trước.
update public.profiles
set active = coalesce(active, is_active, true),
    is_active = coalesce(is_active, active, true);

-- Đảm bảo username của tài khoản cũ không bị trống nếu đã có email.
update public.profiles
set username = lower(split_part(email, '@', 1))
where (username is null or btrim(username) = '')
  and email is not null
  and email like '%@%';

-- Reload schema cache để PostgREST nhận ngay cột mới.
notify pgrst, 'reload schema';
