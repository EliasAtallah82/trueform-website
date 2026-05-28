'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const UAE_DATA = {
  'Abu Dhabi': ['Abu Dhabi', 'Al Ain', 'Al Dhafra'],
  'Dubai': ['Dubai'],
  'Sharjah': ['Sharjah', 'Khor Fakkan', 'Kalba', 'Dibba Al Hisn'],
  'Ajman': ['Ajman'],
  'Umm Al Quwain': ['Umm Al Quwain'],
  'Ras Al Khaimah': ['Ras Al Khaimah', 'Al Jazirah Al Hamra'],
  'Fujairah': ['Fujairah', 'Dibba Al Fujairah']
}

export default function Profile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState({})
  const [familyMembers, setFamilyMembers] = useState([])
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMember, setNewMember] = useState({
    name: '', relationship: '', gender: '', date_of_birth: ''
  })
  const [profile, setProfile] = useState({
    full_name: '', phone: '', gender: '', date_of_birth: '',
    apt_number: '', floor: '', street: '', area: '', city: '', emirate: '',
    country: 'United Arab Emirates'
  })

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        setProfile(prev => ({ ...prev, full_name: data.user.user_metadata.full_name || '' }))
        const { data: members } = await supabase
          .from('family_members').select('*').eq('owner_id', data.user.id)
        setFamilyMembers(members || [])
      }
    }
    init()
  }, [])

  const validate = () => {
    const newErrors = {}
    if (!profile.full_name) newErrors.full_name = 'Required'
    if (!profile.phone) newErrors.phone = 'Required'
    if (!profile.gender) newErrors.gender = 'Required'
    if (!profile.date_of_birth) newErrors.date_of_birth = 'Required'
    if (!profile.apt_number) newErrors.apt_number = 'Required'
    if (!profile.area) newErrors.area = 'Required'
    if (!profile.city) newErrors.city = 'Required'
    if (!profile.emirate) newErrors.emirate = 'Required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setLoading(true)
    await supabase.from('profiles').upsert({
      id: user.id, ...profile, email: user.email
    })
    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const addFamilyMember = async () => {
    if (!newMember.name || !newMember.relationship || !newMember.gender) return
    const { data } = await supabase.from('family_members').insert({
      owner_id: user.id, ...newMember
    }).select()
    if (data) {
      setFamilyMembers([...familyMembers, data[0]])
      setShowAddMember(false)
      setNewMember({ name: '', relationship: '', gender: '', date_of_birth: '' })
    }
  }

  const removeFamilyMember = async (id) => {
    await supabase.from('family_members').delete().eq('id', id)
    setFamilyMembers(familyMembers.filter(m => m.id !== id))
  }

  const getAge = (dob) => {
    if (!dob) return null
    const today = new Date()
    const birth = new Date(dob)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  const getMemberIcon = (relationship) => {
    const icons = {
      'wife': '👩', 'husband': '👨', 'son': '👦',
      'daughter': '👧', 'father': '👴', 'mother': '👵',
      'brother': '👦', 'sister': '👧'
    }
    return icons[relationship?.toLowerCase()] || '👤'
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const selectStyle = (hasError) => ({
    width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px',
    backgroundColor: 'white', cursor: 'pointer',
    border: hasError ? '1px solid #dc2626' : '1px solid #ddd'
  })

  const inputStyle = (hasError) => ({
    width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px',
    boxSizing: 'border-box',
    border: hasError ? '1px solid #dc2626' : '1px solid #ddd'
  })

  const labelStyle = { display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }
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

        {/* My Profile */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>👤 My Profile</h2>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>Your personal details</p>

          {/* Email — read only */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              Email Address
            </label>
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
            <input type="date" value={profile.date_of_birth}
              onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
              style={{ ...inputStyle(errors.date_of_birth), padding: '12px', fontSize: '15px' }}
            />
            {errors.date_of_birth && <p style={errorStyle}>Date of birth is required</p>}
          </div>

          {/* Gender */}
          <div style={{ marginBottom: '24px' }}>
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

          {/* Delivery Address */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '12px', fontSize: '14px' }}>
              Delivery Address
            </label>

            {/* Flat No + Floor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Flat No. {requiredStar}</label>
                <input type="number" value={profile.apt_number || ''}
                  onChange={(e) => setProfile({ ...profile, apt_number: e.target.value })}
                  placeholder="e.g. 204"
                  style={inputStyle(errors.apt_number)}
                />
                {errors.apt_number && <p style={errorStyle}>Required</p>}
              </div>
              <div>
                <label style={labelStyle}>Floor</label>
                <input type="number" value={profile.floor || ''}
                  onChange={(e) => setProfile({ ...profile, floor: e.target.value })}
                  placeholder="e.g. 3"
                  style={inputStyle(false)}
                />
              </div>
            </div>

            {/* Street */}
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Street Name</label>
              <input type="text" value={profile.street || ''}
                onChange={(e) => setProfile({ ...profile, street: e.target.value })}
                placeholder="e.g. Sheikh Zayed Road"
                style={inputStyle(false)}
              />
            </div>

            {/* Area */}
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Area / Neighborhood {requiredStar}</label>
              <input type="text" value={profile.area || ''}
                onChange={(e) => setProfile({ ...profile, area: e.target.value })}
                placeholder="e.g. Jumeirah, Marina, Downtown"
                style={inputStyle(errors.area)}
              />
              {errors.area && <p style={errorStyle}>Required</p>}
            </div>

            {/* City */}
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>City {requiredStar}</label>
              <select value={profile.city || ''}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                disabled={!profile.emirate}
                style={{ ...selectStyle(errors.city), opacity: !profile.emirate ? 0.5 : 1 }}>
                <option value="">Select City</option>
                {profile.emirate && UAE_DATA[profile.emirate]?.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.city && <p style={errorStyle}>Required</p>}
            </div>

            {/* Emirate */}
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Emirate {requiredStar}</label>
              <select value={profile.emirate || ''}
                onChange={(e) => setProfile({ ...profile, emirate: e.target.value, city: '' })}
                style={selectStyle(errors.emirate)}>
                <option value="">Select Emirate</option>
                {Object.keys(UAE_DATA).map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              {errors.emirate && <p style={errorStyle}>Required</p>}
            </div>

            {/* Country */}
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Country</label>
              <select value="United Arab Emirates" style={selectStyle(false)}>
                <option value="United Arab Emirates">United Arab Emirates</option>
              </select>
            </div>
          </div>

          {/* Measurements */}
          <div style={{
            backgroundColor: '#f5f0eb', borderRadius: '12px', padding: '20px',
            marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>📏 My Measurements</div>
              <div style={{ fontSize: '13px', color: '#888' }}>Required to place orders</div>
            </div>
            <a href="/measurements" style={{
              backgroundColor: '#1a1a1a', color: 'white', padding: '10px 20px',
              borderRadius: '8px', textDecoration: 'none', fontSize: '14px'
            }}>Scan Now →</a>
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

        {/* Family Members */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>👨‍👩‍👧 Family Members</h2>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>
            Add family members to order on their behalf
          </p>

          {familyMembers.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              {familyMembers.map((member) => (
                <div key={member.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px', borderRadius: '12px', border: '1px solid #e0e0e0', marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '28px' }}>{getMemberIcon(member.relationship)}</span>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{member.name}</div>
                      <div style={{ fontSize: '13px', color: '#888' }}>
                        {member.relationship}
                        {member.date_of_birth ? ` • Age ${getAge(member.date_of_birth)}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a href={`/measurements?member=${member.id}`} style={{
                      padding: '8px 12px', backgroundColor: '#f5f0eb', color: '#1a1a1a',
                      borderRadius: '8px', textDecoration: 'none', fontSize: '13px'
                    }}>📏 Measure</a>
                    <button onClick={() => removeFamilyMember(member.id)} style={{
                      padding: '8px 12px', backgroundColor: '#fee2e2', color: '#dc2626',
                      border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px'
                    }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAddMember && (
            <div style={{ backgroundColor: '#f5f0eb', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>Add Family Member</h3>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                  Name {requiredStar}
                </label>
                <input value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="e.g. Sarah"
                  style={inputStyle(false)}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                  Relationship {requiredStar}
                </label>
                <select value={newMember.relationship}
                  onChange={(e) => setNewMember({ ...newMember, relationship: e.target.value })}
                  style={selectStyle(false)}>
                  <option value="">Select relationship</option>
                  <option value="wife">Wife</option>
                  <option value="husband">Husband</option>
                  <option value="son">Son</option>
                  <option value="daughter">Daughter</option>
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="brother">Brother</option>
                  <option value="sister">Sister</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                    Gender {requiredStar}
                  </label>
                  <select value={newMember.gender}
                    onChange={(e) => setNewMember({ ...newMember, gender: e.target.value })}
                    style={selectStyle(false)}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                    Date of Birth
                  </label>
                  <input type="date" value={newMember.date_of_birth}
                    onChange={(e) => setNewMember({ ...newMember, date_of_birth: e.target.value })}
                    style={inputStyle(false)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={addFamilyMember} style={{
                  flex: 1, padding: '12px', backgroundColor: '#1a1a1a', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                }}>Add Member</button>
                <button onClick={() => setShowAddMember(false)} style={{
                  flex: 1, padding: '12px', backgroundColor: 'transparent', color: '#888',
                  border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer'
                }}>Cancel</button>
              </div>
            </div>
          )}

          {!showAddMember && (
            <button onClick={() => setShowAddMember(true)} style={{
              width: '100%', padding: '14px', backgroundColor: 'transparent',
              color: '#1a1a1a', border: '2px dashed #1a1a1a', borderRadius: '12px',
              fontSize: '16px', cursor: 'pointer'
            }}>➕ Add Family Member</button>
          )}
        </div>
      </div>
    </main>
  )
}