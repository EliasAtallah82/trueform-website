'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

const SKILLS = [
  'Suits & Blazers', 'Shirts & Tops', 'Trousers & Pants',
  'Thobes & Kanduras', 'Abayas & Modest Wear', 'Dresses & Skirts',
  'Full Outfits', 'Alterations', 'Embroidery', 'Monogramming',
  'Lining Work', 'Pattern Making', 'Bespoke Tailoring',
  'Kids Clothing', 'Wedding Wear', 'Traditional Wear'
]

const FABRICS = [
  'Linen', 'Cotton', 'Wool', 'Silk', 'Polyester',
  'Chiffon', 'Velvet', 'Denim', 'Satin', 'Cashmere',
  'Tweed', 'Jersey', 'Crepe', 'Organza'
]

export default function TailorProfile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState({
    bio: '',
    location: '',
    price_min: '',
    price_max: '',
    turnaround_days: '',
    max_capacity: '',
    speciality: '',
    skills: [],
    fabrics: []
  })

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        const { data: existingProfile } = await supabase
          .from('tailor_profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single()
        if (existingProfile) {
          setProfile({
            ...existingProfile,
            skills: existingProfile.skills ? existingProfile.skills.split(',') : [],
            fabrics: existingProfile.fabrics ? existingProfile.fabrics.split(',') : []
          })
        }
      }
    }
    init()
  }, [])

  const toggleSkill = (skill) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }))
  }

  const toggleFabric = (fabric) => {
    setProfile(prev => ({
      ...prev,
      fabrics: prev.fabrics.includes(fabric)
        ? prev.fabrics.filter(f => f !== fabric)
        : [...prev.fabrics, fabric]
    }))
  }

  const handleSave = async () => {
    if (!profile.skills.length) {
      alert('Please select at least one skill!')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('tailor_profiles').upsert({
      user_id: user.id,
      ...profile,
      skills: profile.skills.join(','),
      fabrics: profile.fabrics.join(','),
      price_min: parseInt(profile.price_min) || 0,
      price_max: parseInt(profile.price_max) || 0,
      turnaround_days: parseInt(profile.turnaround_days) || 7,
      max_capacity: parseInt(profile.max_capacity) || 5
    })
    if (error) { alert('Error: ' + error.message); setLoading(false); return }
    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const inputStyle = {
    width: '100%', padding: '10px', borderRadius: '8px',
    border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box'
  }

  const completionScore = () => {
    let score = 0
    if (profile.bio) score += 20
    if (profile.skills.length > 0) score += 30
    if (profile.fabrics.length > 0) score += 20
    if (profile.price_min && profile.price_max) score += 15
    if (profile.turnaround_days) score += 15
    return score
  }

  const score = completionScore()

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f0eb' }}>
      <nav style={{
        backgroundColor: '#1a1a1a', padding: '16px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm — Tailor</h1>
        <a href="/dashboard/tailor" style={{ color: 'white', fontSize: '14px' }}>← Back to Dashboard</a>
      </nav>

      <div style={{ padding: '40px', maxWidth: '700px', margin: '0 auto' }}>

        {/* Profile Completion */}
        <div style={{
          backgroundColor: score === 100 ? '#dcfce7' : 'white',
          borderRadius: '16px', padding: '24px', marginBottom: '24px',
          border: score === 100 ? '1px solid #16a34a' : '1px solid #e0e0e0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
              Profile Completion — {score}%
            </span>
            <span style={{ fontSize: '14px', color: score === 100 ? '#16a34a' : '#888' }}>
              {score === 100 ? '✅ Complete!' : 'Complete to get more orders!'}
            </span>
          </div>
          <div style={{ height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px' }}>
            <div style={{
              height: '8px', borderRadius: '4px', transition: 'width 0.4s ease',
              width: `${score}%`,
              backgroundColor: score === 100 ? '#16a34a' : score >= 60 ? '#f59e0b' : '#dc2626'
            }}/>
          </div>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
            💡 Tailors with complete profiles get 3x more orders!
          </p>
        </div>

        {/* Profile Form */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>✂️ My Tailor Profile</h2>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>
            Your profile helps us match you with the right orders
          </p>

          {/* Bio */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              About Me
            </label>
            <textarea value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell customers about your experience, speciality and style..."
              rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {/* Location */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              Location
            </label>
            <input value={profile.location}
              onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g. Dubai, Sharjah" style={inputStyle} />
          </div>

          {/* Price Range */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              Price Range (AED per item)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>Minimum</label>
                <input type="number" value={profile.price_min}
                  onChange={(e) => setProfile(prev => ({ ...prev, price_min: e.target.value }))}
                  placeholder="e.g. 100" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>Maximum</label>
                <input type="number" value={profile.price_max}
                  onChange={(e) => setProfile(prev => ({ ...prev, price_max: e.target.value }))}
                  placeholder="e.g. 1000" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Turnaround + Capacity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
                Turnaround Time (days)
              </label>
              <input type="number" value={profile.turnaround_days}
                onChange={(e) => setProfile(prev => ({ ...prev, turnaround_days: e.target.value }))}
                placeholder="e.g. 7" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
                Max Orders at Once
              </label>
              <input type="number" value={profile.max_capacity}
                onChange={(e) => setProfile(prev => ({ ...prev, max_capacity: e.target.value }))}
                placeholder="e.g. 5" style={inputStyle} />
            </div>
          </div>

          {/* Skills */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              My Skills <span style={{ color: '#dc2626' }}>*</span>
              <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal', marginLeft: '8px' }}>
                Select all that apply — more skills = more orders!
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
              {SKILLS.map((skill) => (
                <button key={skill} onClick={() => toggleSkill(skill)} style={{
                  padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                  textAlign: 'left', fontSize: '13px', transition: 'all 0.2s',
                  border: profile.skills.includes(skill) ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                  backgroundColor: profile.skills.includes(skill) ? '#1a1a1a' : 'white',
                  color: profile.skills.includes(skill) ? 'white' : '#555'
                }}>
                  {profile.skills.includes(skill) ? '✅ ' : ''}{skill}
                </button>
              ))}
            </div>
          </div>

          {/* Fabrics */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              Fabrics I Work With
              <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal', marginLeft: '8px' }}>
                Select all fabrics you can work with
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
              {FABRICS.map((fabric) => (
                <button key={fabric} onClick={() => toggleFabric(fabric)} style={{
                  padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                  textAlign: 'center', fontSize: '13px', transition: 'all 0.2s',
                  border: profile.fabrics.includes(fabric) ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                  backgroundColor: profile.fabrics.includes(fabric) ? '#1a1a1a' : 'white',
                  color: profile.fabrics.includes(fabric) ? 'white' : '#555'
                }}>
                  {profile.fabrics.includes(fabric) ? '✅ ' : ''}{fabric}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={loading} style={{
            width: '100%', padding: '14px',
            backgroundColor: saved ? '#22c55e' : '#1a1a1a',
            color: 'white', border: 'none', borderRadius: '12px',
            fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
          }}>
            {saved ? '✅ Profile Saved!' : loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </main>
  )
}