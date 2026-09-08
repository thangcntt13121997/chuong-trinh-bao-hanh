import { FormEvent, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { addMonths } from '../lib/date'

type Item = { product_code:string; product_name:string; serial_number:string; warranty_months:number }
const blank = ():Item => ({product_code:'',product_name:'',serial_number:'',warranty_months:12})

export default function NewWarranty(){
  const [customerName,setCustomerName]=useState('')
  const [phone,setPhone]=useState('')
  const [invoiceNumber,setInvoiceNumber]=useState('')
  const [purchaseDate,setPurchaseDate]=useState(new Date().toISOString().slice(0,10))
  const [file,setFile]=useState<File|null>(null)
  const [items,setItems]=useState<Item[]>([blank()])
  const [message,setMessage]=useState('')
  const [saving,setSaving]=useState(false)
  const canSave=useMemo(()=>phone.trim()&&invoiceNumber.trim()&&purchaseDate&&items.every(i=>i.product_name.trim()&&i.warranty_months>0),[phone,invoiceNumber,purchaseDate,items])

  function patch(i:number,key:keyof Item,value:string|number){ setItems(old=>old.map((x,idx)=>idx===i?{...x,[key]:value}:x)) }
  function remove(i:number){ setItems(old=>old.length===1?old:old.filter((_,idx)=>idx!==i)) }

  async function submit(e:FormEvent){
    e.preventDefault(); if(!canSave)return; setSaving(true); setMessage('')
    const {data:{user}}=await supabase.auth.getUser(); if(!user){setMessage('Phiên đăng nhập đã hết.');setSaving(false);return}
    let customerId:string
    const {data:existing}=await supabase.from('customers').select('id').eq('phone',phone.trim()).maybeSingle()
    if(existing?.id) customerId=existing.id
    else {
      const {data:c,error}=await supabase.from('customers').insert({customer_name:customerName.trim()||null,phone:phone.trim()}).select('id').single()
      if(error||!c){setMessage(error?.message||'Không tạo được khách hàng');setSaving(false);return} customerId=c.id
    }
    const {data:inv,error:invErr}=await supabase.from('invoices').insert({invoice_number:invoiceNumber.trim(),customer_id:customerId,purchase_date:purchaseDate,created_by:user.id}).select('id').single()
    if(invErr||!inv){setMessage(invErr?.message||'Không tạo được hóa đơn');setSaving(false);return}
    let receiptPath:string|null=null
    if(file){
      const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_')
      receiptPath=`${purchaseDate.slice(0,4)}/${purchaseDate.slice(5,7)}/${inv.id}/${Date.now()}-${safe}`
      const {error:upErr}=await supabase.storage.from('receipts').upload(receiptPath,file,{upsert:false})
      if(upErr){ await supabase.from('invoices').delete().eq('id',inv.id); setMessage(`Upload ảnh thất bại: ${upErr.message}`);setSaving(false);return }
      await supabase.from('invoices').update({receipt_image_path:receiptPath}).eq('id',inv.id)
    }
    const payload=items.map(i=>({invoice_id:inv.id,product_code:i.product_code.trim()||null,product_name:i.product_name.trim(),serial_number:i.serial_number.trim()||null,warranty_months:i.warranty_months,purchase_date:purchaseDate,warranty_expiry_date:addMonths(purchaseDate,i.warranty_months)}))
    const {error:itemErr}=await supabase.from('warranty_items').insert(payload)
    if(itemErr){setMessage(`Đã tạo hóa đơn nhưng lỗi khi lưu sản phẩm: ${itemErr.message}`);setSaving(false);return}
    setMessage('Đã lưu hồ sơ bảo hành thành công.')
    setCustomerName('');setPhone('');setInvoiceNumber('');setFile(null);setItems([blank()]);setSaving(false)
  }

  return <>
    <div className="page-head"><div><h1>Tạo hồ sơ bảo hành</h1><p>Một hóa đơn có thể chứa nhiều sản phẩm.</p></div></div>
    <form className="card form-grid" onSubmit={submit}>
      <h2>Khách hàng</h2>
      <label>Họ tên<input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Không bắt buộc" /></label>
      <label>Số điện thoại *<input value={phone} onChange={e=>setPhone(e.target.value)} required /></label>
      <h2>Hóa đơn</h2>
      <label>Mã hóa đơn *<input value={invoiceNumber} onChange={e=>setInvoiceNumber(e.target.value)} required /></label>
      <label>Ngày mua *<input type="date" value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)} required /></label>
      <label className="wide">Ảnh hóa đơn<input type="file" accept="image/*" capture="environment" onChange={e=>setFile(e.target.files?.[0]||null)} /></label>
      <div className="wide"><h2>Sản phẩm</h2></div>
      {items.map((item,i)=><div className="item-box wide" key={i}>
        <div className="item-grid">
          <label>Tên sản phẩm *<input value={item.product_name} onChange={e=>patch(i,'product_name',e.target.value)} required /></label>
          <label>Mã hàng<input value={item.product_code} onChange={e=>patch(i,'product_code',e.target.value)} /></label>
          <label>Serial / IMEI<input value={item.serial_number} onChange={e=>patch(i,'serial_number',e.target.value)} /></label>
          <label>Bảo hành (tháng) *<input type="number" min="1" max="120" value={item.warranty_months} onChange={e=>patch(i,'warranty_months',Number(e.target.value))} required /></label>
        </div>
        <div className="row-actions"><span>Hết hạn dự kiến: <b>{addMonths(purchaseDate,item.warranty_months)}</b></span><button type="button" className="ghost" onClick={()=>remove(i)}>Xóa dòng</button></div>
      </div>)}
      <div className="wide actions"><button type="button" className="ghost" onClick={()=>setItems(x=>[...x,blank()])}>+ Thêm sản phẩm</button><button className="primary" disabled={!canSave||saving}>{saving?'Đang lưu…':'Lưu hồ sơ'}</button></div>
      {message&&<div className="alert wide">{message}</div>}
    </form>
  </>
}
