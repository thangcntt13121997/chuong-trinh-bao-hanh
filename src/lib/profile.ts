import { api } from './api'
export type AppRole='admin'|'staff'|'viewer'
export type PermissionKey='create_warranty'|'receive_faulty'|'search'|'view_cases'|'edit_cases'|'manage_appointments'|'upload_files'
export type AppPermissions=Record<PermissionKey,boolean>
export type Profile={id:string;full_name:string;role:AppRole;is_active?:boolean;active?:boolean;created_at?:string;updated_at?:string;username?:string|null;email?:string|null;archived_at?:string|null;employee_code?:string|null;department?:string|null;permissions?:Partial<AppPermissions>|null;effective_permissions?:AppPermissions}
export async function getMyProfile(){try{const d=await api<{profile:Profile}>({action:'me'});return d.profile||null}catch{return null}}
export function can(p:Profile|null,key:PermissionKey){return p?.role==='admin'||Boolean(p?.effective_permissions?.[key]??p?.permissions?.[key])}
