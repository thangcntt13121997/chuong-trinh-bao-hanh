import { FormEvent, useEffect, useState } from 'react'
import { employeeAdmin } from '../lib/employeeAdmin'
import { getMyProfile, type AppRole, type Profile } from '../lib/profile'

const empty = { full_name: '', employee_code: '', username: '', email: '', password: '', department: '', role: 'staff' as AppRole }

export default function Employees() {
  const [me,setMe]=useState<Profile|null>(null)
  const [rows,setRows]=useState<Profile[]>([])
  const [form,setForm]=useState(empty)
  const [editing,setEditing]=useState<Profile|null>(null)
  const [showArchived,setShowArchived]=useState(false)
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)

  useEffect(()=>{ void init() },[])
  async function init(){ const p=await getMyProfile(); setMe(p); if(p?.role==='admin') await load() }
  async function load(){ try{const data=await employeeAdmin({action:'list'}) as {rows:Profile[]};setRows(data.rows||[])}catch(e){setMessage(e instanceof Error?e.message:'Không tải được danh sách nhân viên')} }
  async function act(payload:Record<string,unknown>, ok:string){ try{setBusy(true);setMessage('');await employeeAdmin(payload);setMessage(ok);setEditing(null);await load()}catch(e){setMessage(e instanceof Error?e.message:'Có lỗi xảy ra')}finally{setBusy(false)} }
  async function create(e:FormEvent){e.preventDefault();await act({action:'create',...form},'Đã tạo tài khoản nhân viên.');setForm(empty)}

  if(me && me.role!=='admin') return <div className="card"><h2>Không có quyền truy cập</h2><p>Chỉ Admin được quản lý tài khoản nhân viên.</p></div>
  const visible=rows.filter(r=>showArchived?true:!r.archived_at)
  return <>
    <div className="page-head"><div><h1>Quản lý nhân viên</h1><p>Tạo tài khoản, phân quyền, khóa và lưu trữ nhân viên.</p></div></div>
    <form className="card form-grid" onSubmit={create}>
      <h2>Thêm nhân viên</h2>
      <label>Họ tên *<input required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label>
      <label>Mã nhân viên *<input required value={form.employee_code} onChange={e=>setForm({...form,employee_code:e.target.value})}/></label>
      <label>Tên đăng nhập *<input required value={form.username} onChange={e=>setForm({...form,username:e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g,'')})} placeholder="Ví dụ: nv001"/></label>
      <label>Email (không bắt buộc)<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Để trống nếu chỉ dùng tên đăng nhập"/></label>
      <label>Mật khẩu ban đầu *<input required minLength={8} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
      <label>Bộ phận<input value={form.department} onChange={e=>setForm({...form,department:e.target.value})}/></label>
      <label>Quyền<select value={form.role} onChange={e=>setForm({...form,role:e.target.value as AppRole})}><option value="viewer">Chỉ tra cứu</option><option value="staff">Nhân viên</option><option value="admin">Admin</option></select></label>
      <div className="wide actions"><span className="muted">Nhân viên đăng nhập bằng tên đăng nhập; email chỉ dùng nội bộ nếu có.</span><button className="primary" disabled={busy}>Tạo nhân viên</button></div>
    </form>
    <div className="toolbar"><label className="check"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/> Hiện tài khoản đã lưu trữ</label></div>
    {message&&<div className="alert">{message}</div>}
    <div className="table-wrap card"><table><thead><tr><th>Mã NV</th><th>Họ tên</th><th>Tên đăng nhập</th><th>Email</th><th>Bộ phận</th><th>Quyền</th><th>Trạng thái</th><th></th></tr></thead><tbody>
      {visible.map(r=><tr key={r.id}><td>{r.employee_code||'—'}</td><td>{r.full_name||'—'}</td><td>{r.username||'—'}</td><td>{r.email||'—'}</td><td>{r.department||'—'}</td><td>{r.role}</td><td>{r.archived_at?'Đã lưu trữ':r.active?'Đang hoạt động':'Đã khóa'}</td><td><button className="ghost small" onClick={()=>setEditing(r)}>Quản lý</button></td></tr>)}
    </tbody></table></div>
    {editing&&<div className="modal-backdrop"><div className="modal card"><div className="modal-head"><h2>Quản lý nhân viên</h2><button className="ghost" onClick={()=>setEditing(null)}>Đóng</button></div>
      <label>Họ tên<input value={editing.full_name||''} onChange={e=>setEditing({...editing,full_name:e.target.value})}/></label>
      <label>Mã nhân viên<input value={editing.employee_code||''} onChange={e=>setEditing({...editing,employee_code:e.target.value})}/></label>
      <label>Tên đăng nhập<input value={editing.username||''} onChange={e=>setEditing({...editing,username:e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g,'')})}/></label>
      <label>Bộ phận<input value={editing.department||''} onChange={e=>setEditing({...editing,department:e.target.value})}/></label>
      <label>Quyền<select value={editing.role} onChange={e=>setEditing({...editing,role:e.target.value as AppRole})}><option value="viewer">Chỉ tra cứu</option><option value="staff">Nhân viên</option><option value="admin">Admin</option></select></label>
      <div className="stack-actions">
        <button className="primary" disabled={busy} onClick={()=>act({action:'update',user_id:editing.id,full_name:editing.full_name,employee_code:editing.employee_code,username:editing.username,department:editing.department,role:editing.role},'Đã cập nhật nhân viên.')}>Lưu thay đổi</button>
        {!editing.archived_at&&<button className="ghost" disabled={busy} onClick={()=>act({action:'set_active',user_id:editing.id,active:!editing.active},editing.active?'Đã khóa tài khoản.':'Đã mở khóa tài khoản.')}>{editing.active?'Khóa tài khoản':'Mở khóa tài khoản'}</button>}
        {!editing.archived_at?<button className="danger-btn" disabled={busy} onClick={()=>{if(confirm('Lưu trữ tài khoản này? Dữ liệu lịch sử vẫn được giữ lại.'))void act({action:'archive',user_id:editing.id},'Đã lưu trữ tài khoản.')}}>Xóa / lưu trữ tài khoản</button>:<button className="ghost" disabled={busy} onClick={()=>act({action:'restore',user_id:editing.id},'Đã khôi phục tài khoản.')}>Khôi phục tài khoản</button>}
        <button className="ghost" disabled={busy} onClick={()=>{const p=prompt('Nhập mật khẩu mới (tối thiểu 8 ký tự)');if(p)void act({action:'reset_password',user_id:editing.id,password:p},'Đã đặt lại mật khẩu.')}}>Đặt lại mật khẩu</button>
      </div>
    </div></div>}
  </>
}
