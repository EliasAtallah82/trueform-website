'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function DesignerDashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [designerProfile, setDesignerProfile] = useState(null)
  const [stats, setStats] = useState({
    totalDesigns: 0, liveDesigns: 0, pendingDesigns: 0, totalOrders: 0
  })

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)

        const { data: profileData } = await supabase
          .from('profiles').select('*').eq('id', data.user.id).single()
        setProfile(profileData)

        const { data: designerData } = await supabase
          .from('designer_profiles').select('*').eq('user_id', data.user.id).single()
        setDesignerProfile(designerData)

        if (designerData) {
          const { data: designs } = await supabase
            .from('designs').select('id, status').eq('designer_id', designerData.id)

          setStats({
            totalDesigns: designs?.length || 0,
            liveDesigns: designs?.filter(d => d.status === 'live').length || 0,
            pendingDesigns: designs?.filter(d => d.status === 'pending_review').length || 0,
            totalOrders: 0
          })
        }
      }
    }
    init()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const name = designerProfile?.display_name || profile?.full_name || user.email

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f0eb' }}>
      <nav style={{
        backgroundColor: '#1a1a1a', padding: '16px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm — Designer</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#ccc', fontSize: '14px' }}>🎨 {name}</span>
          <button onClick={handleLogout} style={{
            backgroundColor: 'transparent', color: 'white',
            border: '1px solid white', padding: '8px 16px',
            borderRadius: '6px', cursor: 'pointer'
          }}>Log out</button>
        </div>
      </nav>

      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
          Welcome, {name}! 🎨
        </h2>
        <p style={{ color: '#555', marginBottom: '32px' }}>
          Manage your designs, orders and storefront
        </p>

        {/* Royalty Info Banner */}
        {designerProfile && (
          <div style={{
            backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '20px',
            marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                💰 Your Royalty Rate: {designerProfile.royalty_percent}%
              </div>
              <div style={{ color: '#aaa', fontSize: '13px' }}>
                You earn {designerProfile.royalty_percent}% of net price on every sale · Storefront: /designers/{designerProfile.storefront_slug}
              </div>
            </div>
            <a href={`/designers/${designerProfile.storefront_slug}`} style={{
              padding: '10px 20px', backgroundColor: 'white', color: '#1a1a1a',
              borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px'
            }}>View Storefront →</a>
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '20px', marginBottom: '40px'
        }}>
          {[
            { label: 'Total Designs', value: stats.totalDesigns, icon: '🎨' },
            { label: 'Live Designs', value: stats.liveDesigns, icon: '🟢' },
            { label: 'Pending Review', value: stats.pendingDesigns, icon: '⏳' },
            { label: 'Total Orders', value: stats.totalOrders, icon: '📋' },
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

        {/* Action Cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          {[
            {
              icon: '🎨',
              title: 'My Designs',
              desc: 'Create and manage your designs',
              href: '/dashboard/designer/designs',
              primary: true
            },
            {
              icon: '📋',
              title: 'My Orders',
              desc: 'View orders for your designs',
              href: '/dashboard/designer/orders'
            },
            {
              icon: '💬',
              title: 'Custom Requests',
              desc: 'Respond to customer custom requests',
              href: '/dashboard/designer/requests'
            },
            {
              icon: '💰',
              title: 'My Earnings',
              desc: 'Track your royalties and payments',
              href: '/dashboard/designer/earnings'
            },
            {
              icon: '👤',
              title: 'My Profile',
              desc: 'Update your storefront and bio',
              href: '/dashboard/designer/profile'
            },
          ].map((card) => (
            <a key={card.title} href={card.href} style={{ textDecoration: 'none' }}>
              <div style={{
                backgroundColor: card.primary ? '#1a1a1a' : 'white',
                borderRadius: '12px', padding: '30px', textAlign: 'center',
                cursor: 'pointer', border: card.primary ? 'none' : '1px solid #e0e0e0'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>{card.icon}</div>
                <h3 style={{ fontWeight: 'bold', marginBottom: '8px', color: card.primary ? 'white' : '#1a1a1a' }}>
                  {card.title}
                </h3>
                <p style={{ color: card.primary ? '#aaa' : '#555', fontSize: '14px' }}>{card.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}