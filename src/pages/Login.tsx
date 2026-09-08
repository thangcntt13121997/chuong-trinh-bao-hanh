import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setError('Đăng nhập không thành công. Kiểm tra email và mật khẩu.')
    navigate('/')
  }

  return <div className="login-wrap">
    <form className="card login-card" onSubmit={submit}>
      <h1>Quản lý bảo hành</h1>
      <p className="muted">Đăng nhập tài khoản nhân viên</p>
      <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
      <label>Mật khẩu<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
      {error && <div className="alert danger-bg">{error}</div>}
      <button className="primary" disabled={loading}>{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
    </form>
  </div>
}
