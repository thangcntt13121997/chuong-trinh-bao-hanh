import { createClient } from '@supabase/supabase-js'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
})

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publicKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !serviceKey || !publicKey) return json(500, { error: 'Netlify đang thiếu biến môi trường Supabase.' })

  let body = {}
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Dữ liệu đăng nhập không hợp lệ.' }) }
  const username = String(body.username || '').trim().toLowerCase()
  const password = String(body.password || '')
  if (!username || !password) return json(400, { error: 'Cần tên đăng nhập và mật khẩu.' })

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id,email,active,is_active,archived_at')
    .ilike('username', username)
    .maybeSingle()
  if (profileError || !profile || !profile.email || profile.active === false || profile.is_active === false || profile.archived_at) {
    return json(401, { error: 'Tên đăng nhập hoặc mật khẩu không đúng.' })
  }

  const authClient = createClient(url, publicKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await authClient.auth.signInWithPassword({ email: profile.email, password })
  if (error || !data.session) return json(401, { error: 'Tên đăng nhập hoặc mật khẩu không đúng.' })

  return json(200, {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
  })
}
