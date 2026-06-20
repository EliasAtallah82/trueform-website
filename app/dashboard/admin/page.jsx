'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function AdminDashboard() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    totalUsers: 0, activeOrders: 0, totalTailors: 0, revenue: 0,
    pendingApprovals: 0
  })

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        const { count: pendingCount } = await supabase
          .from('catalog')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        setStats(prev => ({ ...prev, pendingApprovals: pendingCount || 0 }))
      }
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f0eb' }}>
      <nav style={{
        backgroundColor: '#1a1a1a', padding: '16px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm — Admin</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#ccc', fontSize: '14px' }}>👑 {user.user_metadata.full_name}</span>
          <button onClick={handleLogout} style={{
            backgroundColor: 'transparent', color: 'white',
            border: '1px solid white', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer'
          }}>Log out</button>
        </div>
      </nav>

      <div style={{ padding: '40px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          Admin Dashboard 👑
        </h2>
        <p style={{ color: '#555', marginBottom: '40px' }}>Full platform overview and controls</p>

        {/* Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '20px', marginBottom: '40px'
        }}>
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: '👥' },
            { label: 'Active Orders', value: stats.activeOrders, icon: '📋' },
            { label: 'Total Tailors', value: stats.totalTailors, icon: '✂️' },
            { label: 'Revenue', value: `AED ${stats.revenue}`, icon: '💰' },
            { label: 'Pending Approvals', value: stats.pendingApprovals, icon: '⏳',
              highlight: stats.pendingApprovals > 0 }
          ].map((stat) => (
            <div key={stat.label} style={{
              backgroundColor: stat.highlight ? '#fef3c7' : 'white',
              borderRadius: '12px', padding: '24px', textAlign: 'center',
              border: stat.highlight ? '2px solid #f59e0b' : 'none'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{stat.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
                {stat.value}
              </div>
              <div style={{ color: '#555', fontSize: '14px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Action Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          {[
            { icon: '👥', title: 'User Management', desc: 'Manage all customers, tailors and couriers', href: '#' },
            { icon: '📋', title: 'All Orders', desc: 'Monitor and manage every order', href: '#' },
            { icon: '⏳', title: 'Catalog Approvals', desc: `${stats.pendingApprovals} items waiting for review`, href: '/dashboard/admin/approvals', highlight: stats.pendingApprovals > 0 },
            { icon: '👔', title: 'Catalog Management', desc: 'View and manage all catalog items', href: '/dashboard/admin/catalog' },
{ icon: '🎨', title: 'Designers', desc: 'Manage and onboard designers', href: '/dashboard/admin/designers' },
{ icon: '👗', title: 'Design Reviews', desc: 'Review and approve designer submissions', href: '/dashboard/admin/designs', highlight: true },
            { icon: '💰', title: 'Finances', desc: 'Revenue, payouts and transactions', href: '#' },
            { icon: '🤖', title: 'AI Advisor', desc: 'Monitor and train the style advisor', href: '#' },
            { icon: '⚠️', title: 'Disputes', desc: 'Handle customer complaints', href: '#' },
            { icon: '📊', title: 'Analytics', desc: 'Platform growth and insights', href: '#' },
            { icon: '⚙️', title: 'Settings', desc: 'Platform configuration', href: '#' }
          ].map((card) => (
            <a key={card.title} href={card.href} style={{ textDecoration: 'none' }}>
              <div style={{
                backgroundColor: card.highlight ? '#fef3c7' : 'white',
                borderRadius: '12px', padding: '30px', textAlign: 'center',
                cursor: 'pointer', height: '100%',
                border: card.highlight ? '2px solid #f59e0b' : 'none'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>{card.icon}</div>
                <h3 style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1a1a1a' }}>{card.title}</h3>
                <p style={{ color: '#555', fontSize: '14px' }}>{card.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}