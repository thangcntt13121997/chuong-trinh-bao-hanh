import { supabase } from './supabase'
export async function api<T=any>(payload:Record<string,unknown>):Promise<T>{
  const {data:{session}}=await supabase.auth.getSession(); if(!session) throw new Error('Phiên đăng nhập đã hết.')
  const r=await fetch('/.netlify/functions/legacy-api',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`},body:JSON.stringify(payload)})
  const data=await r.json().catch(()=>({error:'Phản hồi máy chủ không hợp lệ.'})); if(!r.ok) throw new Error(data.error||`HTTP ${r.status}`); return data as T
}
export async function uploadAttachment(file:File,meta:{product_id?:string;service_case_id?:string;kind?:string}){
  const prep=await api<{path:string;token:string}>({action:'prepare_upload',file_name:file.name})
  const {error}=await supabase.storage.from('warranty-files').uploadToSignedUrl(prep.path,prep.token,file,{contentType:file.type||undefined}); if(error) throw error
  return api({action:'complete_attachment',...meta,file_name:file.name,storage_path:prep.path,mime_type:file.type,size_bytes:file.size})
}
