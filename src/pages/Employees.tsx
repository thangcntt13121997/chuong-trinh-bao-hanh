import { FormEvent, useEffect, useState } from 'react'
import { employeeAdmin } from '../lib/employeeAdmin'
import { getMyProfile, type AppRole, type PermissionKey, type Profile } from '../lib/profile'

const permissionOptions:{key:PermissionKey;label:string;hint:string}[]=[
  {key:'create_warranty',label:'Tạo bảo hành mua mới',hint:'Lưu khách hàng, sản phẩm và hóa đơn'},
  {key:'receive_faulty',label:'Tiếp nhận hàng lỗi',hint:'Tạo hồ sơ bảo hành/sửa chữa'},
  {key:'search',label:'Tra cứu',hint:'Tìm khách hàng, sản phẩm và hồ sơ'},
  {key:'view_cases',label:'Xem hồ sơ bảo hành',hint:'Xem danh sách và chi tiết xử lý'},
  {key:'edit_cases',label:'Cập nhật hồ sơ',hint:'Đổi trạng thái, ghi chú, nhà cung cấp'},
  {key:'manage_appointments',label:'Quản lý lịch hẹn',hint:'Tạo lịch trả khách / nhà cung cấp'},
  {key:'upload_files',label:'Tải ảnh và file',hint:'Ảnh hóa đơn, sản phẩm lỗi, tài liệu'},
]
const fullStaff=Object.fromEntries(permissionOptions.map(x=>[x.key,true])) as Record<PermissionKey,boolean>
const viewerPerms={create_warranty:false,receive_faulty:false,search:true,view_cases:true,edit_cases:false,manage_appointments:false,upload_files:false}
const empty = { full_name: '', employee_code: '', username: '', email: '', password: '', department: '', role: 'staff' as AppRole, permissions:{...fullStaff} }

export default function Employees() {
  const [me,setMe]=useState<Profile|null>(null),[rows,setRows]=useState<Profile[]>([]),[form,setForm]=useState(empty),[editing,setEditing]=useState<Profile|null>(null),[showArchived,setShowArchived]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  useEffect(()=>{ void init() },[])
  async function init(){ const p=await getMyProfile(); setMe(p); if(p?.role==='admin') await load() }
  async function load(){ try{const data=await employeeAdmin({action:'list'}) as {rows:Profile[]};setRows(data.rows||[])}catch(e){setMessage(e instanceof Error?e.message:'Không tải được danh sách nhân viên')} }
  async function act(payload:Record<string,unknown>, ok:string){ try{setBusy(true);setMessage('');await employeeAdmin(payload);setMessage(ok);setEditing(null);await load()}catch(e){setMessage(e instanceof Error?e.message:'Có lỗi xảy ra')}finally{setBusy(false)} }
  async function create(e:FormEvent){e.preventDefault();await act({action:'create',...form},'Đã tạo tài khoản và áp dụng quyền nhân viên.');setForm(empty)}
  const setRole=(role:AppRole)=>setForm({...form,role,permissions:role==='viewer'?{...viewerPerms}:{...fullStaff}})
  if(me && me.role!=='admin') return <div className="card"><h2>Không có quyền truy cập</h2><p>Chỉ Admin được quản lý tài khoản nhân viên.</p></div>
  const visible=rows.filter(r=>showArchived?true:!r.archived_at)
  return <>
    <div className="page-head old-head"><div><h1>Quản lý nhân viên</h1><p>Phân quyền theo từng chức năng. Quyền được kiểm tra ở máy chủ, không chỉ ẩn nút trên giao diện.</p></div></div>
    <form className="card form-grid" onSubmit={create}>
      <h2>Thêm nhân viên</h2>
      <label>Họ tên *<input required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label><label>Mã nhân viên *<input required value={form.employee_code} onChange={e=>setForm({...form,employee_code:e.target.value})}/></label>
      <label>Tên đăng nhập *<input required value={form.username} onChange={e=>setForm({...form,username:e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g,'')})} placeholder="Ví dụ: nv001"/></label><label>Email (không bắt buộc)<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Để trống nếu không sử dụng"/></label>
      <label>Mật khẩu ban đầu *<input required minLength={8} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><label>Bộ phận<input value={form.department} onChange={e=>setForm({...form,department:e.target.value})}/></label>
      <label>Nhóm quyền<select value={form.role} onChange={e=>setRole(e.target.value as AppRole)}><option value="viewer">Chỉ tra cứu</option><option value="staff">Nhân viên</option><option value="admin">Admin</option></select></label>
      {form.role!=='admin'&&<div className="wide permission-panel"><div className="permission-head"><div><b>Quyền sử dụng chức năng</b><p>Đánh dấu đúng những chức năng nhân viên được phép dùng.</p></div><button type="button" className="ghost small" onClick={()=>setForm({...form,permissions:{...fullStaff}})}>Chọn đủ quyền nhân viên</button></div><div className="permission-grid">{permissionOptions.map(x=><label className="permission-item" key={x.key}><input type="checkbox" checked={Boolean(form.permissions[x.key])} onChange={e=>setForm({...form,permissions:{...form.permissions,[x.key]:e.target.checked}})}/><span><b>{x.label}</b><small>{x.hint}</small></span></label>)}</div></div>}
      <div className="wide actions"><span className="muted">Admin luôn có toàn bộ quyền. Nhân viên đăng nhập bằng tên đăng nhập.</span><button className="primary" disabled={busy}>Tạo nhân viên</button></div>
    </form>
    <div className="toolbar"><label className="check"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/> Hiện tài khoản đã lưu trữ</label></div>{message&&<div className="alert">{message}</div>}
    <div className="table-wrap card"><table><thead><tr><th>Mã NV</th><th>Họ tên</th><th>Tên đăng nhập</th><th>Bộ phận</th><th>Nhóm quyền</th><th>Trạng thái</th><th></th></tr></thead><tbody>{visible.map(r=><tr key={r.id}><td>{r.employee_code||'—'}</td><td>{r.full_name||'—'}</td><td>{r.username||'—'}</td><td>{r.department||'—'}</td><td>{r.role==='admin'?'Admin':r.role==='staff'?'Nhân viên':'Tra cứu'}</td><td>{r.archived_at?'Đã lưu trữ':r.active===false||r.is_active===false?'Đã khóa':'Đang hoạt động'}</td><td><button className="ghost small" onClick={()=>setEditing({...r,permissions:r.permissions||{...(r.role==='viewer'?viewerPerms:fullStaff)}})}>Phân quyền</button></td></tr>)}</tbody></table></div>
    {editing&&<div className="modal-backdrop"><div className="modal card"><div className="modal-head"><h2>{editing.full_name}</h2><button className="ghost" onClick={()=>setEditing(null)}>Đóng</button></div>
      <label>Họ tên<input value={editing.full_name||''} onChange={e=>setEditing({...editing,full_name:e.target.value})}/></label><label>Mã nhân viên<input value={editing.employee_code||''} onChange={e=>setEditing({...editing,employee_code:e.target.value})}/></label><label>Tên đăng nhập<input value={editing.username||''} onChange={e=>setEditing({...editing,username:e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g,'')})}/></label><label>Bộ phận<input value={editing.department||''} onChange={e=>setEditing({...editing,department:e.target.value})}/></label>
      <label>Nhóm quyền<select value={editing.role} onChange={e=>{const role=e.target.value as AppRole;setEditing({...editing,role,permissions:role==='viewer'?{...viewerPerms}:role==='staff'?{...fullStaff}:editing.permissions})}}><option value="viewer">Chỉ tra cứu</option><option value="staff">Nhân viên</option><option value="admin">Admin</option></select></label>
      {editing.role!=='admin'&&<div className="permission-panel"><div className="permission-head"><div><b>Quyền của tài khoản</b><p>Thay đổi có hiệu lực ngay sau khi bấm Lưu.</p></div><button type="button" className="ghost small" onClick={()=>setEditing({...editing,permissions:{...fullStaff}})}>Đủ quyền nhân viên</button></div><div className="permission-grid">{permissionOptions.map(x=><label className="permission-item" key={x.key}><input type="checkbox" checked={Boolean(editing.permissions?.[x.key])} onChange={e=>setEditing({...editing,permissions:{...(editing.permissions||{}),[x.key]:e.target.checked}})}/><span><b>{x.label}</b><small>{x.hint}</small></span></label>)}</div></div>}
      <div className="stack-actions"><button className="primary" disabled={busy} onClick={()=>act({action:'update',user_id:editing.id,full_name:editing.full_name,employee_code:editing.employee_code,username:editing.username,department:editing.department,role:editing.role,permissions:editing.permissions},'Đã cập nhật và áp dụng quyền nhân viên.')}>Lưu thay đổi & quyền</button>{!editing.archived_at&&<button className="ghost" disabled={busy} onClick={()=>act({action:'set_active',user_id:editing.id,active:!(editing.active!==false&&editing.is_active!==false)},editing.active!==false&&editing.is_active!==false?'Đã khóa tài khoản.':'Đã mở khóa tài khoản.')}>{editing.active!==false&&editing.is_active!==false?'Khóa tài khoản':'Mở khóa tài khoản'}</button>}{!editing.archived_at?<button className="danger-btn" disabled={busy} onClick={()=>{if(confirm('Lưu trữ tài khoản này? Dữ liệu lịch sử vẫn được giữ lại.'))void act({action:'archive',user_id:editing.id},'Đã lưu trữ tài khoản.')}}>Xóa / lưu trữ</button>:<button className="ghost" disabled={busy} onClick={()=>act({action:'restore',user_id:editing.id},'Đã khôi phục tài khoản.')}>Khôi phục</button>}<button className="ghost" disabled={busy} onClick={()=>{const p=prompt('Nhập mật khẩu mới (tối thiểu 8 ký tự)');if(p)void act({action:'reset_password',user_id:editing.id,password:p},'Đã đặt lại mật khẩu.')}}>Đặt lại mật khẩu</button></div>
    </div></div>}
  </>
}
