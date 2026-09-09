import{useEffect,useState}from'react';import{Link}from'react-router-dom';import{api}from'../lib/api'
const statusLabel:Record<string,string>={received:'Đã tiếp nhận',pending_supplier:'Chờ NCC xử lý',sent_supplier:'Đã chuyển NCC',supplier_returned:'NCC đã trả hàng',ready_for_customer:'Sẵn sàng trả khách',returned_customer:'Đã trả khách',cancelled:'Đã hủy'}
export default function Dashboard(){const[data,setData]=useState<any>(null),[err,setErr]=useState('');useEffect(()=>{api({action:'dashboard'}).then(setData).catch(e=>setErr(e.message))},[]);return <>
  <div className="page-head legacy-page-head"><div><h1>Tổng quan bảo hành</h1><p>Theo dõi công việc cần xử lý hôm nay</p></div></div>{err&&<div className="alert danger">{err}</div>}
  <div className="dashboard-grid legacy-dashboard-grid">
    <div className="dash-card green"><span>Hồ sơ đang xử lý</span><b>{data?.stats?.open_cases??0}</b><small>Tất cả trạng thái chưa hoàn tất</small></div>
    <div className="dash-card blue"><span>Đã chuyển nhà cung cấp</span><b>{data?.stats?.waiting_supplier??0}</b><small>Đang chờ nhà cung cấp xử lý</small></div>
    <div className="dash-card orange"><span>Sắp đến lịch hẹn</span><b>{data?.stats?.upcoming??0}</b><small>Lịch gần nhất cần theo dõi</small></div>
    <div className="dash-card red"><span>Quá hạn trả khách</span><b>{data?.stats?.overdue??0}</b><small>Không có hồ sơ trễ hẹn</small></div>
  </div>
  <div className="dashboard-lower">
    <section className="card dashboard-section recent-panel"><div className="section-title"><div><h2>Hồ sơ mới tiếp nhận</h2><p>Cập nhật gần nhất</p></div><Link to="/cases">Xem tất cả ›</Link></div>{(data?.recent||[]).length?<div className="recent-list">{data.recent.map((r:any)=><Link className="recent-row" to={`/case/${r.id}`} key={r.id}><div><b>{r.case_code}</b><span>{r.customer?.full_name} · {r.product?.name}</span><small>{r.issue_description}</small></div><div><span className="badge">{statusLabel[r.status]||r.status}</span><small>{r.received_at?new Date(r.received_at).toLocaleDateString('vi-VN'):''}</small></div></Link>)}</div>:<div className="empty-dashboard compact-empty">Chưa có hồ sơ mới tiếp nhận</div>}</section>
    <section className="card dashboard-section upcoming-panel"><div className="section-title"><div><h2>Lịch sắp tới</h2><p>Ngày chuyển NCC và trả khách</p></div></div>{(data?.upcoming_appointments||[]).length?<div className="recent-list">{data.upcoming_appointments.map((a:any)=><Link className="recent-row appointment-row" to={`/case/${a.service_case_id}`} key={a.id}><div><b>{a.case?.case_code||'Lịch hẹn'}</b><span>{a.case?.customer?.full_name}</span><small>{new Date(a.scheduled_at).toLocaleString('vi-VN')}</small></div></Link>)}</div>:<div className="empty-dashboard"><div className="empty-icon">▤</div><span>Chưa có lịch hẹn sắp tới</span></div>}<Link to="/receive" className="primary dashboard-cta">⊕&nbsp; Tiếp nhận sản phẩm lỗi</Link></section>
  </div>
</>}
