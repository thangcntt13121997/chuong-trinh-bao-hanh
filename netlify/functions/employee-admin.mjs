import { createClient } from '@supabase/supabase-js'

const fullStaff={create_warranty:true,receive_faulty:true,search:true,view_cases:true,edit_cases:true,manage_appointments:true,upload_files:true}
const viewerDefaults={create_warranty:false,receive_faulty:false,search:true,view_cases:true,edit_cases:false,manage_appointments:false,upload_files:false}
const normalizePermissions=(role,p)=>role==='admin'?fullStaff:{...(role==='staff'?fullStaff:viewerDefaults),...(p&&typeof p==='object'?p:{})}

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
})

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return json(500, { error: 'Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trên Netlify.' })

  const authHeader = event.headers.authorization || event.headers.Authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return json(401, { error: 'Thiếu phiên đăng nhập.' })

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  const actor = userData?.user
  if (userError || !actor) return json(401, { error: 'Phiên đăng nhập không hợp lệ.' })

  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('role,active,is_active,archived_at,full_name')
    .eq('id', actor.id)
    .maybeSingle()
  if (!actorProfile || actorProfile.role !== 'admin' || actorProfile.active === false || actorProfile.is_active === false || actorProfile.archived_at) {
    return json(403, { error: 'Chỉ Admin được quản lý tài khoản nhân viên.' })
  }

  let body = {}
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Dữ liệu gửi lên không hợp lệ.' }) }
  const action = String(body.action || '')

  const audit = async (entityId, note, oldData = null, newData = null) => {
    await supabase.from('audit_logs').insert({
      entity_type: 'profiles',
      entity_id: entityId,
      action: `${action}: ${note}`,
      before_data: oldData,
      after_data: newData,
      actor_id: actor.id,
      actor_name: actorProfile.full_name || actor.email || 'Admin',
    })
  }

  if (action === 'list') {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (error) return json(400, { error: error.message })
    return json(200, { rows: data || [] })
  }

  if (action === 'create') {
    const username = String(body.username || '').trim().toLowerCase()
    const suppliedEmail = String(body.email || '').trim().toLowerCase()
    const email = suppliedEmail || `${username}@warranty.local`
    const password = String(body.password || '')
    const fullName = String(body.full_name || '').trim()
    const employeeCode = String(body.employee_code || '').trim()
    const department = String(body.department || '').trim()
    const role = ['admin', 'staff', 'viewer'].includes(body.role) ? body.role : 'viewer'
    if (!username || !/^[a-z0-9._-]{2,40}$/.test(username) || !email.includes('@') || password.length < 8 || !fullName || !employeeCode) {
      return json(400, { error: 'Cần họ tên, mã nhân viên, tên đăng nhập hợp lệ và mật khẩu tối thiểu 8 ký tự.' })
    }
    const { data: dup } = await supabase.from('profiles').select('id').ilike('username', username).maybeSingle()
    if (dup) return json(400, { error: 'Tên đăng nhập đã tồn tại.' })

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (error || !data.user) return json(400, { error: error?.message || 'Không tạo được tài khoản.' })

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      email,
      username,
      employee_code: employeeCode,
      department: department || null,
      role,
      permissions: normalizePermissions(role, body.permissions),
      active: true,
      is_active: true,
      archived_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    if (profileError) {
      await supabase.auth.admin.deleteUser(data.user.id)
      return json(400, { error: profileError.message })
    }
    await audit(data.user.id, `Tạo nhân viên ${employeeCode}`, null, { username, email, full_name: fullName, employee_code: employeeCode, department, role, active: true })
    return json(200, { ok: true, id: data.user.id })
  }

  const userId = String(body.user_id || '')
  if (!userId) return json(400, { error: 'Thiếu user_id.' })
  if (userId === actor.id && ['archive', 'set_active'].includes(action) && body.active === false) {
    return json(400, { error: 'Bạn không thể tự khóa hoặc lưu trữ chính tài khoản Admin đang đăng nhập.' })
  }

  const { data: oldProfile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (!oldProfile) return json(404, { error: 'Không tìm thấy nhân viên.' })

  if (action === 'update') {
    const role = ['admin', 'staff', 'viewer'].includes(body.role) ? body.role : oldProfile.role
    const patch = {
      full_name: String(body.full_name ?? oldProfile.full_name ?? '').trim(),
      employee_code: String(body.employee_code ?? oldProfile.employee_code ?? '').trim(),
      username: String(body.username ?? oldProfile.username ?? '').trim().toLowerCase(),
      department: String(body.department ?? oldProfile.department ?? '').trim() || null,
      role,
      permissions: normalizePermissions(role, body.permissions ?? oldProfile.permissions),
      updated_at: new Date().toISOString(),
    }
    // Tài khoản legacy có thể chưa có mã nhân viên. Không chặn việc lưu phân quyền chỉ vì thiếu employee_code.
    if (!patch.full_name || !/^[a-z0-9._-]{2,40}$/.test(patch.username)) return json(400, { error: 'Họ tên và tên đăng nhập không được để trống.' })
    const { data: sameUsername } = await supabase.from('profiles').select('id').ilike('username', patch.username).neq('id', userId).maybeSingle()
    if (sameUsername) return json(400, { error: 'Tên đăng nhập đã được sử dụng.' })
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
    if (error) return json(400, { error: error.message })
    await audit(userId, 'Cập nhật thông tin/phân quyền nhân viên', oldProfile, { ...oldProfile, ...patch })
    return json(200, { ok: true })
  }

  if (action === 'set_active') {
    const active = Boolean(body.active)
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, { ban_duration: active ? 'none' : '876000h' })
    if (authError) return json(400, { error: authError.message })
    const { error } = await supabase.from('profiles').update({ active, is_active: active }).eq('id', userId)
    if (error) return json(400, { error: error.message })
    await audit(userId, active ? 'Mở khóa tài khoản' : 'Khóa tài khoản', oldProfile, { ...oldProfile, active })
    return json(200, { ok: true })
  }

  if (action === 'archive') {
    const archivedAt = new Date().toISOString()
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
    if (authError) return json(400, { error: authError.message })
    const { error } = await supabase.from('profiles').update({ active: false, is_active: false, archived_at: archivedAt }).eq('id', userId)
    if (error) return json(400, { error: error.message })
    await audit(userId, 'Lưu trữ tài khoản nhân viên (xóa mềm)', oldProfile, { ...oldProfile, active: false, archived_at: archivedAt })
    return json(200, { ok: true })
  }

  if (action === 'restore') {
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' })
    if (authError) return json(400, { error: authError.message })
    const { error } = await supabase.from('profiles').update({ active: true, is_active: true, archived_at: null }).eq('id', userId)
    if (error) return json(400, { error: error.message })
    await audit(userId, 'Khôi phục tài khoản nhân viên', oldProfile, { ...oldProfile, active: true, archived_at: null })
    return json(200, { ok: true })
  }

  if (action === 'reset_password') {
    const password = String(body.password || '')
    if (password.length < 8) return json(400, { error: 'Mật khẩu mới phải có tối thiểu 8 ký tự.' })
    const { error } = await supabase.auth.admin.updateUserById(userId, { password })
    if (error) return json(400, { error: error.message })
    await audit(userId, 'Admin đặt lại mật khẩu cho nhân viên')
    return json(200, { ok: true })
  }

  return json(400, { error: 'Action không được hỗ trợ.' })
}
