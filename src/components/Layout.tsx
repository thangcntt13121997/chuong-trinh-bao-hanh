import {useEffect,useMemo,useState} from 'react'
import{NavLink,Outlet,useLocation,useNavigate}from'react-router-dom'
import{supabase}from'../lib/supabase'
import{can,getMyProfile,type Profile}from'../lib/profile'
import{api}from'../lib/api'

const Icon=({name}:{name:string})=>{
  const paths:Record<string,string>={
    dashboard:'M4 13a8 8 0 1 1 16 0M12 13l4-4M5 19h14',
    plus:'M12 5v14M5 12h14M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
    box:'M4 7l8-4 8 4v10l-8 4-8-4V7Zm0 0 8 5 8-5M12 12v9',
    clipboard:'M9 5h6M9 3h6v4H9V3ZM6 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1M7 11h10M7 15h10',
    search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 5 5',
    users:'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21c0-4 2.5-6 6-6s6 2 6 6M17 11a3 3 0 1 0 0-6M16 15c3 0 5 2 5 6',
    log:'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
    logout:'M10 5H5v14h5M13 8l5 4-5 4M18 12H9'
  }
  return <svg className="menu-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]||paths.dashboard}/></svg>
}

export default function Layout(){
  const nav=useNavigate();const location=useLocation();const[p,setP]=useState<Profile|null>(null);const[caseCount,setCaseCount]=useState(0)
  useEffect(()=>{void getMyProfile().then(setP)},[])
  useEffect(()=>{if(!p||!can(p,'view_cases'))return;api<any>({action:'list_cases'}).then(d=>setCaseCount((d.rows||[]).length)).catch(()=>setCaseCount(0))},[p,location.pathname])
  const logout=async()=>{await supabase.auth.signOut();nav('/login')}
  const today=useMemo(()=>new Intl.DateTimeFormat('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date()),[])
  return <div className="app-shell legacy-shell">
    <aside className="sidebar legacy-sidebar">
      <div className="brand-lockup"><div className="brand-mark">♢</div><div><div className="brand">Co.opmart</div><small>Quản lý bảo hành</small></div></div>
      <nav className="desktop-nav legacy-nav">
        <NavLink to="/" end><Icon name="dashboard"/><span>Tổng quan</span></NavLink>
        {can(p,'create_warranty')&&<NavLink to="/new"><Icon name="plus"/><span>Tạo bảo hành mua mới</span></NavLink>}
        {can(p,'create_warranty')&&<NavLink to="/initialize"><Icon name="clipboard"/><span>Khởi tạo dữ liệu khách cũ</span></NavLink>}
        {can(p,'receive_faulty')&&<NavLink to="/receive"><Icon name="box"/><span>Tiếp nhận hàng lỗi</span></NavLink>}
        {can(p,'view_cases')&&<NavLink to="/cases"><Icon name="clipboard"/><span>Hồ sơ bảo hành</span><em className="nav-count">{caseCount}</em></NavLink>}
        {can(p,'search')&&<NavLink to="/search"><Icon name="search"/><span>Tra cứu khách hàng</span></NavLink>}
        {p?.role==='admin'&&<div className="nav-divider"><span>QUẢN TRỊ</span></div>}
        {p?.role==='admin'&&<NavLink to="/employees"><Icon name="users"/><span>Nhân viên & phân quyền</span></NavLink>}
        {p?.role==='admin'&&<NavLink to="/audit"><Icon name="log"/><span>Nhật ký thay đổi</span></NavLink>}
      </nav>
      <div className="sidebar-user"><div className="avatar">{(p?.full_name||'NV').split(/\s+/).map(x=>x[0]).slice(-2).join('').toUpperCase()}</div><div className="sidebar-user-text"><b>{p?.full_name||'Đang tải…'}</b><span>{p?.role==='admin'?'Quản trị viên':p?.role==='staff'?'Nhân viên siêu thị':'Nhân viên tra cứu'}</span><small>Đang trực tuyến</small></div><button className="logout-icon" onClick={logout} title="Đăng xuất"><Icon name="logout"/></button></div>
    </aside>
    <main className="content legacy-content"><div className="desktop-date">▣&nbsp; {today}</div><Outlet/></main>
    <nav className="mobile-bottom-nav legacy-mobile-nav" aria-label="Điều hướng chính">
      <NavLink to="/" end><Icon name="dashboard"/><span>Tổng quan</span></NavLink>
      {can(p,'create_warranty')&&<NavLink to="/new"><Icon name="plus"/><span>Bảo hành<br/>mua mới</span></NavLink>}
      {can(p,'receive_faulty')&&<NavLink to="/receive"><Icon name="box"/><span>Tiếp nhận<br/>hàng lỗi</span></NavLink>}
      {can(p,'view_cases')&&<NavLink to="/cases"><Icon name="clipboard"/><span>Hồ sơ<br/>bảo hành</span></NavLink>}
    </nav>
  </div>
}
