import { createClient } from '@supabase/supabase-js'

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
    .select('role,active,archived_at')
    .eq('id', actor.id)
    .maybeSingle()
  if (!actorProfile || actorProfile.role !== 'admin' || !actorProfile.active || actorProfile.archived_at) {
    return json(403, { error: 'Chỉ Admin được quản lý tài khoản nhân viên.' })
  }

  let body = {}
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Dữ liệu gửi lên không hợp lệ.' }) }
  const action = String(body.action || '')

  const audit = async (entityId, note, oldData = null, newData = null) => {
    await supabase.from('audit_logs').insert({
      actor_user_id: actor.id,
      action,
      entity_type: 'profiles',
      entity_id: entityId,
      old_data: oldData,
      new_data: newData,
      note,
    })
  }

  if (action === 'create') {
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const fullName = String(body.full_name || '').trim()
    const employeeCode = String(body.employee_code || '').trim()
    const department = String(body.department || '').trim()
    const role = ['admin', 'staff', 'viewer'].includes(body.role) ? body.role : 'viewer'
    if (!email || !email.includes('@') || password.length < 8 || !fullName || !employeeCode) {
      return json(400, { error: 'Cần họ tên, mã nhân viên, email hợp lệ và mật khẩu tối thiểu 8 ký tự.' })
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (error || !data.user) return json(400, { error: error?.message || 'Không tạo được tài khoản.' })

    const { error: profileError } = await supabase.from('profiles').update({
      full_name: fullName,
      email,
      employee_code: employeeCode,
      department: department || null,
      role,
      active: true,
      archived_at: null,
    }).eq('id', data.user.id)

    if (profileError) {
      await supabase.auth.admin.deleteUser(data.user.id)
      return json(400, { error: profileError.message })
    }
    await audit(data.user.id, `Tạo nhân viên ${employeeCode}`, null, { email, full_name: fullName, employee_code: employeeCode, department, role, active: true })
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
      department: String(body.department ?? oldProfile.department ?? '').trim() || null,
      role,
    }
    if (!patch.full_name || !patch.employee_code) return json(400, { error: 'Họ tên và mã nhân viên không được để trống.' })
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
    if (error) return json(400, { error: error.message })
    await audit(userId, 'Cập nhật thông tin/phân quyền nhân viên', oldProfile, { ...oldProfile, ...patch })
    return json(200, { ok: true })
  }

  if (action === 'set_active') {
    const active = Boolean(body.active)
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, { ban_duration: active ? 'none' : '876000h' })
    if (authError) return json(400, { error: authError.message })
    const { error } = await supabase.from('profiles').update({ active }).eq('id', userId)
    if (error) return json(400, { error: error.message })
    await audit(userId, active ? 'Mở khóa tài khoản' : 'Khóa tài khoản', oldProfile, { ...oldProfile, active })
    return json(200, { ok: true })
  }

  if (action === 'archive') {
    const archivedAt = new Date().toISOString()
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
    if (authError) return json(400, { error: authError.message })
    const { error } = await supabase.from('profiles').update({ active: false, archived_at: archivedAt }).eq('id', userId)
    if (error) return json(400, { error: error.message })
    await audit(userId, 'Lưu trữ tài khoản nhân viên (xóa mềm)', oldProfile, { ...oldProfile, active: false, archived_at: archivedAt })
    return json(200, { ok: true })
  }

  if (action === 'restore') {
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' })
    if (authError) return json(400, { error: authError.message })
    const { error } = await supabase.from('profiles').update({ active: true, archived_at: null }).eq('id', userId)
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
