import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getMyProfile, type Profile } from '../lib/profile'

type Log={id:number;actor_user_id:string|null;action:string;entity_type:string;entity_id:string|null;note:string|null;created_at:string;old_data:Record<string,unknown>|null;new_data:Record<string,unknown>|null}

export default function AuditLogs(){
  const [me,setMe]=useState<Profile|null>(null);const [logs,setLogs]=useState<Log[]>([]);const [profiles,setProfiles]=useState<Profile[]>([]);const [entity,setEntity]=useState('all');const [selected,setSelected]=useState<Log|null>(null);const [message,setMessage]=useState('')
  useEffect(()=>{void load()},[])
  async function load(){const p=await getMyProfile();setMe(p);if(p?.role!=='admin')return;const [{data:l,error},{data:ps}]=await Promise.all([supabase.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(300),supabase.from('profiles').select('id,full_name,email,employee_code,role,department,active,archived_at')]);if(error)setMessage(error.message);else setLogs((l||[]) as Log[]);setProfiles((ps||[]) as Profile[])}
  const names=useMemo(()=>Object.fromEntries(profiles.map(p=>[p.id,p.full_name||p.employee_code||p.email||p.id])),[profiles]);const visible=logs.filter(l=>entity==='all'||l.entity_type===entity)
  if(me&&me.role!=='admin')return <div className="card"><h2>Không có quyền truy cập</h2><p>Chỉ Admin được xem nhật ký thay đổi.</p></div>
  return <><div className="page-head"><div><h1>Nhật ký thay đổi</h1><p>300 thao tác gần nhất trên dữ liệu bảo hành và tài khoản.</p></div></div>
    <div className="toolbar"><label>Lọc loại dữ liệu<select value={entity} onChange={e=>setEntity(e.target.value)}><option value="all">Tất cả</option><option value="invoices">Hóa đơn</option><option value="warranty_items">Sản phẩm</option><option value="customers">Khách hàng</option><option value="profiles">Nhân viên</option></select></label></div>
    {message&&<div className="alert danger-bg">{message}</div>}
    <div className="table-wrap card"><table><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Thao tác</th><th>Dữ liệu</th><th>Ghi chú</th><th></th></tr></thead><tbody>{visible.map(l=><tr key={l.id}><td>{new Date(l.created_at).toLocaleString('vi-VN')}</td><td>{l.actor_user_id?names[l.actor_user_id]||l.actor_user_id.slice(0,8):'Hệ thống'}</td><td>{l.action}</td><td>{l.entity_type}</td><td>{l.note||'—'}</td><td><button className="ghost small" onClick={()=>setSelected(l)}>Chi tiết</button></td></tr>)}</tbody></table></div>
    {selected&&<div className="modal-backdrop"><div className="modal card log-modal"><div className="modal-head"><h2>Chi tiết nhật ký #{selected.id}</h2><button className="ghost" onClick={()=>setSelected(null)}>Đóng</button></div><p><b>Thời gian:</b> {new Date(selected.created_at).toLocaleString('vi-VN')}</p><p><b>Thao tác:</b> {selected.action} · {selected.entity_type}</p>{selected.note&&<p><b>Ghi chú:</b> {selected.note}</p>}<div className="json-grid"><div><h3>Dữ liệu trước</h3><pre>{JSON.stringify(selected.old_data,null,2)||'—'}</pre></div><div><h3>Dữ liệu sau</h3><pre>{JSON.stringify(selected.new_data,null,2)||'—'}</pre></div></div></div></div>}
  </>
}
