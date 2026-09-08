-- Warranty Management Core V0.1.1.2
-- LEGACY SCHEMA COMPATIBILITY
-- Chạy file này MỘT LẦN trên database hiện tại.
-- KHÔNG chạy schema.sql / upgrade_v0.1.1.sql / upgrade_v0.1.1.1.sql nữa.

begin;

-- 1) Profiles: giữ tương thích cả is_active (schema cũ) và active (UI mới)
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists active boolean default true;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists archived_at timestamptz;
alter table public.profiles add column if not exists employee_code text;
alter table public.profiles add column if not exists department text;

update public.profiles p
set email = coalesce(p.email, u.email)
from auth.users u
where p.id = u.id and p.email is null;

update public.profiles
set active = coalesce(active, is_active, true),
    is_active = coalesce(is_active, active, true);

-- Tạo username cho tài khoản cũ, ưu tiên mã NV rồi đến phần trước @ của email.
update public.profiles
set username = lower(regexp_replace(coalesce(nullif(employee_code,''), split_part(coalesce(email,''),'@',1), 'user_' || left(id::text,8)), '[^a-zA-Z0-9._-]+', '', 'g'))
where username is null or btrim(username)='';

-- Xử lý username trùng bằng hậu tố ngắn từ UUID.
with d as (
  select id, username, row_number() over(partition by lower(username) order by created_at,id) rn
  from public.profiles where username is not null
)
update public.profiles p
set username = p.username || '_' || left(p.id::text,4)
from d where d.id=p.id and d.rn>1;

create unique index if not exists profiles_username_lower_uq on public.profiles(lower(username)) where username is not null;

-- 2) Bổ sung thông tin hóa đơn và xóa mềm ngay trên bảng products hiện có.
alter table public.products add column if not exists invoice_number text;
alter table public.products add column if not exists archived_at timestamptz;
alter table public.products add column if not exists archived_by uuid;
alter table public.products add column if not exists archive_reason text;

-- 3) Hồ sơ dịch vụ cũng hỗ trợ lưu trữ mềm để không mất lịch sử.
alter table public.service_cases add column if not exists archived_at timestamptz;
alter table public.service_cases add column if not exists archived_by uuid;
alter table public.service_cases add column if not exists archive_reason text;

-- 4) Index phục vụ tra cứu nhanh.
create index if not exists products_customer_id_idx on public.products(customer_id);
create index if not exists products_serial_number_idx on public.products(serial_number);
create index if not exists products_sku_idx on public.products(sku);
create index if not exists products_invoice_number_idx on public.products(invoice_number);
create index if not exists customers_phone_idx on public.customers(phone);
create index if not exists service_cases_product_id_idx on public.service_cases(product_id);
create index if not exists service_cases_customer_id_idx on public.service_cases(customer_id);
create index if not exists service_cases_case_code_idx on public.service_cases(case_code);
create index if not exists attachments_product_id_idx on public.attachments(product_id);
create index if not exists attachments_service_case_id_idx on public.attachments(service_case_id);

-- 5) Bucket private cho hóa đơn/file V0.1.1.2.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('warranty-files','warranty-files',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false;

commit;

-- Kiểm tra sau migration:
-- select column_name from information_schema.columns where table_schema='public' and table_name='products' order by ordinal_position;
-- select id,full_name,username,email,role,is_active,active from public.profiles;
