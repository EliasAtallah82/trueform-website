'use client'
import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setMessage(error.message)
    } else {
      const role = data.user.user_metadata.role
      if (role === 'tailor') window.location.href = '/dashboard/tailor'
      else if (role === 'courier') window.location.href = '/dashboard/courier'
      else if (role === 'admin') window.location.href = '/dashboard/admin'
      else window.location.href = '/dashboard/customer'
    }
    setLoading(false)
  }

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#f5f0eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          ✂️ Welcome Back
        </h1>
        <p style={{ color: '#555', marginBottom: '24px' }}>
          Log in to your TrueForm account
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {message && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              backgroundColor: '#fee',
              color: '#c00'
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#1a1a1a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#555' }}>
          Don't have an account?{' '}
          <a href="/auth/signup" style={{ color: '#1a1a1a', fontWeight: 'bold' }}>
            Sign up
          </a>
        </p>
      </div>
    </main>
  )
}