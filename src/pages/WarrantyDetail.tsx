import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { addMonths, formatDate, warrantyState } from '../lib/date'
import { getMyProfile, type Profile } from '../lib/profile'

type Invoice = {
  id:string; invoice_number:string; customer_id:string; purchase_date:string; receipt_image_path:string|null;
  created_by:string; deleted_at:string|null; delete_reason:string|null;
  customers:{customer_name:string|null;phone:string;address:string|null}|null
}
type Item = {id:string;product_code:string|null;product_name:string;brand:string|null;serial_number:string|null;warranty_months:number;purchase_date:string;warranty_expiry_date:string;notes:string|null}

export default function WarrantyDetail(){
  const {id}=useParams(); const navigate=useNavigate()
  const [me,setMe]=useState<Profile|null>(null); const [invoice,setInvoice]=useState<Invoice|null>(null); const [items,setItems]=useState<Item[]>([])
  const [edit,setEdit]=useState(false); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [message,setMessage]=useState('')
  const canEdit=useMemo(()=>!!me&&!!invoice&&(me.role==='admin'||(me.role==='staff'&&invoice.created_by===me.id))&&!invoice.deleted_at,[me,invoice])
  const isAdmin=me?.role==='admin'

  useEffect(()=>{void load()},[id])
  async function load(){ if(!id)return; setLoading(true);setMessage('');const p=await getMyProfile();setMe(p); const [{data:inv,error:ie},{data:its,error:we}]=await Promise.all([
      supabase.from('invoices').select('id,invoice_number,customer_id,purchase_date,receipt_image_path,created_by,deleted_at,delete_reason,customers(customer_name,phone,address)').eq('id',id).maybeSingle(),
      supabase.from('warranty_items').select('id,product_code,product_name,brand,serial_number,warranty_months,purchase_date,warranty_expiry_date,notes').eq('invoice_id',id).order('created_at')
    ]); if(ie||we||!inv){setMessage(ie?.message||we?.message||'Không tìm thấy hồ sơ.');setInvoice(null)}else{setInvoice(inv as unknown as Invoice);setItems((its||[]) as Item[])}setLoading(false) }
  function patchItem(idx:number,key:keyof Item,value:string|number){setItems(old=>old.map((x,i)=>i===idx?{...x,[key]:value}:x))}
  async function viewReceipt(){if(!invoice?.receipt_image_path)return;const {data,error}=await supabase.storage.from('receipts').createSignedUrl(invoice.receipt_image_path,120);if(error||!data){setMessage(error?.message||'Không mở được ảnh hóa đơn');return}window.open(data.signedUrl,'_blank','noopener,noreferrer')}
  async function save(){if(!invoice||!canEdit)return;setSaving(true);setMessage('')
    const {error:invErr}=await supabase.from('invoices').update({invoice_number:invoice.invoice_number.trim(),purchase_date:invoice.purchase_date}).eq('id',invoice.id)
    if(invErr){setMessage(invErr.message);setSaving(false);return}
    if(isAdmin&&invoice.customers){const {error:cErr}=await supabase.from('customers').update({customer_name:invoice.customers.customer_name?.trim()||null,phone:invoice.customers.phone.trim(),address:invoice.customers.address?.trim()||null}).eq('id',invoice.customer_id);if(cErr){setMessage(cErr.message);setSaving(false);return}}
    for(const it of items){const expiry=addMonths(invoice.purchase_date,Number(it.warranty_months));const {error}=await supabase.from('warranty_items').update({product_code:it.product_code?.trim()||null,product_name:it.product_name.trim(),brand:it.brand?.trim()||null,serial_number:it.serial_number?.trim()||null,warranty_months:Number(it.warranty_months),purchase_date:invoice.purchase_date,warranty_expiry_date:expiry,notes:it.notes?.trim()||null}).eq('id',it.id);if(error){setMessage(error.message);setSaving(false);return}}
    setMessage('Đã lưu thay đổi. Nhật ký thay đổi đã được ghi tự động.');setEdit(false);setSaving(false);await load()
  }
  async function addItem(){if(!invoice||!canEdit)return;const {data,error}=await supabase.from('warranty_items').insert({invoice_id:invoice.id,product_name:'Sản phẩm mới',warranty_months:12,purchase_date:invoice.purchase_date,warranty_expiry_date:addMonths(invoice.purchase_date,12)}).select('id,product_code,product_name,brand,serial_number,warranty_months,purchase_date,warranty_expiry_date,notes').single();if(error)setMessage(error.message);else setItems(x=>[...x,data as Item])}
  async function removeItem(itemId:string){if(!canEdit||items.length<=1)return;if(!confirm('Xóa sản phẩm này khỏi hồ sơ? Thao tác sẽ được ghi nhật ký.'))return;const {error}=await supabase.from('warranty_items').delete().eq('id',itemId);if(error)setMessage(error.message);else setItems(x=>x.filter(i=>i.id!==itemId))}
  async function archive(){if(!invoice||!isAdmin)return;const reason=prompt('Nhập lý do lưu trữ/xóa hồ sơ:');if(!reason?.trim())return;const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from('invoices').update({deleted_at:new Date().toISOString(),deleted_by:user?.id||null,delete_reason:reason.trim()}).eq('id',invoice.id);if(error)setMessage(error.message);else{setMessage('Hồ sơ đã được lưu trữ, không còn xuất hiện trong tra cứu thông thường.');await load()}}
  async function restore(){if(!invoice||!isAdmin)return;const {error}=await supabase.from('invoices').update({deleted_at:null,deleted_by:null,delete_reason:null}).eq('id',invoice.id);if(error)setMessage(error.message);else{setMessage('Đã khôi phục hồ sơ.');await load()}}
  if(loading)return <div className="center-inline">Đang tải hồ sơ…</div>
  if(!invoice)return <div className="card"><h2>Không tìm thấy hồ sơ</h2><p>{message}</p><Link to="/search">← Quay lại tra cứu</Link></div>
  return <>
    <div className="page-head"><div><h1>Chi tiết bảo hành</h1><p>Hóa đơn {invoice.invoice_number}</p></div><div className="head-actions"><Link className="ghost link-btn" to="/search">← Tra cứu</Link>{canEdit&&!edit&&<button className="primary" onClick={()=>setEdit(true)}>Sửa hồ sơ</button>}</div></div>
    {invoice.deleted_at&&<div className="alert danger-bg"><b>Hồ sơ đã lưu trữ.</b> Lý do: {invoice.delete_reason||'Không ghi lý do'} {isAdmin&&<button className="ghost inline-btn" onClick={restore}>Khôi phục</button>}</div>}
    {message&&<div className="alert">{message}</div>}
    <section className="card detail-grid">
      <div><span className="field-label">Khách hàng</span>{edit&&isAdmin?<input value={invoice.customers?.customer_name||''} onChange={e=>setInvoice({...invoice,customers:{...(invoice.customers||{phone:'',address:null,customer_name:null}),customer_name:e.target.value}})}/>:<strong>{invoice.customers?.customer_name||'Khách hàng'}</strong>}</div>
      <div><span className="field-label">Số điện thoại</span>{edit&&isAdmin?<input value={invoice.customers?.phone||''} onChange={e=>setInvoice({...invoice,customers:{...(invoice.customers||{phone:'',address:null,customer_name:null}),phone:e.target.value}})}/>:<strong>{invoice.customers?.phone||'—'}</strong>}</div>
      <div><span className="field-label">Mã hóa đơn</span>{edit?<input value={invoice.invoice_number} onChange={e=>setInvoice({...invoice,invoice_number:e.target.value})}/>:<strong>{invoice.invoice_number}</strong>}</div>
      <div><span className="field-label">Ngày mua</span>{edit?<input type="date" value={invoice.purchase_date} onChange={e=>setInvoice({...invoice,purchase_date:e.target.value})}/>:<strong>{formatDate(invoice.purchase_date)}</strong>}</div>
      <div className="wide"><span className="field-label">Ảnh hóa đơn</span><button className="ghost" disabled={!invoice.receipt_image_path} onClick={viewReceipt}>{invoice.receipt_image_path?'Xem ảnh hóa đơn':'Chưa có ảnh'}</button></div>
    </section>
    <div className="section-title"><h2>Sản phẩm bảo hành</h2>{edit&&canEdit&&<button className="ghost" onClick={addItem}>+ Thêm sản phẩm</button>}</div>
    <div className="results">{items.map((it,idx)=>{const s=warrantyState(edit?addMonths(invoice.purchase_date,it.warranty_months):it.warranty_expiry_date);return <article className="card" key={it.id}>
      {edit?<div className="item-grid detail-items"><label>Tên sản phẩm<input value={it.product_name} onChange={e=>patchItem(idx,'product_name',e.target.value)}/></label><label>Mã hàng<input value={it.product_code||''} onChange={e=>patchItem(idx,'product_code',e.target.value)}/></label><label>Nhãn hàng<input value={it.brand||''} onChange={e=>patchItem(idx,'brand',e.target.value)}/></label><label>Serial / IMEI<input value={it.serial_number||''} onChange={e=>patchItem(idx,'serial_number',e.target.value)}/></label><label>Bảo hành (tháng)<input type="number" min="1" max="120" value={it.warranty_months} onChange={e=>patchItem(idx,'warranty_months',Number(e.target.value))}/></label><label className="wide">Ghi chú<input value={it.notes||''} onChange={e=>patchItem(idx,'notes',e.target.value)}/></label>{items.length>1&&<button className="danger-btn" onClick={()=>removeItem(it.id)}>Xóa sản phẩm</button>}</div>:<div className="result"><div><h3>{it.product_name}</h3><p>Mã hàng: {it.product_code||'—'} · Nhãn: {it.brand||'—'} · Serial: {it.serial_number||'—'}</p><p>Bảo hành: {it.warranty_months} tháng · Hết hạn: {formatDate(it.warranty_expiry_date)}</p>{it.notes&&<p>Ghi chú: {it.notes}</p>}</div><div className="result-side"><span className={`badge ${s.className}`}>{s.label}</span></div></div>}
    </article>})}</div>
    {edit&&<div className="bottom-actions"><button className="ghost" onClick={()=>{setEdit(false);void load()}}>Hủy thay đổi</button><button className="primary" disabled={saving} onClick={save}>{saving?'Đang lưu…':'Lưu thay đổi'}</button></div>}
    {isAdmin&&!invoice.deleted_at&&<div className="danger-zone card"><div><h3>Vùng quản trị</h3><p>Lưu trữ hồ sơ thay vì xóa vật lý để giữ ảnh và lịch sử xử lý.</p></div><button className="danger-btn" onClick={archive}>Xóa / lưu trữ hồ sơ</button></div>}
  </>
}
