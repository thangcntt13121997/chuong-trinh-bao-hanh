import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewWarranty from './pages/NewWarranty'
import Search from './pages/Search'
import Employees from './pages/Employees'
import WarrantyDetail from './pages/WarrantyDetail'
import AuditLogs from './pages/AuditLogs'

export default function App(){
  const [session,setSession]=useState<Session|null>(null); const [ready,setReady]=useState(false)
  useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>subscription.unsubscribe()},[])
  if(!ready)return <div className="center">Đang khởi động…</div>
  return <Routes>
    <Route path="/login" element={session?<Navigate to="/" replace/>:<Login/>}/>
    <Route element={session?<Layout/>:<Navigate to="/login" replace/>}>
      <Route index element={<Dashboard/>}/>
      <Route path="new" element={<NewWarranty/>}/>
      <Route path="search" element={<Search/>}/>
      <Route path="warranty/:id" element={<WarrantyDetail/>}/>
      <Route path="employees" element={<Employees/>}/>
      <Route path="audit" element={<AuditLogs/>}/>
    </Route>
  </Routes>
}
