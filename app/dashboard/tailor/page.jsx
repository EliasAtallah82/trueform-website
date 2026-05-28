'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function TailorDashboard() {
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
          ✂️ TrueForm — Tailor
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#ccc', fontSize: '14px' }}>
            ✂️ {user.user_metadata.full_name}
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
          Welcome, {user.user_metadata.full_name}! ✂️
        </h2>
        <p style={{ color: '#555', marginBottom: '20px' }}>
          Manage your orders, inventory and profile
        </p>

        {/* Privacy Notice */}
        <div style={{
          backgroundColor: '#fff8e1',
          border: '1px solid #ffe082',
          borderRadius: '10px',
          padding: '14px 20px',
          marginBottom: '40px',
          fontSize: '14px',
          color: '#7a6000'
        }}>
          🔒 <strong>TrueForm Privacy Policy:</strong> You will only see order details. Customer personal information is managed exclusively by TrueForm.
        </div>

        {/* Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          {[
            { label: 'New Orders', value: '0', icon: '🆕' },
            { label: 'In Progress', value: '0', icon: '⏳' },
            { label: 'Completed', value: '0', icon: '✅' },
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
            { icon: '👔', title: 'My Catalog', desc: 'Add and manage your items', href: '/dashboard/tailor/catalog' },
            { icon: '📋', title: 'My Orders', desc: 'View and manage incoming orders', href: '#' },
            { icon: '👤', title: 'My Profile', desc: 'Update your skills, styles and photos', href: '#' },
            { icon: '🧵', title: 'My Inventory', desc: 'Manage your fabrics and colors', href: '#' },
            { icon: '📅', title: 'My Calendar', desc: 'Set your availability', href: '#' },
            { icon: '💰', title: 'My Earnings', desc: 'Track your payments and history', href: '#' },
            { icon: '⭐', title: 'My Reviews', desc: 'See customer feedback', href: '#' },
            { icon: '🎧', title: 'TrueForm Support', desc: 'Contact TrueForm for help', href: '#' },
          ].map((card) => (
            <a key={card.title} href={card.href} style={{ textDecoration: 'none' }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '30px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                height: '100%'
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