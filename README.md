# Warranty Management Core V0.1.1

Web app quản lý hóa đơn và bảo hành chạy trên trình duyệt, dùng **Netlify + Supabase**.

## Tính năng V0.1.1

- Đăng nhập Supabase Auth.
- Dashboard thống kê, loại trừ hồ sơ đã lưu trữ.
- Tạo hồ sơ bảo hành: khách hàng, hóa đơn, ảnh hóa đơn private, nhiều sản phẩm.
- Tra cứu theo SĐT, tên khách, mã hóa đơn, mã hàng, tên sản phẩm, Serial/IMEI.
- Xem chi tiết hóa đơn và ảnh bằng signed URL.
- Sửa hồ sơ bảo hành có phân quyền.
- Admin quản lý nhân viên ngay trên web: tạo, sửa thông tin, đổi quyền, khóa/mở khóa, đặt lại mật khẩu, lưu trữ/khôi phục.
- Xóa hóa đơn theo kiểu **soft delete** để không mất lịch sử.
- Audit log tự động cho khách hàng, hóa đơn, sản phẩm; log quản trị nhân viên được ghi từ Netlify Function.
- 3 quyền: `admin`, `staff`, `viewer`.

## Quyền

### Admin
- Xem/tạo/sửa toàn bộ hồ sơ.
- Sửa thông tin khách hàng.
- Lưu trữ/khôi phục hồ sơ bảo hành.
- Quản lý tài khoản nhân viên và phân quyền.
- Xem Audit Log.

### Staff
- Tạo hồ sơ.
- Tra cứu toàn bộ hồ sơ đang hoạt động.
- Chỉ sửa hóa đơn/sản phẩm thuộc hồ sơ do chính mình tạo.
- Không được lưu trữ hóa đơn, quản lý nhân viên hoặc xem Audit Log.

### Viewer
- Chỉ tra cứu và xem hồ sơ/ảnh hóa đơn.

## Cài mới Supabase

1. Tạo project Supabase.
2. Mở **SQL Editor**.
3. Chạy toàn bộ file `supabase/schema.sql`.
4. Trong **Authentication > Users**, tạo user Admin đầu tiên.
5. Chạy SQL sau để cấp quyền Admin đầu tiên (thay email):

```sql
update public.profiles p
set role='admin', active=true
from auth.users u
where p.id=u.id and u.email='admin@example.com';
```

## Nâng cấp từ V0.1.0

Nếu database đang chạy V0.1.0, **không chạy lại schema.sql**. Chỉ chạy:

`supabase/upgrade_v0.1.1.sql`

Sau đó deploy source V0.1.1 lên Netlify.

## Environment Variables trên Netlify

Vào **Site configuration > Environment variables**, tạo 4 biến:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` chỉ được dùng trong Netlify Function. **Không đặt tên biến này bắt đầu bằng `VITE_`**, không đưa key vào code frontend và không commit file `.env` lên GitHub.

## Chạy local

```bash
npm install
npm run dev
```

Để test cả Netlify Function ở local, nên dùng Netlify CLI:

```bash
npm install -g netlify-cli
netlify dev
```

## Deploy Netlify

- Push thư mục project lên GitHub.
- Import repository vào Netlify.
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory đã được khai báo trong `netlify.toml` là `netlify/functions`.
- Thêm 4 Environment Variables ở trên.
- Deploy.

## Cấu trúc chính

```text
src/
  pages/
    Dashboard.tsx
    Login.tsx
    NewWarranty.tsx
    Search.tsx
    WarrantyDetail.tsx
    Employees.tsx
    AuditLogs.tsx
  lib/
    supabase.ts
    profile.ts
    employeeAdmin.ts
netlify/
  functions/
    employee-admin.mjs
supabase/
  schema.sql
  upgrade_v0.1.1.sql
```

## Cơ chế xóa có kiểm soát

- Nút "Xóa / lưu trữ hồ sơ" chỉ xuất hiện với Admin.
- Hóa đơn được đánh dấu `deleted_at`, `deleted_by`, `delete_reason` thay vì xóa vật lý.
- Hồ sơ đã lưu trữ không xuất hiện trong search hoặc dashboard thông thường.
- Admin có thể mở lại URL chi tiết và khôi phục hồ sơ.
- Tài khoản nhân viên "xóa" cũng là lưu trữ + khóa đăng nhập, để không mất dấu lịch sử người đã thao tác dữ liệu.

## Ghi chú bảo mật

- Bucket `receipts` là private.
- Ảnh chỉ mở bằng signed URL ngắn hạn.
- RLS bảo vệ database.
- Service Role Key chỉ tồn tại ở Netlify Function phía server.
- Audit Log chỉ Admin đọc được.
