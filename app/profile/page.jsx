'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const ALL_COUNTRIES = [
  'UAE', 'Saudi Arabia', 'Kuwait', 'Qatar', 'Bahrain', 'Oman',
  'Egypt', 'Jordan', 'Lebanon', 'Syria', 'Iraq', 'Palestine',
  'Libya', 'Tunisia', 'Algeria', 'Morocco', 'Yemen', 'Sudan',
  'India', 'Pakistan', 'Bangladesh', 'Philippines', 'Indonesia',
  'UK', 'USA', 'Canada', 'Australia', 'France', 'Germany',
  'Italy', 'Spain', 'China', 'Japan', 'Korea', 'Turkey',
  'Iran', 'Afghanistan', 'Sri Lanka', 'Nepal', 'Ethiopia',
  'Nigeria', 'South Africa', 'Kenya', 'Other'
].sort()

export default function Profile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState({})
  const [dobDay, setDobDay] = useState('')
  const [dobMonth, setDobMonth] = useState('')
  const [dobYear, setDobYear] = useState('')
  const [profile, setProfile] = useState({
    full_name: '', phone: '', gender: '', date_of_birth: '', nationality: ''
  })

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        const { data: existingProfile } = await supabase
          .from('profiles').select('*').eq('id', data.user.id).single()
        if (existingProfile) {
          setProfile({
            full_name: existingProfile.full_name || '',
            phone: existingProfile.phone || '',
            gender: existingProfile.gender || '',
            date_of_birth: existingProfile.date_of_birth ? existingProfile.date_of_birth.slice(0, 10) : '',
            nationality: existingProfile.nationality || '',
          })
          if (existingProfile.date_of_birth) {
            const parts = existingProfile.date_of_birth.slice(0, 10).split('-')
            setDobYear(parts[0] || '')
            setDobMonth(parts[1] || '')
            setDobDay(parts[2] || '')
          }
        } else {
          setProfile(prev => ({ ...prev, full_name: data.user.user_metadata.full_name || '' }))
        }
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (dobDay && dobMonth && dobYear) {
      setProfile(prev => ({ ...prev, date_of_birth: `${dobYear}-${dobMonth}-${dobDay}` }))
    } else {
      setProfile(prev => ({ ...prev, date_of_birth: '' }))
    }
  }, [dobDay, dobMonth, dobYear])

  const validate = () => {
    const newErrors = {}
    if (!profile.full_name) newErrors.full_name = 'Required'
    if (!profile.phone) newErrors.phone = 'Required'
    if (!profile.gender) newErrors.gender = 'Required'
    if (!dobDay || !dobMonth || !dobYear) newErrors.date_of_birth = 'Required'
    if (!profile.nationality) newErrors.nationality = 'Required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setLoading(true)
    await supabase.from('profiles').upsert({
      id: user.id, ...profile, email: user.email, role: 'customer'
    })
    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const inputStyle = (hasError) => ({
    width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px',
    boxSizing: 'border-box', border: hasError ? '1px solid #dc2626' : '1px solid #ddd'
  })

  const selectStyle = (hasError) => ({
    width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px',
    backgroundColor: 'white', cursor: 'pointer',
    border: hasError ? '1px solid #dc2626' : '1px solid #ddd'
  })

  const errorStyle = { fontSize: '11px', color: '#dc2626', marginTop: '4px' }
  const requiredStar = <span style={{ color: '#dc2626' }}>*</span>

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f0eb' }}>
      <nav style={{
        backgroundColor: '#1a1a1a', padding: '16px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm</h1>
        <a href="/dashboard/customer" style={{ color: 'white', fontSize: '14px' }}>← Back to Dashboard</a>
      </nav>

      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>👤 Personal Details</h2>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>Your personal information and measurements</p>

        {/* Personal Details */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px' }}>Personal Information</h3>

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>Email Address</label>
            <div style={{
              width: '100%', padding: '12px', borderRadius: '8px', fontSize: '15px',
              border: '1px solid #e0e0e0', backgroundColor: '#f9f9f9',
              color: '#888', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              boxSizing: 'border-box'
            }}>
              <span>{user.email}</span>
              <span style={{ fontSize: '12px', color: '#aaa' }}>🔒 Login email</span>
            </div>
          </div>

          {/* Full Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              Full Name {requiredStar}
            </label>
            <input type="text" value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder="Your full name"
              style={{ ...inputStyle(errors.full_name), padding: '12px', fontSize: '15px' }}
            />
            {errors.full_name && <p style={errorStyle}>Full name is required</p>}
          </div>

          {/* Phone */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              Phone Number {requiredStar}
            </label>
            <input type="tel" value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+971 50 000 0000"
              style={{ ...inputStyle(errors.phone), padding: '12px', fontSize: '15px' }}
            />
            {errors.phone && <p style={errorStyle}>Phone number is required</p>}
          </div>

          {/* Date of Birth */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              Date of Birth {requiredStar}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <select value={dobDay} onChange={(e) => setDobDay(e.target.value)}
                style={selectStyle(errors.date_of_birth)}>
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select value={dobMonth} onChange={(e) => setDobMonth(e.target.value)}
                style={selectStyle(errors.date_of_birth)}>
                <option value="">Month</option>
                {[
                  ['01','January'],['02','February'],['03','March'],['04','April'],
                  ['05','May'],['06','June'],['07','July'],['08','August'],
                  ['09','September'],['10','October'],['11','November'],['12','December']
                ].map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <select value={dobYear} onChange={(e) => setDobYear(e.target.value)}
                style={selectStyle(errors.date_of_birth)}>
                <option value="">Year</option>
                {Array.from({ length: 100 }, (_, i) => String(new Date().getFullYear() - i)).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {errors.date_of_birth && <p style={errorStyle}>Date of birth is required</p>}
          </div>

          {/* Gender */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              Gender {requiredStar}
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {['Male', 'Female', 'Prefer not to say'].map((g) => (
                <button key={g} onClick={() => setProfile({ ...profile, gender: g })}
                  style={{
                    padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
                    border: profile.gender === g ? '2px solid #1a1a1a' : errors.gender ? '2px solid #dc2626' : '2px solid #e0e0e0',
                    backgroundColor: profile.gender === g ? '#f5f0eb' : 'white'
                  }}>{g}</button>
              ))}
            </div>
            {errors.gender && <p style={errorStyle}>Please select your gender</p>}
          </div>

          {/* Nationality */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              Nationality {requiredStar}
            </label>
            <select value={profile.nationality}
              onChange={(e) => setProfile({ ...profile, nationality: e.target.value })}
              style={{ ...selectStyle(errors.nationality), padding: '12px', fontSize: '15px' }}>
              <option value="">Select your nationality</option>
              {ALL_COUNTRIES.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
            {errors.nationality && <p style={errorStyle}>Nationality is required</p>}
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={loading} style={{
            width: '100%', padding: '14px',
            backgroundColor: saved ? '#22c55e' : '#1a1a1a',
            color: 'white', border: 'none', borderRadius: '12px',
            fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
          }}>
            {saved ? '✅ Saved!' : loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {/* Measurements */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>📏 My Measurements</h3>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
            Required to place orders. Scan once and we save them for all future orders.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: '#f5f0eb', borderRadius: '12px' }}>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>3D Body Scan</div>
              <div style={{ fontSize: '13px', color: '#888' }}>Takes less than 2 minutes</div>
            </div>
            <a href="/measurements" style={{
              backgroundColor: '#1a1a1a', color: 'white', padding: '10px 20px',
              borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold'
            }}>Scan Now →</a>
          </div>
        </div>
      </div>
    </main>
  )
}