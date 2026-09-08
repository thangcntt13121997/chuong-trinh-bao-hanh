import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate, warrantyState } from '../lib/date'

type Result={warranty_item_id:string;invoice_id:string;invoice_number:string;purchase_date:string;receipt_image_path:string|null;customer_name:string|null;phone:string;product_code:string|null;product_name:string;serial_number:string|null;warranty_expiry_date:string}

export default function Search(){
  const [q,setQ]=useState(''); const [rows,setRows]=useState<Result[]>([]); const [loading,setLoading]=useState(false); const [error,setError]=useState('')
  async function go(e?:FormEvent){e?.preventDefault(); if(!q.trim())return;setLoading(true);setError('');const {data,error}=await supabase.rpc('search_warranties',{search_text:q.trim()});setLoading(false);if(error){setError(error.message);return}setRows((data||[]) as Result[])}
  async function viewReceipt(path:string|null){ if(!path)return; const {data,error}=await supabase.storage.from('receipts').createSignedUrl(path,120); if(error||!data){setError(error?.message||'Không mở được ảnh');return} window.open(data.signedUrl,'_blank','noopener,noreferrer') }
  return <>
    <div className="page-head"><div><h1>Tra cứu bảo hành</h1><p>Tìm theo SĐT, mã hóa đơn, mã hàng, tên sản phẩm hoặc serial.</p></div></div>
    <form className="searchbar" onSubmit={go}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Ví dụ: 0905..., 004321, Sharp..."/><button className="primary">{loading?'Đang tìm…':'Tìm kiếm'}</button></form>
    {error&&<div className="alert danger-bg">{error}</div>}
    <div className="results">
      {rows.map(r=>{const s=warrantyState(r.warranty_expiry_date);return <article className="card result" key={r.warranty_item_id}>
        <div><h3>{r.product_name}</h3><p>{r.customer_name||'Khách hàng'} · {r.phone}</p><p>HĐ: <b>{r.invoice_number}</b> · Mua: {formatDate(r.purchase_date)}</p><p>Mã hàng: {r.product_code||'—'} · Serial: {r.serial_number||'—'}</p></div>
        <div className="result-side"><span className={`badge ${s.className}`}>{s.label}</span><span>Hết hạn: {formatDate(r.warranty_expiry_date)}</span><div className="row-buttons"><Link className="ghost link-btn" to={`/warranty/${r.invoice_id}`}>Chi tiết</Link><button className="ghost" disabled={!r.receipt_image_path} onClick={()=>viewReceipt(r.receipt_image_path)}>{r.receipt_image_path?'Xem hóa đơn':'Chưa có ảnh'}</button></div></div>
      </article>})}
      {!loading&&q&&rows.length===0&&!error&&<div className="empty">Không tìm thấy dữ liệu phù hợp.</div>}
    </div>
  </>
}
