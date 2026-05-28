'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function CourierDashboard() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else setUser(data.user)
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
      {/* Top Nav */}
      <nav style={{
        backgroundColor: '#1a1a1a',
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
          ✂️ TrueForm — Courier
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#ccc', fontSize: '14px' }}>
            🚚 {user.user_metadata.full_name}
          </span>
          <button onClick={handleLogout} style={{
            backgroundColor: 'transparent',
            color: 'white',
            border: '1px solid white',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            Log out
          </button>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div style={{ padding: '40px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          Welcome, {user.user_metadata.full_name}! 🚚
        </h2>
        <p style={{ color: '#555', marginBottom: '40px' }}>
          Manage your pickups and deliveries
        </p>

        {/* Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          {[
            { label: 'Pending Pickups', value: '0', icon: '📦' },
            { label: 'Out for Delivery', value: '0', icon: '🚚' },
            { label: 'Delivered Today', value: '0', icon: '✅' },
            { label: 'This Month', value: 'AED 0', icon: '💰' }
          ].map((stat) => (
            <div key={stat.label} style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center'
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
            { icon: '📦', title: 'Pickups', desc: 'Orders ready to collect from tailors' },
            { icon: '🚚', title: 'Deliveries', desc: 'Orders to deliver to customers' },
            { icon: '🗺️', title: 'My Route', desc: 'Optimized delivery route for today' },
            { icon: '💰', title: 'My Earnings', desc: 'Track your payments and history' }
          ].map((card) => (
            <div key={card.title} style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px',
              textAlign: 'center',
              cursor: 'pointer'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>{card.icon}</div>
              <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>{card.title}</h3>
              <p style={{ color: '#555', fontSize: '14px' }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}