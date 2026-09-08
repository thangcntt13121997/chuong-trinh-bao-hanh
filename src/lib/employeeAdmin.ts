import { supabase } from './supabase'

export async function employeeAdmin(payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Phiên đăng nhập đã hết.')
  const res = await fetch('/.netlify/functions/employee-admin', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Không thực hiện được thao tác.')
  return data
}
