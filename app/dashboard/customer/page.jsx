'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function CustomerDashboard() {
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
          ✂️ TrueForm
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#ccc', fontSize: '14px' }}>
            👤 {user.user_metadata.full_name}
          </span>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: 'transparent',
              color: 'white',
              border: '1px solid white',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Log out
          </button>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div style={{ padding: '40px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          Welcome back, {user.user_metadata.full_name}! 👋
        </h2>
        <p style={{ color: '#555', marginBottom: '40px' }}>
          What would you like to do today?
        </p>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📏</div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>My Measurements</h3>
            <p style={{ color: '#555', fontSize: '14px' }}>Scan or update your body measurements</p>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✨</div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Style Advisor</h3>
            <p style={{ color: '#555', fontSize: '14px' }}>Get AI outfit recommendations</p>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👔</div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Place Order</h3>
            <p style={{ color: '#555', fontSize: '14px' }}>Order your custom outfit</p>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚚</div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Track Order</h3>
            <p style={{ color: '#555', fontSize: '14px' }}>See your order status live</p>
          </div>
        </div>
      </div>
    </main>
  )
}