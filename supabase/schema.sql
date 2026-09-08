-- Warranty Management Core V0.1.1
-- Chạy toàn bộ file này trong Supabase SQL Editor trên project mới.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin','staff','viewer');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  employee_code text unique,
  role public.app_role not null default 'viewer',
  department text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  phone text not null unique,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  purchase_date date not null,
  receipt_image_path text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(invoice_number, purchase_date)
);

create table if not exists public.warranty_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_code text,
  product_name text not null,
  brand text,
  serial_number text,
  warranty_months integer not null check(warranty_months between 1 and 120),
  purchase_date date not null,
  warranty_expiry_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_phone on public.customers(phone);
create index if not exists idx_invoices_number on public.invoices(invoice_number);
create index if not exists idx_warranty_product_code on public.warranty_items(product_code);
create index if not exists idx_warranty_serial on public.warranty_items(serial_number);
create index if not exists idx_warranty_expiry on public.warranty_items(warranty_expiry_date);

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() and active = true $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict(id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.invoices enable row level security;
alter table public.warranty_items enable row level security;

-- Profile: mọi user đang hoạt động xem được hồ sơ của chính mình; admin xem/sửa tất cả.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (id = auth.uid() or public.current_user_role() = 'admin');
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles for update to authenticated
using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

-- Viewer được đọc. Staff/Admin được tạo. Admin được xóa. Staff có thể sửa dữ liệu nghiệp vụ.
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers for select to authenticated using (public.current_user_role() is not null);
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers for insert to authenticated with check (public.current_user_role() in ('admin','staff'));
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update to authenticated using (public.current_user_role() in ('admin','staff')) with check (public.current_user_role() in ('admin','staff'));
drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers for delete to authenticated using (public.current_user_role() = 'admin');

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select to authenticated using (public.current_user_role() is not null);
drop policy if exists invoices_insert on public.invoices;
create policy invoices_insert on public.invoices for insert to authenticated with check (public.current_user_role() in ('admin','staff') and created_by = auth.uid());
drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices for update to authenticated using (public.current_user_role() = 'admin' or (public.current_user_role() = 'staff' and created_by = auth.uid())) with check (public.current_user_role() = 'admin' or (public.current_user_role() = 'staff' and created_by = auth.uid()));
drop policy if exists invoices_delete on public.invoices;
create policy invoices_delete on public.invoices for delete to authenticated using (public.current_user_role() = 'admin' or (public.current_user_role() = 'staff' and created_by = auth.uid()));

drop policy if exists warranty_items_select on public.warranty_items;
create policy warranty_items_select on public.warranty_items for select to authenticated using (public.current_user_role() is not null);
drop policy if exists warranty_items_insert on public.warranty_items;
create policy warranty_items_insert on public.warranty_items for insert to authenticated with check (public.current_user_role() in ('admin','staff'));
drop policy if exists warranty_items_update on public.warranty_items;
create policy warranty_items_update on public.warranty_items for update to authenticated using (public.current_user_role() in ('admin','staff')) with check (public.current_user_role() in ('admin','staff'));
drop policy if exists warranty_items_delete on public.warranty_items;
create policy warranty_items_delete on public.warranty_items for delete to authenticated using (public.current_user_role() = 'admin');

-- Private receipt bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts','receipts',false,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public=false, file_size_limit=10485760;

drop policy if exists receipts_select on storage.objects;
create policy receipts_select on storage.objects for select to authenticated
using (bucket_id='receipts' and public.current_user_role() is not null);
drop policy if exists receipts_insert on storage.objects;
create policy receipts_insert on storage.objects for insert to authenticated
with check (bucket_id='receipts' and public.current_user_role() in ('admin','staff'));
drop policy if exists receipts_delete on storage.objects;
create policy receipts_delete on storage.objects for delete to authenticated
using (bucket_id='receipts' and public.current_user_role() = 'admin');

-- Hàm tìm kiếm tập trung. SECURITY INVOKER => vẫn tuân thủ RLS của user hiện tại.
create or replace function public.search_warranties(search_text text)
returns table (
  warranty_item_id uuid,
  invoice_id uuid,
  invoice_number text,
  purchase_date date,
  receipt_image_path text,
  customer_name text,
  phone text,
  product_code text,
  product_name text,
  serial_number text,
  warranty_expiry_date date
)
language sql
stable
security invoker
set search_path = public
as $$
  select wi.id, i.id, i.invoice_number, i.purchase_date, i.receipt_image_path,
         c.customer_name, c.phone, wi.product_code, wi.product_name, wi.serial_number,
         wi.warranty_expiry_date
  from public.warranty_items wi
  join public.invoices i on i.id = wi.invoice_id
  join public.customers c on c.id = i.customer_id
  where
    c.phone ilike '%' || search_text || '%'
    or coalesce(c.customer_name,'') ilike '%' || search_text || '%'
    or i.invoice_number ilike '%' || search_text || '%'
    or coalesce(wi.product_code,'') ilike '%' || search_text || '%'
    or wi.product_name ilike '%' || search_text || '%'
    or coalesce(wi.serial_number,'') ilike '%' || search_text || '%'
  order by i.purchase_date desc, wi.created_at desc
  limit 100;
$$;

grant execute on function public.search_warranties(text) to authenticated;


-- ===== V0.1.1 additions =====
-- Warranty Management Core V0.1.1 upgrade
-- Chạy file này MỘT LẦN nếu project Supabase đang ở V0.1.0.

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists archived_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();



create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, email)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email)
  on conflict(id) do update set email = excluded.email;
  return new;
end;
$$;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is distinct from u.email;

alter table public.invoices add column if not exists deleted_at timestamptz;
alter table public.invoices add column if not exists deleted_by uuid references auth.users(id);
alter table public.invoices add column if not exists delete_reason text;
alter table public.invoices add column if not exists updated_at timestamptz not null default now();

alter table public.customers add column if not exists updated_at timestamptz not null default now();
alter table public.warranty_items add column if not exists updated_at timestamptz not null default now();

create table if not exists public.audit_logs (
  id bigint generated by default as identity primary key,
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_user_id);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin on public.audit_logs for select to authenticated
using (public.current_user_role() = 'admin');

-- Không cho client tự ghi/xóa audit log. Các trigger DB và Netlify Function (service role) sẽ ghi.

drop policy if exists audit_logs_insert_client on public.audit_logs;
drop policy if exists audit_logs_update_client on public.audit_logs;
drop policy if exists audit_logs_delete_client on public.audit_logs;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger customers_set_updated_at before update on public.customers for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger invoices_set_updated_at before update on public.invoices for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger warranty_items_set_updated_at before update on public.warranty_items for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

create or replace function public.audit_business_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_id text;
begin
  row_id := coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, null);
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, old_data, new_data)
  values(
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    row_id,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists audit_customers on public.customers;
create trigger audit_customers after insert or update or delete on public.customers
for each row execute function public.audit_business_change();

drop trigger if exists audit_invoices on public.invoices;
create trigger audit_invoices after insert or update or delete on public.invoices
for each row execute function public.audit_business_change();

drop trigger if exists audit_warranty_items on public.warranty_items;
create trigger audit_warranty_items after insert or update or delete on public.warranty_items
for each row execute function public.audit_business_change();

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles
  where id = auth.uid() and active = true and archived_at is null
$$;

create or replace function public.can_edit_invoice(target_invoice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.invoices i
    where i.id = target_invoice_id
      and i.deleted_at is null
      and (
        public.current_user_role() = 'admin'
        or (public.current_user_role() = 'staff' and i.created_by = auth.uid())
      )
  )
$$;

-- Staff chỉ sửa item thuộc hóa đơn do chính mình tạo; Admin sửa được tất cả.
drop policy if exists warranty_items_update on public.warranty_items;
create policy warranty_items_update on public.warranty_items for update to authenticated
using (public.can_edit_invoice(invoice_id))
with check (public.can_edit_invoice(invoice_id));

drop policy if exists warranty_items_insert on public.warranty_items;
create policy warranty_items_insert on public.warranty_items for insert to authenticated
with check (public.current_user_role() in ('admin','staff') and public.can_edit_invoice(invoice_id));

drop policy if exists warranty_items_delete on public.warranty_items;
create policy warranty_items_delete on public.warranty_items for delete to authenticated
using (public.current_user_role() = 'admin' or public.can_edit_invoice(invoice_id));

-- Chỉ Admin được thay đổi trạng thái xóa mềm của hóa đơn.
create or replace function public.protect_invoice_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.deleted_at is distinct from new.deleted_at
      or old.deleted_by is distinct from new.deleted_by
      or old.delete_reason is distinct from new.delete_reason)
     and public.current_user_role() <> 'admin' then
    raise exception 'Chỉ Admin được lưu trữ/khôi phục hóa đơn';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_invoice_soft_delete_trigger on public.invoices;
create trigger protect_invoice_soft_delete_trigger before update on public.invoices
for each row execute function public.protect_invoice_soft_delete();

-- Search V0.1.1: bỏ các hóa đơn đã lưu trữ.
create or replace function public.search_warranties(search_text text)
returns table (
  warranty_item_id uuid,
  invoice_id uuid,
  invoice_number text,
  purchase_date date,
  receipt_image_path text,
  customer_name text,
  phone text,
  product_code text,
  product_name text,
  serial_number text,
  warranty_expiry_date date
)
language sql
stable
security invoker
set search_path = public
as $$
  select wi.id, i.id, i.invoice_number, i.purchase_date, i.receipt_image_path,
         c.customer_name, c.phone, wi.product_code, wi.product_name, wi.serial_number,
         wi.warranty_expiry_date
  from public.warranty_items wi
  join public.invoices i on i.id = wi.invoice_id
  join public.customers c on c.id = i.customer_id
  where i.deleted_at is null
    and (
      c.phone ilike '%' || search_text || '%'
      or coalesce(c.customer_name,'') ilike '%' || search_text || '%'
      or i.invoice_number ilike '%' || search_text || '%'
      or coalesce(wi.product_code,'') ilike '%' || search_text || '%'
      or wi.product_name ilike '%' || search_text || '%'
      or coalesce(wi.serial_number,'') ilike '%' || search_text || '%'
    )
  order by i.purchase_date desc, wi.created_at desc
  limit 100;
$$;

grant execute on function public.search_warranties(text) to authenticated;

-- Siết quyền xem/xóa vật lý và cập nhật khách hàng.
create or replace function public.can_view_invoice(target_invoice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.invoices i
    where i.id = target_invoice_id
      and (i.deleted_at is null or public.current_user_role() = 'admin')
  )
$$;

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select to authenticated
using (public.current_user_role() is not null and (deleted_at is null or public.current_user_role() = 'admin'));

drop policy if exists warranty_items_select on public.warranty_items;
create policy warranty_items_select on public.warranty_items for select to authenticated
using (public.current_user_role() is not null and public.can_view_invoice(invoice_id));

drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update to authenticated
using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

drop policy if exists invoices_delete on public.invoices;
create policy invoices_delete on public.invoices for delete to authenticated
using (
  public.current_user_role() = 'admin'
  or (
    public.current_user_role() = 'staff'
    and created_by = auth.uid()
    and created_at > now() - interval '10 minutes'
    and not exists (select 1 from public.warranty_items wi where wi.invoice_id = invoices.id)
  )
);

create or replace function public.dashboard_stats()
returns table(invoices bigint, items bigint, active bigint, expiring bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with valid_items as (
    select wi.* from public.warranty_items wi
    join public.invoices i on i.id = wi.invoice_id
    where i.deleted_at is null
  )
  select
    (select count(*) from public.invoices i where i.deleted_at is null),
    (select count(*) from valid_items),
    (select count(*) from valid_items where warranty_expiry_date >= current_date),
    (select count(*) from valid_items where warranty_expiry_date between current_date and current_date + 30)
$$;

grant execute on function public.dashboard_stats() to authenticated;
