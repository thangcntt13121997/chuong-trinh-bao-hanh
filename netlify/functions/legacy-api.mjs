import { createClient } from '@supabase/supabase-js'

const json=(statusCode,body)=>({statusCode,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'},body:JSON.stringify(body)})
const safeFile=(s='file')=>String(s).replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120)

export const handler=async(event)=>{
  if(event.httpMethod!=='POST') return json(405,{error:'Method not allowed'})
  const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url||!key) return json(500,{error:'Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.'})
  const token=(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'')
  if(!token) return json(401,{error:'Thiếu phiên đăng nhập.'})
  const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
  const {data:u}=await db.auth.getUser(token); const user=u?.user
  if(!user) return json(401,{error:'Phiên đăng nhập không hợp lệ.'})
  const {data:profile}=await db.from('profiles').select('*').eq('id',user.id).maybeSingle()
  const enabled=profile && profile.is_active!==false && profile.active!==false && !profile.archived_at
  if(!enabled) return json(403,{error:'Tài khoản đã bị khóa hoặc không có hồ sơ nhân viên.'})
  let body={}; try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Dữ liệu không hợp lệ.'})}
  const action=String(body.action||'')
  const isWrite=['admin','staff'].includes(profile.role); const isAdmin=profile.role==='admin'
  const audit=async(entityType,entityId,act,beforeData=null,afterData=null)=>{
    await db.from('audit_logs').insert({entity_type:entityType,entity_id:entityId,action:act,before_data:beforeData,after_data:afterData,actor_id:user.id,actor_name:profile.full_name||profile.username||user.email||'Nhân viên'})
  }

  try{
    if(action==='list_audit'){
      if(!isAdmin) return json(403,{error:'Chỉ Admin được xem nhật ký.'})
      const {data,error}=await db.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(300); if(error) throw error; return json(200,{rows:data||[]})
    }
    if(action==='dashboard'){
      const [c,p,s,a]=await Promise.all([
        db.from('customers').select('*',{count:'exact',head:true}),
        db.from('products').select('*',{count:'exact',head:true}).is('archived_at',null),
        db.from('service_cases').select('*',{count:'exact',head:true}).is('archived_at',null),
        db.from('service_appointments').select('*',{count:'exact',head:true}).gte('scheduled_at',new Date().toISOString())
      ])
      const {data:recent,error}=await db.from('service_cases').select('id,case_code,status,issue_description,received_at,customer:customers(full_name,phone),product:products(name,sku,serial_number)').is('archived_at',null).order('created_at',{ascending:false}).limit(8)
      if(error) throw error
      return json(200,{stats:{customers:c.count||0,products:p.count||0,cases:s.count||0,appointments:a.count||0},recent:recent||[],profile})
    }
    if(action==='search'){
      const q=String(body.q||'').trim(); if(!q) return json(200,{customers:[],products:[],cases:[]})
      const like=`%${q.replace(/[%_]/g,'')}%`
      const [cr,pr,sr]=await Promise.all([
        db.from('customers').select('id,full_name,phone,address').or(`full_name.ilike.${like},phone.ilike.${like}`).limit(20),
        db.from('products').select('id,name,sku,brand,model,serial_number,purchase_date,warranty_end_date,invoice_number,customer:customers(full_name,phone)').is('archived_at',null).or(`name.ilike.${like},sku.ilike.${like},brand.ilike.${like},model.ilike.${like},serial_number.ilike.${like},invoice_number.ilike.${like}`).limit(30),
        db.from('service_cases').select('id,case_code,status,issue_description,received_at,customer:customers(full_name,phone),product:products(name,sku,serial_number)').is('archived_at',null).or(`case_code.ilike.${like},status.ilike.${like},issue_description.ilike.${like}`).limit(30)
      ])
      if(cr.error) throw cr.error; if(pr.error) throw pr.error; if(sr.error) throw sr.error
      return json(200,{customers:cr.data||[],products:pr.data||[],cases:sr.data||[]})
    }
    if(action==='list_cases'){
      let q=db.from('service_cases').select('id,case_code,status,issue_description,service_type,received_at,promised_return_at,returned_at,customer:customers(full_name,phone),product:products(name,sku,serial_number)').is('archived_at',null).order('created_at',{ascending:false}).limit(100)
      if(body.status) q=q.eq('status',String(body.status)); const {data,error}=await q; if(error) throw error; return json(200,{rows:data||[]})
    }
    if(action==='create_warranty'){
      if(!isWrite) return json(403,{error:'Tài khoản chỉ có quyền tra cứu.'})
      const name=String(body.customer_name||'').trim()||'Khách hàng'; const phone=String(body.phone||'').trim(); if(!phone) return json(400,{error:'Cần số điện thoại khách hàng.'})
      let customerId; const {data:existing}=await db.from('customers').select('id').eq('phone',phone).maybeSingle()
      if(existing?.id) customerId=existing.id; else {const {data:c,error}=await db.from('customers').insert({full_name:name,phone,address:String(body.address||'').trim()||null,created_by:user.id}).select('id').single(); if(error) throw error; customerId=c.id}
      const items=Array.isArray(body.items)?body.items:[]; if(!items.length) return json(400,{error:'Cần ít nhất một sản phẩm.'})
      const ids=[]
      for(const i of items){
        const payload={customer_id:customerId,name:String(i.name||'').trim(),sku:String(i.sku||'').trim()||null,brand:String(i.brand||'').trim()||null,model:String(i.model||'').trim()||null,serial_number:String(i.serial_number||'').trim()||null,purchase_date:body.purchase_date||null,warranty_end_date:i.warranty_end_date||null,warranty_card_number:String(i.warranty_card_number||'').trim()||null,invoice_number:String(body.invoice_number||'').trim()||null,created_by:user.id}
        if(!payload.name) return json(400,{error:'Tên sản phẩm không được để trống.'})
        const {data:p,error}=await db.from('products').insert(payload).select('id').single(); if(error) throw error; ids.push(p.id); await audit('products',p.id,'create',null,payload)
      }
      return json(200,{ok:true,customer_id:customerId,product_ids:ids})
    }
    if(action==='product_detail'){
      const id=String(body.id||''); const {data:product,error}=await db.from('products').select('*,customer:customers(*)').eq('id',id).maybeSingle(); if(error) throw error; if(!product) return json(404,{error:'Không tìm thấy sản phẩm.'})
      const [at,sc]=await Promise.all([
        db.from('attachments').select('*').eq('product_id',id).order('created_at',{ascending:false}),
        db.from('service_cases').select('id,case_code,status,issue_description,received_at,promised_return_at,returned_at').eq('product_id',id).is('archived_at',null).order('created_at',{ascending:false})
      ])
      return json(200,{product,attachments:at.data||[],cases:sc.data||[]})
    }
    if(action==='update_product'){
      if(!isWrite) return json(403,{error:'Không có quyền chỉnh sửa.'}); const id=String(body.id||'')
      const {data:old}=await db.from('products').select('*').eq('id',id).maybeSingle(); if(!old) return json(404,{error:'Không tìm thấy sản phẩm.'})
      const allowed=['name','sku','brand','model','serial_number','purchase_date','warranty_end_date','warranty_card_number','invoice_number']; const patch={}; for(const k of allowed) if(k in body.patch) patch[k]=body.patch[k]||null
      const {data,error}=await db.from('products').update(patch).eq('id',id).select('*').single(); if(error) throw error; await audit('products',id,'update',old,data); return json(200,{product:data})
    }
    if(action==='archive_product'){
      if(!isAdmin) return json(403,{error:'Chỉ Admin được lưu trữ sản phẩm.'}); const id=String(body.id||''); const {data:old}=await db.from('products').select('*').eq('id',id).maybeSingle(); if(!old) return json(404,{error:'Không tìm thấy sản phẩm.'})
      const patch={archived_at:new Date().toISOString(),archived_by:user.id,archive_reason:String(body.reason||'').trim()||'Admin lưu trữ'}; const {error}=await db.from('products').update(patch).eq('id',id); if(error) throw error; await audit('products',id,'archive',old,{...old,...patch}); return json(200,{ok:true})
    }
    if(action==='create_case'){
      if(!isWrite) return json(403,{error:'Không có quyền tạo hồ sơ xử lý.'})
      const productId=String(body.product_id||''); const {data:p}=await db.from('products').select('customer_id').eq('id',productId).maybeSingle(); if(!p) return json(404,{error:'Không tìm thấy sản phẩm.'})
      const code=String(body.case_code||'').trim()||`BH-${Date.now().toString().slice(-8)}`
      const payload={case_code:code,customer_id:p.customer_id,product_id:productId,status:String(body.status||'received'),issue_description:String(body.issue_description||'').trim(),condition_description:String(body.condition_description||'').trim()||null,cause_category:String(body.cause_category||'').trim()||null,service_type:String(body.service_type||'warranty'),estimated_fee:body.estimated_fee?Number(body.estimated_fee):null,supplier_name:String(body.supplier_name||'').trim()||null,has_warranty_card:Boolean(body.has_warranty_card),is_sealed:Boolean(body.is_sealed),has_wrapping:Boolean(body.has_wrapping),has_box:Boolean(body.has_box),received_at:body.received_at||new Date().toISOString(),promised_return_at:body.promised_return_at||null,notes:String(body.notes||'').trim()||null,created_by:user.id,assigned_to:body.assigned_to||null}
      if(!payload.issue_description) return json(400,{error:'Cần mô tả tình trạng/lỗi sản phẩm.'})
      const {data,error}=await db.from('service_cases').insert(payload).select('id').single(); if(error) throw error; await db.from('case_events').insert({service_case_id:data.id,event_type:'created',to_status:payload.status,details:{note:'Tạo hồ sơ tiếp nhận'},actor_id:user.id}); await audit('service_cases',data.id,'create',null,payload); return json(200,{id:data.id,case_code:code})
    }
    if(action==='case_detail'){
      const id=String(body.id||''); const {data:row,error}=await db.from('service_cases').select('*,customer:customers(*),product:products(*),assignee:profiles!service_cases_assigned_to_fkey(id,full_name,employee_code)').eq('id',id).maybeSingle(); if(error){
        const fallback=await db.from('service_cases').select('*,customer:customers(*),product:products(*)').eq('id',id).maybeSingle(); if(fallback.error) throw fallback.error; if(!fallback.data)return json(404,{error:'Không tìm thấy hồ sơ.'});
        const [ev,ap,at,doc]=await Promise.all([db.from('case_events').select('*').eq('service_case_id',id).order('created_at',{ascending:false}),db.from('service_appointments').select('*').eq('service_case_id',id).order('scheduled_at',{ascending:true}),db.from('attachments').select('*').eq('service_case_id',id).order('created_at',{ascending:false}),db.from('generated_documents').select('id,form_code,template_version,created_at').eq('service_case_id',id).order('created_at',{ascending:false})]); return json(200,{row:fallback.data,events:ev.data||[],appointments:ap.data||[],attachments:at.data||[],documents:doc.data||[]})
      }
      if(!row) return json(404,{error:'Không tìm thấy hồ sơ.'}); const [ev,ap,at,doc]=await Promise.all([db.from('case_events').select('*').eq('service_case_id',id).order('created_at',{ascending:false}),db.from('service_appointments').select('*').eq('service_case_id',id).order('scheduled_at',{ascending:true}),db.from('attachments').select('*').eq('service_case_id',id).order('created_at',{ascending:false}),db.from('generated_documents').select('id,form_code,template_version,created_at').eq('service_case_id',id).order('created_at',{ascending:false})]); return json(200,{row,events:ev.data||[],appointments:ap.data||[],attachments:at.data||[],documents:doc.data||[]})
    }
    if(action==='update_case'){
      if(!isWrite) return json(403,{error:'Không có quyền chỉnh sửa.'}); const id=String(body.id||''); const {data:old}=await db.from('service_cases').select('*').eq('id',id).maybeSingle(); if(!old)return json(404,{error:'Không tìm thấy hồ sơ.'})
      const allowed=['status','issue_description','condition_description','cause_category','service_type','estimated_fee','supplier_name','promised_return_at','returned_at','notes','assigned_to']; const patch={}; for(const k of allowed) if(k in body.patch) patch[k]=body.patch[k]===''?null:body.patch[k]
      const {data,error}=await db.from('service_cases').update(patch).eq('id',id).select('*').single(); if(error) throw error
      if(patch.status && patch.status!==old.status) await db.from('case_events').insert({service_case_id:id,event_type:'status_changed',from_status:old.status,to_status:patch.status,details:{note:String(body.note||'Cập nhật trạng thái')},actor_id:user.id})
      await audit('service_cases',id,'update',old,data); return json(200,{row:data})
    }
    if(action==='add_appointment'){
      if(!isWrite) return json(403,{error:'Không có quyền tạo lịch hẹn.'}); const payload={service_case_id:String(body.service_case_id),appointment_type:String(body.appointment_type||'customer_return'),scheduled_at:body.scheduled_at,status:String(body.status||'scheduled'),note:String(body.note||'').trim()||null,created_by:user.id}; if(!payload.scheduled_at)return json(400,{error:'Cần thời gian lịch hẹn.'}); const {data,error}=await db.from('service_appointments').insert(payload).select('*').single(); if(error) throw error; await audit('service_appointments',data.id,'create',null,payload); return json(200,{row:data})
    }
    if(action==='prepare_upload'){
      if(!isWrite) return json(403,{error:'Không có quyền tải file.'}); const bucket='warranty-files'; const path=`${user.id}/${new Date().toISOString().slice(0,10)}/${Date.now()}-${safeFile(body.file_name)}`
      await db.storage.createBucket(bucket,{public:false}).catch(()=>{})
      const {data,error}=await db.storage.from(bucket).createSignedUploadUrl(path); if(error) throw error; return json(200,{bucket,path,token:data.token,signedUrl:data.signedUrl})
    }
    if(action==='complete_attachment'){
      if(!isWrite) return json(403,{error:'Không có quyền lưu file.'}); const payload={product_id:body.product_id||null,service_case_id:body.service_case_id||null,kind:String(body.kind||'receipt'),file_name:String(body.file_name||'file'),storage_path:String(body.storage_path||''),mime_type:String(body.mime_type||'')||null,size_bytes:Number(body.size_bytes||0)||null,created_by:user.id}; const {data,error}=await db.from('attachments').insert(payload).select('*').single(); if(error) throw error; await audit('attachments',data.id,'create',null,payload); return json(200,{row:data})
    }
    if(action==='signed_download'){
      const path=String(body.storage_path||''); const {data,error}=await db.storage.from('warranty-files').createSignedUrl(path,300); if(error) throw error; return json(200,{url:data.signedUrl})
    }
    return json(400,{error:'Action không được hỗ trợ.'})
  }catch(e){return json(400,{error:e?.message||'Có lỗi xảy ra.'})}
}
