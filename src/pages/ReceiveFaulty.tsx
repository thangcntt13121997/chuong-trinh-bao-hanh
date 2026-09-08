import {FormEvent,useEffect,useMemo,useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {api,uploadAttachment} from '../lib/api'

type Product={id:string;name:string;sku?:string;brand?:string;model?:string;serial_number?:string;purchase_date?:string;warranty_end_date?:string;warranty_card_number?:string;invoice_number?:string;customer?:{full_name?:string;phone?:string;address?:string}}
type Staff={id:string;full_name?:string;employee_code?:string;department?:string}

const localDateTime=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)}
const toIso=(value:string)=>value?new Date(value).toISOString():null
const money=(v:string)=>v?Number(v.replace(/[^0-9]/g,'')):null

export default function ReceiveFaulty(){
  const nav=useNavigate()
  const[q,setQ]=useState(''),[rows,setRows]=useState<Product[]>([]),[selected,setSelected]=useState<Product|null>(null)
  const[loading,setLoading]=useState(false),[msg,setMsg]=useState(''),[files,setFiles]=useState<File[]>([]),[staff,setStaff]=useState<Staff[]>([])
  const[form,setForm]=useState({case_code:'',issue_description:'',condition_description:'',cause_category:'',service_type:'warranty',estimated_fee:'',supplier_name:'',received_at:localDateTime(),promised_return_at:'',assigned_to:'',has_warranty_card:false,is_sealed:false,has_wrapping:false,has_box:false,notes:''})

  useEffect(()=>{api<{staff:Staff[]}>({action:'case_form_options'}).then(d=>setStaff(d.staff||[])).catch(()=>{})},[])
  const warrantyState=useMemo(()=>{if(!selected?.warranty_end_date)return 'Chưa có ngày hết bảo hành';const end=new Date(selected.warranty_end_date+'T23:59:59');return end>=new Date()?`Còn bảo hành đến ${selected.warranty_end_date}`:`Đã hết bảo hành từ ${selected.warranty_end_date}`},[selected])

  async function search(e?:FormEvent){e?.preventDefault();setMsg('');if(!q.trim()){setMsg('Nhập SĐT, mã hóa đơn, SKU, Serial/IMEI hoặc tên sản phẩm.');return}try{setLoading(true);const d=await api<any>({action:'search',q:q.trim()});setRows(d.products||[]);if(!(d.products||[]).length)setMsg('Không tìm thấy sản phẩm đã lưu. Có thể tạo bảo hành mua mới trước rồi tiếp nhận hàng lỗi.')}catch(e:any){setMsg(e.message)}finally{setLoading(false)}}
  async function submit(e:FormEvent){e.preventDefault();if(!selected)return;try{setLoading(true);setMsg('');const d=await api<any>({action:'create_case',product_id:selected.id,case_code:form.case_code,issue_description:form.issue_description,condition_description:form.condition_description,cause_category:form.cause_category,service_type:form.service_type,estimated_fee:money(form.estimated_fee),supplier_name:form.supplier_name,received_at:toIso(form.received_at),promised_return_at:toIso(form.promised_return_at),assigned_to:form.assigned_to||null,has_warranty_card:form.has_warranty_card,is_sealed:form.is_sealed,has_wrapping:form.has_wrapping,has_box:form.has_box,notes:form.notes});for(const file of files)await uploadAttachment(file,{service_case_id:d.id,product_id:selected.id,kind:'service'});nav(`/case/${d.id}`)}catch(e:any){setMsg(e.message)}finally{setLoading(false)}}

  return <>
    <div className="page-head old-head"><div><h1>Tiếp nhận hàng lỗi</h1><p>Tiếp nhận sản phẩm khách mang đến bảo hành, sửa chữa, đổi hàng hoặc kiểm tra kỹ thuật.</p></div></div>
    {!selected?<>
      <form className="card receive-search" onSubmit={search}><h2>1. Tìm khách hàng / sản phẩm</h2><div className="searchbar"><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="SĐT khách, mã hóa đơn, SKU, Serial/IMEI, tên sản phẩm…"/><button className="primary" disabled={loading}>{loading?'Đang tìm…':'Tìm sản phẩm'}</button></div><p className="muted">Có thể tìm trực tiếp bằng số điện thoại khách hàng. Chọn đúng sản phẩm trước khi lập phiếu tiếp nhận.</p></form>
      {msg&&<div className="alert">{msg}</div>}
      {!!rows.length&&<div className="card product-picker"><h2>2. Chọn sản phẩm tiếp nhận</h2>{rows.map(r=><button type="button" className="pick-row" key={r.id} onClick={()=>{setSelected(r);setMsg('')}}><div><b>{r.name}</b><span>{r.customer?.full_name||'Khách hàng'} · {r.customer?.phone||'—'}</span><small>{[r.sku&&`SKU ${r.sku}`,r.serial_number&&`Serial ${r.serial_number}`,r.invoice_number&&`HĐ ${r.invoice_number}`,r.purchase_date&&`Mua ${r.purchase_date}`].filter(Boolean).join(' · ')||'Chưa có mã nhận dạng'}</small></div><span className="pick-arrow">›</span></button>)}</div>}
    </>:<form className="card form-grid receive-form" onSubmit={submit}>
      <div className="wide selected-product"><div><span className="eyebrow">Sản phẩm tiếp nhận</span><h2>{selected.name}</h2><p><b>{selected.customer?.full_name||'Khách hàng'}</b> · {selected.customer?.phone||'—'}</p><small>{[selected.sku&&`SKU ${selected.sku}`,selected.brand,selected.model,selected.serial_number&&`Serial ${selected.serial_number}`,selected.invoice_number&&`HĐ ${selected.invoice_number}`].filter(Boolean).join(' · ')}</small><div className="warranty-state">{warrantyState}</div></div><button type="button" className="ghost" onClick={()=>setSelected(null)}>Chọn lại</button></div>

      <h2 className="wide">Thông tin phiếu tiếp nhận</h2>
      <label>Mã hồ sơ<input value={form.case_code} onChange={e=>setForm({...form,case_code:e.target.value})} placeholder="Để trống để hệ thống tự tạo"/></label>
      <label>Thời điểm tiếp nhận *<input required type="datetime-local" value={form.received_at} onChange={e=>setForm({...form,received_at:e.target.value})}/></label>
      <label className="wide">Mô tả lỗi / yêu cầu khách hàng *<textarea required rows={3} value={form.issue_description} onChange={e=>setForm({...form,issue_description:e.target.value})} placeholder="Ví dụ: Không lên nguồn; khách yêu cầu kiểm tra bảo hành…"/></label>
      <label className="wide">Tình trạng ngoại quan khi nhận<textarea rows={3} value={form.condition_description} onChange={e=>setForm({...form,condition_description:e.target.value})} placeholder="Trầy xước, móp, bể, thiếu phụ kiện, tình trạng máy khi nhận…"/></label>
      <label>Nhóm nguyên nhân / lỗi<select value={form.cause_category} onChange={e=>setForm({...form,cause_category:e.target.value})}><option value="">Chưa xác định</option><option value="technical">Lỗi kỹ thuật</option><option value="physical">Hư hỏng ngoại quan</option><option value="accessory">Phụ kiện</option><option value="usage">Hướng dẫn sử dụng</option><option value="supplier">Chờ NCC/TTBH xác định</option><option value="other">Khác</option></select></label>
      <label>Hình thức xử lý<select value={form.service_type} onChange={e=>setForm({...form,service_type:e.target.value})}><option value="warranty">Bảo hành</option><option value="repair">Sửa chữa</option><option value="exchange">Đổi hàng / kiểm tra đổi</option><option value="inspection">Kiểm tra kỹ thuật</option></select></label>
      <label>Nhà cung cấp / TTBH<input value={form.supplier_name} onChange={e=>setForm({...form,supplier_name:e.target.value})} placeholder="Tên NCC hoặc trung tâm bảo hành"/></label>
      <label>Chi phí dự kiến<input inputMode="numeric" value={form.estimated_fee} onChange={e=>setForm({...form,estimated_fee:e.target.value.replace(/[^0-9]/g,'')})} placeholder="0"/></label>
      <label>Hẹn trả khách / xử lý xong<input type="datetime-local" value={form.promised_return_at} onChange={e=>setForm({...form,promised_return_at:e.target.value})}/></label>
      <label>Nhân viên phụ trách<select value={form.assigned_to} onChange={e=>setForm({...form,assigned_to:e.target.value})}><option value="">Chưa phân công</option>{staff.map(s=><option key={s.id} value={s.id}>{s.full_name||s.employee_code||s.id}{s.employee_code?` · ${s.employee_code}`:''}</option>)}</select></label>

      <div className="wide accessory-box"><b>Giấy tờ / phụ kiện nhận kèm</b><div className="check-grid"><label><input type="checkbox" checked={form.has_warranty_card} onChange={e=>setForm({...form,has_warranty_card:e.target.checked})}/> Có phiếu bảo hành</label><label><input type="checkbox" checked={form.is_sealed} onChange={e=>setForm({...form,is_sealed:e.target.checked})}/> Còn tem/niêm phong</label><label><input type="checkbox" checked={form.has_wrapping} onChange={e=>setForm({...form,has_wrapping:e.target.checked})}/> Có bao bì/phụ kiện</label><label><input type="checkbox" checked={form.has_box} onChange={e=>setForm({...form,has_box:e.target.checked})}/> Có hộp sản phẩm</label></div></div>
      <label className="wide">Ảnh hàng lỗi / phụ kiện / phiếu nhận<input type="file" multiple accept="image/*" capture="environment" onChange={e=>setFiles(Array.from(e.target.files||[]))}/><small>{files.length?`Đã chọn ${files.length} file. Có thể chụp/lưu nhiều ảnh.`:'Có thể chọn hoặc chụp nhiều ảnh khi tiếp nhận.'}</small></label>
      <label className="wide">Ghi chú nội bộ<textarea rows={3} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Yêu cầu đặc biệt của khách, tình trạng phụ kiện, thông tin liên hệ NCC…"/></label>
      {msg&&<div className="alert wide">{msg}</div>}
      <div className="wide actions"><button type="button" className="ghost" onClick={()=>setSelected(null)}>Quay lại chọn sản phẩm</button><Link className="ghost button-link" to="/cases">Hồ sơ bảo hành</Link><button className="primary" disabled={loading}>{loading?'Đang lưu hồ sơ…':'Hoàn tất tiếp nhận'}</button></div>
    </form>}
  </>
}
