import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [stats, setStats] = useState({ invoices: 0, items: 0, active: 0, expiring: 0 })
  const [error,setError]=useState('')
  useEffect(() => { void load() }, [])
  async function load() {
    const {data,error}=await supabase.rpc('dashboard_stats')
    if(error){setError(error.message);return}
    const row=Array.isArray(data)?data[0]:data
    if(row)setStats({invoices:Number(row.invoices)||0,items:Number(row.items)||0,active:Number(row.active)||0,expiring:Number(row.expiring)||0})
  }
  return <>
    <div className="page-head"><div><h1>Tổng quan</h1><p>Warranty Management Core V0.1.1</p></div></div>
    {error&&<div className="alert danger-bg">{error}</div>}
    <section className="stats">
      <div className="stat"><span>Hóa đơn</span><strong>{stats.invoices}</strong></div>
      <div className="stat"><span>Sản phẩm bảo hành</span><strong>{stats.items}</strong></div>
      <div className="stat"><span>Còn bảo hành</span><strong>{stats.active}</strong></div>
      <div className="stat"><span>Sắp hết ≤30 ngày</span><strong>{stats.expiring}</strong></div>
    </section>
    <div className="card"><h2>Quy trình nhanh</h2><p>1. Tạo hồ sơ → 2. Chụp hóa đơn → 3. Tra cứu → 4. Mở chi tiết để sửa → 5. Mọi thay đổi quan trọng được ghi nhật ký.</p></div>
  </>
}
