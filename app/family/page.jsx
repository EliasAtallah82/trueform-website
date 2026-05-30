'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function FamilyMembers() {
  const [user, setUser] = useState(null)
  const [familyMembers, setFamilyMembers] = useState([])
  const [showAddMember, setShowAddMember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newMember, setNewMember] = useState({
    name: '', relationship: '', gender: '', date_of_birth: ''
  })
  const [dobDay, setDobDay] = useState('')
  const [dobMonth, setDobMonth] = useState('')
  const [dobYear, setDobYear] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        const { data: members } = await supabase
          .from('family_members').select('*').eq('owner_id', data.user.id)
        setFamilyMembers(members || [])
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (dobDay && dobMonth && dobYear) {
      setNewMember(prev => ({ ...prev, date_of_birth: `${dobYear}-${dobMonth}-${dobDay}` }))
    } else {
      setNewMember(prev => ({ ...prev, date_of_birth: '' }))
    }
  }, [dobDay, dobMonth, dobYear])

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

  const addFamilyMember = async () => {
    if (!newMember.name || !newMember.relationship || !newMember.gender) {
      alert('Please fill in name, relationship and gender!')
      return
    }
    setLoading(true)
    const { data } = await supabase.from('family_members').insert({
      owner_id: user.id, ...newMember
    }).select()
    if (data) {
      setFamilyMembers([...familyMembers, data[0]])
      setShowAddMember(false)
      setNewMember({ name: '', relationship: '', gender: '', date_of_birth: '' })
      setDobDay('')
      setDobMonth('')
      setDobYear('')
    }
    setLoading(false)
  }

  const removeFamilyMember = async (id) => {
    if (!confirm('Remove this family member?')) return
    await supabase.from('family_members').delete().eq('id', id)
    setFamilyMembers(familyMembers.filter(m => m.id !== id))
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const inputStyle = {
    width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px',
    boxSizing: 'border-box', border: '1px solid #ddd'
  }

  const selectStyle = {
    width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px',
    backgroundColor: 'white', border: '1px solid #ddd'
  }

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
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>👨‍👩‍👧 Family Members</h2>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>
          Add family members to order on their behalf
        </p>

        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px' }}>

          {/* Members List */}
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
                        {member.gender ? ` • ${member.gender}` : ''}
                        {member.date_of_birth ? ` • Age ${getAge(member.date_of_birth)}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a href={`/measurements?member=${member.id}`} style={{
                      padding: '8px 12px', backgroundColor: '#f5f0eb', color: '#1a1a1a',
                      borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold'
                    }}>📏 Measurements</a>
                    <button onClick={() => removeFamilyMember(member.id)} style={{
                      padding: '8px 12px', backgroundColor: '#fee2e2', color: '#dc2626',
                      border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px'
                    }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Member Form */}
          {showAddMember && (
            <div style={{ backgroundColor: '#f5f0eb', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>Add Family Member</h3>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                  Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="e.g. Sarah" style={inputStyle} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                  Relationship <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select value={newMember.relationship}
                  onChange={(e) => setNewMember({ ...newMember, relationship: e.target.value })}
                  style={selectStyle}>
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

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                  Gender <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select value={newMember.gender}
                  onChange={(e) => setNewMember({ ...newMember, gender: e.target.value })}
                  style={selectStyle}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                  Date of Birth
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <select value={dobDay} onChange={(e) => setDobDay(e.target.value)} style={selectStyle}>
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <select value={dobMonth} onChange={(e) => setDobMonth(e.target.value)} style={selectStyle}>
                    <option value="">Month</option>
                    {[
                      ['01','Jan'],['02','Feb'],['03','Mar'],['04','Apr'],
                      ['05','May'],['06','Jun'],['07','Jul'],['08','Aug'],
                      ['09','Sep'],['10','Oct'],['11','Nov'],['12','Dec']
                    ].map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <select value={dobYear} onChange={(e) => setDobYear(e.target.value)} style={selectStyle}>
                    <option value="">Year</option>
                    {Array.from({ length: 100 }, (_, i) => String(new Date().getFullYear() - i)).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={addFamilyMember} disabled={loading} style={{
                  flex: 1, padding: '12px', backgroundColor: '#1a1a1a', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                }}>Add Member</button>
                <button onClick={() => {
                  setShowAddMember(false)
                  setDobDay(''); setDobMonth(''); setDobYear('')
                  setNewMember({ name: '', relationship: '', gender: '', date_of_birth: '' })
                }} style={{
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