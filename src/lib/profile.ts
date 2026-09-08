import { supabase } from './supabase'

export type AppRole = 'admin' | 'staff' | 'viewer'
export type Profile = {
  id: string
  full_name: string | null
  email: string | null
  employee_code: string | null
  role: AppRole
  department: string | null
  active: boolean
  archived_at: string | null
}

export async function getMyProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('id,full_name,email,employee_code,role,department,active,archived_at').eq('id', user.id).maybeSingle()
  return (data as Profile | null) || null
}
