import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch('/.netlify/functions/username-login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.access_token || !body?.refresh_token) {
        throw new Error(body?.error || 'Đăng nhập không thành công.')
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
      })
      if (sessionError) throw sessionError
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng nhập không thành công. Kiểm tra tên đăng nhập và mật khẩu.')
    } finally { setLoading(false) }
  }

  return <div className="login-wrap">
    <form className="card login-card" onSubmit={submit}>
      <h1>Quản lý bảo hành</h1>
      <p className="muted">Đăng nhập tài khoản nhân viên</p>
      <label>Tên đăng nhập<input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required placeholder="Ví dụ: it hoặc nv001" /></label>
      <label>Mật khẩu<input autoComplete="current-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
      {error && <div className="alert danger-bg">{error}</div>}
      <button className="primary" disabled={loading}>{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
    </form>
  </div>
}
