import {useEffect,useState} from 'react'
import{NavLink,Outlet,useNavigate}from'react-router-dom'
import{supabase}from'../lib/supabase'
import{can,getMyProfile,type Profile}from'../lib/profile'

export default function Layout(){
  const nav=useNavigate();const[p,setP]=useState<Profile|null>(null)
  useEffect(()=>{void getMyProfile().then(setP)},[])
  const logout=async()=>{await supabase.auth.signOut();nav('/login')}
  return <div className="app-shell">
    <aside className="sidebar">
      <div><div className="brand">Bảo hành điện tử</div><div className="user-mini">{p?.full_name||'Đang tải…'}{p&&<span>{p.employee_code||p.username||p.role} · {p.role==='admin'?'Admin':p.role==='staff'?'Nhân viên':'Tra cứu'}</span>}</div></div>
      <nav className="desktop-nav">
        <NavLink to="/">Tổng quan</NavLink>
        {can(p,'create_warranty')&&<NavLink to="/new">+ Bảo hành mua mới</NavLink>}
        {can(p,'receive_faulty')&&<NavLink to="/receive">+ Tiếp nhận hàng lỗi</NavLink>}
        {can(p,'search')&&<NavLink to="/search">Tra cứu</NavLink>}
        {can(p,'view_cases')&&<NavLink to="/cases">Hồ sơ bảo hành</NavLink>}
        {p?.role==='admin'&&<NavLink to="/employees">Nhân viên</NavLink>}
        {p?.role==='admin'&&<NavLink to="/audit">Nhật ký</NavLink>}
      </nav>
      <button className="ghost logout-btn" onClick={logout}>Đăng xuất</button>
    </aside>
    <main className="content"><Outlet/></main>
    <nav className="mobile-bottom-nav" aria-label="Điều hướng chính">
      <NavLink to="/"><span className="nav-icon">◔</span><span>Tổng quan</span></NavLink>
      {can(p,'create_warranty')&&<NavLink to="/new"><span className="nav-icon">＋</span><span>Bảo hành<br/>mua mới</span></NavLink>}
      {can(p,'receive_faulty')&&<NavLink to="/receive"><span className="nav-icon">◇</span><span>Tiếp nhận<br/>hàng lỗi</span></NavLink>}
      {can(p,'view_cases')&&<NavLink to="/cases"><span className="nav-icon">▣</span><span>Hồ sơ<br/>bảo hành</span></NavLink>}
    </nav>
  </div>
}
