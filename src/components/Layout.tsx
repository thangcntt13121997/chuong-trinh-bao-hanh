import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getMyProfile, type Profile } from '../lib/profile'

export default function Layout() {
  const navigate = useNavigate(); const [profile,setProfile]=useState<Profile|null>(null)
  useEffect(()=>{void getMyProfile().then(setProfile)},[])
  const logout = async () => { await supabase.auth.signOut(); navigate('/login') }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div><div className="brand">Bảo hành điện tử</div><div className="user-mini">{profile?.full_name||'Đang tải…'}{profile&&<span>{profile.employee_code||profile.role} · {profile.role}</span>}</div></div>
        <nav>
          <NavLink to="/">Tổng quan</NavLink>
          {profile?.role!=='viewer'&&<NavLink to="/new">+ Tạo hồ sơ</NavLink>}
          <NavLink to="/search">Tra cứu</NavLink>
          {profile?.role==='admin'&&<NavLink to="/employees">Nhân viên</NavLink>}
          {profile?.role==='admin'&&<NavLink to="/audit">Nhật ký</NavLink>}
        </nav>
        <button className="ghost" onClick={logout}>Đăng xuất</button>
      </aside>
      <main className="content"><Outlet /></main>
    </div>
  )
}
