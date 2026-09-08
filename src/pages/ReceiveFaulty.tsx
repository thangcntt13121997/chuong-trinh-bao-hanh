import {FormEvent,useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {api,uploadAttachment} from '../lib/api'

type Product={id:string;name:string;sku?:string;brand?:string;model?:string;serial_number?:string;invoice_number?:string;customer?:{full_name?:string;phone?:string}}

export default function ReceiveFaulty(){
  const nav=useNavigate(); const[q,setQ]=useState(''); const[rows,setRows]=useState<Product[]>([]); const[selected,setSelected]=useState<Product|null>(null); const[loading,setLoading]=useState(false); const[msg,setMsg]=useState(''); const[file,setFile]=useState<File|null>(null)
  const[form,setForm]=useState({issue_description:'',condition_description:'',service_type:'warranty',supplier_name:'',has_warranty_card:false,is_sealed:false,has_wrapping:false,has_box:false,notes:''})
  async function search(e?:FormEvent){e?.preventDefault();setMsg('');if(!q.trim()){setMsg('Nhập SĐT, mã hóa đơn, SKU, Serial hoặc tên sản phẩm.');return}try{setLoading(true);const d=await api<any>({action:'search',q:q.trim()});setRows(d.products||[]);if(!(d.products||[]).length)setMsg('Không tìm thấy sản phẩm đã lưu phù hợp. Hãy tạo bảo hành mua mới trước.')}catch(e:any){setMsg(e.message)}finally{setLoading(false)}}
  async function submit(e:FormEvent){e.preventDefault();if(!selected)return;try{setLoading(true);setMsg('');const d=await api<any>({action:'create_case',product_id:selected.id,...form});if(file)await uploadAttachment(file,{service_case_id:d.id,product_id:selected.id,kind:'service'});nav(`/case/${d.id}`)}catch(e:any){setMsg(e.message)}finally{setLoading(false)}}
  return <>
    <div className="page-head old-head"><div><h1>Tiếp nhận hàng lỗi</h1><p>Tìm sản phẩm đã mua và tạo hồ sơ tiếp nhận bảo hành/sửa chữa.</p></div></div>
    {!selected?<>
      <form className="card receive-search" onSubmit={search}><h2>1. Tìm sản phẩm của khách</h2><div className="searchbar"><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="SĐT khách, mã hóa đơn, SKU, Serial/IMEI, tên sản phẩm…"/><button className="primary" disabled={loading}>{loading?'Đang tìm…':'Tìm sản phẩm'}</button></div><p className="muted">Ưu tiên tìm bằng số điện thoại hoặc Serial để tránh chọn nhầm sản phẩm.</p></form>
      {msg&&<div className="alert">{msg}</div>}
      {!!rows.length&&<div className="card product-picker"><h2>2. Chọn sản phẩm tiếp nhận</h2>{rows.map(r=><button type="button" className="pick-row" key={r.id} onClick={()=>{setSelected(r);setMsg('')}}><div><b>{r.name}</b><span>{r.customer?.full_name||'Khách hàng'} · {r.customer?.phone||'—'}</span><small>{[r.sku&&`SKU ${r.sku}`,r.serial_number&&`Serial ${r.serial_number}`,r.invoice_number&&`HĐ ${r.invoice_number}`].filter(Boolean).join(' · ')||'Chưa có mã nhận dạng'}</small></div><span className="pick-arrow">›</span></button>)}</div>}
    </>:<form className="card form-grid receive-form" onSubmit={submit}>
      <div className="wide selected-product"><div><span className="eyebrow">Sản phẩm tiếp nhận</span><h2>{selected.name}</h2><p>{selected.customer?.full_name} · {selected.customer?.phone}</p><small>{[selected.sku&&`SKU ${selected.sku}`,selected.serial_number&&`Serial ${selected.serial_number}`,selected.invoice_number&&`HĐ ${selected.invoice_number}`].filter(Boolean).join(' · ')}</small></div><button type="button" className="ghost" onClick={()=>setSelected(null)}>Chọn lại</button></div>
      <h2>Thông tin hàng lỗi</h2>
      <label className="wide">Mô tả lỗi / yêu cầu khách hàng *<textarea required value={form.issue_description} onChange={e=>setForm({...form,issue_description:e.target.value})} placeholder="Ví dụ: Máy không lên nguồn, khách yêu cầu kiểm tra bảo hành…"/></label>
      <label className="wide">Tình trạng khi tiếp nhận<textarea value={form.condition_description} onChange={e=>setForm({...form,condition_description:e.target.value})} placeholder="Trầy xước, móp, thiếu phụ kiện…"/></label>
      <label>Hình thức xử lý<select value={form.service_type} onChange={e=>setForm({...form,service_type:e.target.value})}><option value="warranty">Bảo hành</option><option value="repair">Sửa chữa</option><option value="exchange">Đổi hàng / kiểm tra đổi</option><option value="inspection">Kiểm tra kỹ thuật</option></select></label>
      <label>Nhà cung cấp / TTBH<input value={form.supplier_name} onChange={e=>setForm({...form,supplier_name:e.target.value})}/></label>
      <div className="wide accessory-box"><b>Phụ kiện / tình trạng kèm theo</b><div className="check-grid"><label><input type="checkbox" checked={form.has_warranty_card} onChange={e=>setForm({...form,has_warranty_card:e.target.checked})}/> Phiếu bảo hành</label><label><input type="checkbox" checked={form.is_sealed} onChange={e=>setForm({...form,is_sealed:e.target.checked})}/> Còn tem/niêm phong</label><label><input type="checkbox" checked={form.has_wrapping} onChange={e=>setForm({...form,has_wrapping:e.target.checked})}/> Có bao bì</label><label><input type="checkbox" checked={form.has_box} onChange={e=>setForm({...form,has_box:e.target.checked})}/> Có hộp</label></div></div>
      <label className="wide">Ảnh sản phẩm lỗi / phụ kiện<input type="file" accept="image/*" capture="environment" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
      <label className="wide">Ghi chú<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
      {msg&&<div className="alert wide">{msg}</div>}
      <div className="wide actions"><Link className="ghost button-link" to="/cases">Xem hồ sơ bảo hành</Link><button className="primary" disabled={loading}>{loading?'Đang tiếp nhận…':'Tiếp nhận hàng lỗi'}</button></div>
    </form>}
  </>
}
