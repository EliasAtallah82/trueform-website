'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function CustomerDashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [orderCount, setOrderCount] = useState(0)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        const { data: profileData } = await supabase
          .from('profiles').select('*').eq('id', data.user.id).single()
        setProfile(profileData)
        const { count } = await supabase
          .from('orders').select('*', { count: 'exact', head: true })
          .eq('customer_id', data.user.id)
          .neq('status', 'completed')
        setOrderCount(count || 0)
      }
    }
    init()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const name = profile?.full_name || user.email

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f0eb' }}>
      <nav style={{
        backgroundColor: '#1a1a1a', padding: '16px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#ccc', fontSize: '14px' }}>👤 {name}</span>
          <button onClick={handleLogout} style={{
            backgroundColor: 'transparent', color: 'white',
            border: '1px solid white', padding: '8px 16px',
            borderRadius: '6px', cursor: 'pointer'
          }}>Log out</button>
        </div>
      </nav>

      <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
          Welcome, {name}! 👋
        </h2>
        <p style={{ color: '#555', marginBottom: '40px' }}>
          What would you like to do today?
        </p>

        {/* Orders Banner */}
        {orderCount > 0 && (
          <div style={{
            backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '20px',
            marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                📦 {orderCount} order(s) in progress
              </div>
              <div style={{ color: '#aaa', fontSize: '13px' }}>Track your active orders</div>
            </div>
            <a href="/orders" style={{
              padding: '10px 20px', backgroundColor: 'white', color: '#1a1a1a',
              borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px'
            }}>View Orders →</a>
          </div>
        )}

        {/* Main Cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          {[
            {
              icon: '👔',
              title: 'Browse Catalog',
              desc: 'Explore our full range of custom garments',
              href: '/catalog',
              primary: true
            },
            {
              icon: '📋',
              title: 'My Orders',
              desc: 'Track in progress and completed orders',
              href: '/orders',
              badge: orderCount > 0 ? orderCount : null
            },
            {
              icon: '👤',
              title: 'Personal Details',
              desc: 'Your profile and measurements',
              href: '/profile'
            },
            {
              icon: '👨‍👩‍👧',
              title: 'Family Members',
              desc: 'Manage family members and their measurements',
              href: '/family'
            },
            {
              icon: '📍',
              title: 'Delivery Addresses',
              desc: 'Manage your saved addresses',
              href: '/addresses'
            },
          ].map((card) => (
            <a key={card.title} href={card.href} style={{ textDecoration: 'none' }}>
              <div style={{
                backgroundColor: card.primary ? '#1a1a1a' : 'white',
                borderRadius: '12px', padding: '30px', textAlign: 'center',
                cursor: 'pointer', position: 'relative',
                border: card.primary ? 'none' : '1px solid #e0e0e0'
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