import {FormEvent,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {api,uploadAttachment} from '../lib/api'
import {addMonths} from '../lib/date'

type Item={name:string;sku:string;brand:string;model:string;serial_number:string;warranty_months:number;warranty_card_number:string;warranty_end_date:string}
const blank=():Item=>({name:'',sku:'',brand:'',model:'',serial_number:'',warranty_months:12,warranty_card_number:'',warranty_end_date:''})
const Step=({n,title,sub}:{n:string,title:string,sub:string})=><div className="step-title wide"><span>{n}</span><div><h2>{title}</h2><p>{sub}</p></div></div>

export default function InitializeWarranty(){
  const nav=useNavigate()
  const[customerName,setCustomerName]=useState(''),[phone,setPhone]=useState(''),[address,setAddress]=useState('')
  const[invoice,setInvoice]=useState(''),[date,setDate]=useState(''),[items,setItems]=useState<Item[]>([blank()])
  const[file,setFile]=useState<File|null>(null),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false)
  const patch=(i:number,k:keyof Item,v:any)=>setItems(x=>x.map((a,j)=>j===i?{...a,[k]:v}:a))
  const calculatedEnd=(it:Item)=>it.warranty_end_date||((date&&it.warranty_months)?addMonths(date,it.warranty_months):'')
  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setMsg('')
    try{
      const result=await api<any>({action:'create_warranty',customer_name:customerName,phone,address,invoice_number:invoice,purchase_date:date||null,items:items.map(i=>({...i,warranty_end_date:calculatedEnd(i)||null}))})
      if(file&&result.product_ids?.[0])await uploadAttachment(file,{product_id:result.product_ids[0],kind:'receipt'})
      const first=result.product_ids?.[0]
      setMsg(`Đã khởi tạo ${result.product_ids.length} sản phẩm. ${first?'Bạn có thể tiếp nhận hàng lỗi ngay.':''}`)
      if(first) setTimeout(()=>nav(`/receive?product=${encodeURIComponent(first)}`),650)
    }catch(e:any){setMsg(e.message)}finally{setBusy(false)}
  }
  return <><div className="page-head legacy-page-head"><div><h1>Khởi tạo dữ liệu khách cũ</h1><p>Dùng cho khách mua trước khi siêu thị áp dụng chương trình và chưa có dữ liệu trên hệ thống</p></div></div>
  <div className="legacy-info-banner"><b>Khi nào dùng?</b><span>Khách mang hàng lỗi đến nhưng chưa có dữ liệu trên hệ thống. Nhập lại thông tin mua hàng/hóa đơn một lần, sau đó chương trình chuyển thẳng sang bước tiếp nhận hàng lỗi.</span></div>
  <form className="legacy-form" onSubmit={submit}>
    <section className="card form-grid step-card"><Step n="01" title="Khách hàng" sub="Tạo dữ liệu tra cứu ban đầu"/><label>Họ và tên khách hàng *<input required value={customerName} onChange={e=>setCustomerName(e.target.value)}/></label><label>Số điện thoại *<input required inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label><label className="wide">Địa chỉ<input value={address} onChange={e=>setAddress(e.target.value)}/></label></section>
    <section className="card form-grid step-card"><Step n="02" title="Thông tin mua hàng cũ" sub="Nhập theo hóa đơn giấy hoặc dữ liệu tra cứu từ hệ thống bán hàng"/><label>Mã hóa đơn / số chứng từ<input value={invoice} onChange={e=>setInvoice(e.target.value)}/></label><label>Ngày mua<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label className="wide file-drop">Ảnh hóa đơn / chứng từ cũ<input type="file" accept="image/*,.pdf" capture="environment" onChange={e=>setFile(e.target.files?.[0]||null)}/><small>{file?`Đã chọn: ${file.name}`:'Không bắt buộc nếu chưa tìm được hóa đơn; có thể bổ sung sau.'}</small></label></section>
    <section className="card form-grid step-card"><Step n="03" title="Sản phẩm cần khởi tạo" sub={`${items.length} sản phẩm`}/>{items.map((it,i)=><div className="item-box wide legacy-item" key={i}><div className="item-number">Sản phẩm {i+1}</div><div className="item-grid legacy-item-grid"><label className="item-name">Tên sản phẩm *<input required value={it.name} onChange={e=>patch(i,'name',e.target.value)}/></label><label>Mã hàng/SKU<input value={it.sku} onChange={e=>patch(i,'sku',e.target.value)}/></label><label>Thương hiệu/NCC<input value={it.brand} onChange={e=>patch(i,'brand',e.target.value)}/></label><label>Model<input value={it.model} onChange={e=>patch(i,'model',e.target.value)}/></label><label>Serial No./IMEI<input value={it.serial_number} onChange={e=>patch(i,'serial_number',e.target.value)}/></label><label>Số phiếu bảo hành<input value={it.warranty_card_number} onChange={e=>patch(i,'warranty_card_number',e.target.value)}/></label><label>Thời hạn BH (tháng)<input type="number" min="1" max="120" value={it.warranty_months} onChange={e=>patch(i,'warranty_months',Number(e.target.value)||1)}/></label><label>Hoặc nhập ngày hết BH<input type="date" value={it.warranty_end_date} onChange={e=>patch(i,'warranty_end_date',e.target.value)}/></label><label className="wide">Ngày hết bảo hành hệ thống sẽ lưu<input readOnly value={calculatedEnd(it)}/></label></div>{items.length>1&&<div className="row-actions"><span></span><button type="button" className="ghost" onClick={()=>setItems(x=>x.filter((_,j)=>j!==i))}>Xóa sản phẩm</button></div>}</div>)}<div className="wide"><button type="button" className="ghost add-item" onClick={()=>setItems(x=>[...x,blank()])}>＋ Thêm sản phẩm</button></div></section>
    <section className="card form-actions-card">{msg&&<div className="alert">{msg}</div>}<div className="actions"><span className="muted">Sau khi lưu, chương trình tự chuyển sang Tiếp nhận hàng lỗi.</span><button className="primary large-action" disabled={busy}>{busy?'Đang khởi tạo…':'Khởi tạo & tiếp nhận hàng lỗi'}</button></div></section>
  </form></>
}
