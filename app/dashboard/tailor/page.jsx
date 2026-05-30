'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function TailorDashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({
    newOrders: 0, inProgress: 0, completed: 0, earnings: 0, pendingInvitations: 0
  })

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        setProfile(profileData)

        // Get pending invitations count
        const { data: invitations } = await supabase
          .from('tailor_catalog_items')
          .select('id')
          .eq('tailor_id', data.user.id)
          .eq('status', 'pending')
        
        setStats(prev => ({ ...prev, pendingInvitations: invitations?.length || 0 }))
      }
    }
    init()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const tailorName = profile?.full_name || user.email

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f0eb' }}>
      <nav style={{
        backgroundColor: '#1a1a1a', padding: '16px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm — Tailor</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#ccc', fontSize: '14px' }}>✂️ {tailorName}</span>
          <button onClick={handleLogout} style={{
            backgroundColor: 'transparent', color: 'white',
            border: '1px solid white', padding: '8px 16px',
            borderRadius: '6px', cursor: 'pointer'
          }}>Log out</button>
        </div>
      </nav>

      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
          Welcome, {tailorName}! ✂️
        </h2>
        <p style={{ color: '#555', marginBottom: '24px' }}>
          Manage your orders, catalog and earnings
        </p>

        {/* Privacy Notice */}
        <div style={{
          backgroundColor: '#fff8e1', border: '1px solid #ffe082',
          borderRadius: '10px', padding: '14px 20px', marginBottom: '32px',
          fontSize: '14px', color: '#7a6000'
        }}>
          🔒 <strong>TrueForm Privacy Policy:</strong> You will only see order details. Customer personal information is managed exclusively by TrueForm.
        </div>

        {/* Invitations Banner */}
        {stats.pendingInvitations > 0 && (
          <div style={{
            backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '20px',
            marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                📬 {stats.pendingInvitations} new item invitation(s) waiting!
              </div>
              <div style={{ color: '#aaa', fontSize: '13px' }}>
                Submit your price to be considered for these items
              </div>
            </div>
            <a href="/dashboard/tailor/invitations" style={{
              padding: '10px 20px', backgroundColor: 'white', color: '#1a1a1a',
              borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px'
            }}>View Invitations →</a>
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '20px', marginBottom: '40px'
        }}>
          {[
            { label: 'New Orders', value: stats.newOrders, icon: '🆕' },
            { label: 'In Progress', value: stats.inProgress, icon: '⏳' },
            { label: 'Completed', value: stats.completed, icon: '✅' },
            { label: 'This Month', value: `AED ${stats.earnings}`, icon: '💰' },
          ].map((stat) => (
            <div key={stat.label} style={{
              backgroundColor: 'white', borderRadius: '12px',
              padding: '24px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{stat.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>{stat.value}</div>
              <div style={{ color: '#555', fontSize: '14px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Action Cards — only built features */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          {[
            {
              icon: '📬', title: 'Invitations',
              desc: 'Submit prices for TrueForm items',
              href: '/dashboard/tailor/invitations',
              badge: stats.pendingInvitations > 0 ? stats.pendingInvitations : null
            },
            {
              icon: '📋', title: 'My Orders',
              desc: 'View and manage incoming orders',
              href: '#'
            },
            {
              icon: '👔', title: 'My Catalog',
              desc: 'Add and manage your own items',
              href: '/dashboard/tailor/catalog'
            },
            {
              icon: '👤', title: 'My Profile',
              desc: 'Update your skills and bio',
              href: '/dashboard/tailor/profile'
            },
            {
              icon: '💰', title: 'My Earnings',
              desc: 'Track your payments and history',
              href: '#'
            },
          ].map((card) => (
            <a key={card.title} href={card.href} style={{ textDecoration: 'none' }}>
              <div style={{
                backgroundColor: 'white', borderRadius: '12px',
                padding: '30px', textAlign: 'center', cursor: 'pointer',
                position: 'relative', border: card.badge ? '2px solid #1a1a1a' : '1px solid #e0e0e0'
              }}>
                {card.badge && (
                  <div style={{
                    position: 'absolute', top: '-8px', right: '-8px',
                    backgroundColor: '#dc2626', color: 'white',
                    borderRadius: '50%', width: '24px', height: '24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 'bold'
                  }}>{card.badge}</div>
                )}
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