'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

const SPECIALTIES = [
  'Wedding Dresses', 'Casual Womenswear', 'Formal Womenswear',
  "Men's Formal", "Men's Casual", 'Kanduras & Thobes',
  'Abayas & Modest Wear', "Children's Wear", 'Sportswear',
  'Traditional Wear', 'Bridal', 'Evening Wear'
]

export default function AdminDesigners() {
  const [user, setUser] = useState(null)
  const [designers, setDesigners] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  const [newDesigner, setNewDesigner] = useState({
    email: '',
    full_name: '',
    display_name: '',
    bio: '',
    specialties: [],
    royalty_percent: 20,
    is_tailor: false,
    storefront_slug: ''
  })

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        fetchDesigners()
      }
    }
    init()
  }, [])

  const fetchDesigners = async () => {
    const { data: designerData } = await supabase
      .from('designer_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!designerData) { setDesigners([]); setLoading(false); return }

    const userIds = designerData.map(d => d.user_id)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)

    const merged = designerData.map(d => ({
      ...d,
      profile: profileData?.find(p => p.id === d.user_id) || null
    }))

    setDesigners(merged)
    setLoading(false)
  }

  const handleOnboard = async () => {
    if (!newDesigner.email || !newDesigner.display_name) {
      alert('Please fill in email and display name!')
      return
    }
    setSaving(true)

    // Find profile using case-insensitive search
    const { data: profileList } = await supabase
      .from('profiles')
      .select('id, email, role')
      .ilike('email', newDesigner.email.trim())

    const existingProfile = profileList?.[0]

    if (!existingProfile) {
      alert('No account found with this email. Please ask the designer to sign up first!')
      setSaving(false)
      return
    }

    // Update profile role to designer
    await supabase.from('profiles').update({
      role: 'designer',
      full_name: newDesigner.full_name || existingProfile.full_name
    }).eq('id', existingProfile.id)

    // Generate slug from display name
    const slug = newDesigner.storefront_slug ||
      newDesigner.display_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // Create designer profile
    const { data, error } = await supabase.from('designer_profiles').insert({
      user_id: existingProfile.id,
      display_name: newDesigner.display_name,
      bio: newDesigner.bio,
      specialties: newDesigner.specialties,
      royalty_percent: parseFloat(newDesigner.royalty_percent),
      is_tailor: newDesigner.is_tailor,
      storefront_slug: slug,
      status: 'approved'
    }).select()

    if (error) { alert('Error: ' + error.message); setSaving(false); return }

    // If designer is also a tailor, create tailor profile
    if (newDesigner.is_tailor) {
      await supabase.from('tailor_profiles').upsert({
        user_id: existingProfile.id,
        is_approved: true,
        active_orders: 0,
        completed_orders: 0,
        rating: 5.0
      })
    }

    await fetchDesigners()
    setMode(null)
    setNewDesigner({
      email: '', full_name: '', display_name: '', bio: '',
      specialties: [], royalty_percent: 20, is_tailor: false, storefront_slug: ''
    })
    alert('✅ Designer onboarded successfully!')
    setSaving(false)
  }

  const toggleSpecialty = (specialty) => {
    setNewDesigner(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }))
  }

  const updateDesignerStatus = async (id, status) => {
    await supabase.from('designer_profiles').update({ status }).eq('id', id)
    setDesigners(designers.map(d => d.id === id ? { ...d, status } : d))
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const inputStyle = {
    width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px',
    boxSizing: 'border-box', border: '1px solid #ddd'
  }

  const allDesigners = designers
  const pendingDesigners = designers.filter(d => d.status === 'pending')
  const approvedDesigners = designers.filter(d => d.status === 'approved')
  const suspendedDesigners = designers.filter(d => d.status === 'suspended')

  const filteredDesigners = activeTab === 'all' ? allDesigners
    : activeTab === 'pending' ? pendingDesigners
    : activeTab === 'approved' ? approvedDesigners
    : suspendedDesigners

  const getStatusBadge = (status) => {
    const map = {
      pending: { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending' },
      approved: { bg: '#dcfce7', color: '#166534', label: '✅ Approved' },
      suspended: { bg: '#fee2e2', color: '#991b1b', label: '🚫 Suspended' },
    }
    const s = map[status] || map.pending
    return (
      <span style={{ backgroundColor: s.bg, color: s.color, fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 'bold' }}>
        {s.label}
      </span>
    )
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f0eb' }}>
      <nav style={{
        backgroundColor: '#1a1a1a', padding: '16px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm — Admin</h1>
        <a href="/dashboard/admin" style={{ color: 'white', fontSize: '14px' }}>← Back to Dashboard</a>
      </nav>

      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>🎨 Designer Management</h2>
            <p style={{ color: '#888', fontSize: '14px' }}>{designers.length} designers on platform</p>
          </div>
          {!mode && (
            <button onClick={() => setMode('onboard')} style={{
              padding: '12px 24px', backgroundColor: '#1a1a1a', color: 'white',
              border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
            }}>➕ Onboard Designer</button>
          )}
          {mode && (
            <button onClick={() => setMode(null)} style={{
              padding: '12px 20px', backgroundColor: '#fee2e2', color: '#dc2626',
              border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold'
            }}>✕ Cancel</button>
          )}
        </div>

        {/* Onboard Form */}
        {mode === 'onboard' && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Onboard New Designer</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                  Designer Email * <span style={{ fontSize: '12px', color: '#888' }}>(must have an account)</span>
                </label>
                <input value={newDesigner.email}
                  onChange={(e) => setNewDesigner(p => ({ ...p, email: e.target.value }))}
                  placeholder="designer@email.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Full Name</label>
                <input value={newDesigner.full_name}
                  onChange={(e) => setNewDesigner(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="e.g. Sarah Al Maktoum" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                  Display Name * <span style={{ fontSize: '12px', color: '#888' }}>(shown on storefront)</span>
                </label>
                <input value={newDesigner.display_name}
                  onChange={(e) => setNewDesigner(p => ({ ...p, display_name: e.target.value }))}
                  placeholder="e.g. Sarah Designs" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                  Storefront URL Slug <span style={{ fontSize: '12px', color: '#888' }}>(auto-generated if empty)</span>
                </label>
                <input value={newDesigner.storefront_slug}
                  onChange={(e) => setNewDesigner(p => ({ ...p, storefront_slug: e.target.value }))}
                  placeholder="e.g. sarah-designs" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Bio</label>
              <textarea value={newDesigner.bio}
                onChange={(e) => setNewDesigner(p => ({ ...p, bio: e.target.value }))}
                placeholder="Tell customers about this designer..." rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>
                Royalty % <span style={{ fontSize: '12px', color: '#888' }}>(designer's share of net price per sale)</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input type="number" min="5" max="50" value={newDesigner.royalty_percent}
                  onChange={(e) => setNewDesigner(p => ({ ...p, royalty_percent: e.target.value }))}
                  style={{ ...inputStyle, maxWidth: '100px' }} />
                <span style={{ fontSize: '14px', color: '#555' }}>%</span>
                <span style={{ fontSize: '13px', color: '#888', padding: '6px 12px', backgroundColor: '#f5f0eb', borderRadius: '8px' }}>
                  On a AED 350 item (net AED 333): designer gets AED {(333 * newDesigner.royalty_percent / 100).toFixed(0)}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>Specialties</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {SPECIALTIES.map(s => (
                  <button key={s} onClick={() => toggleSpecialty(s)} style={{
                    padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px',
                    border: newDesigner.specialties.includes(s) ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                    backgroundColor: newDesigner.specialties.includes(s) ? '#1a1a1a' : 'white',
                    color: newDesigner.specialties.includes(s) ? 'white' : '#555'
                  }}>{s}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f5f0eb', borderRadius: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={newDesigner.is_tailor}
                  onChange={(e) => setNewDesigner(p => ({ ...p, is_tailor: e.target.checked }))}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>✂️ Designer is also a Tailor (Design + Produce)</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                    This designer produces their own designs. A tailor profile will be auto-created.
                  </div>
                </div>
              </label>
            </div>

            <button onClick={handleOnboard} disabled={saving} style={{
              width: '100%', padding: '14px', backgroundColor: '#1a1a1a', color: 'white',
              border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
            }}>
              {saving ? 'Onboarding...' : '✅ Onboard Designer'}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { key: 'all', label: `All (${allDesigners.length})` },
            { key: 'pending', label: `Pending (${pendingDesigners.length})` },
            { key: 'approved', label: `Approved (${approvedDesigners.length})` },
            { key: 'suspended', label: `Suspended (${suspendedDesigners.length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
              backgroundColor: activeTab === tab.key ? '#1a1a1a' : 'white',
              color: activeTab === tab.key ? 'white' : '#555',
              border: activeTab === tab.key ? 'none' : '1px solid #ddd',
              fontWeight: activeTab === tab.key ? 'bold' : 'normal'
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Designers List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>Loading designers...</div>
        ) : filteredDesigners.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '60px', textAlign: 'center', color: '#888' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>No designers yet</h3>
            <p>Click "Onboard Designer" to add your first designer!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredDesigners.map(designer => (
              <div key={designer.id} style={{
                backgroundColor: 'white', borderRadius: '16px', padding: '24px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h3 style={{ fontWeight: 'bold', fontSize: '18px' }}>{designer.display_name}</h3>
                      {getStatusBadge(designer.status)}
                      {designer.is_tailor && (
                        <span style={{ fontSize: '11px', backgroundColor: '#eff6ff', color: '#1e40af', padding: '3px 10px', borderRadius: '20px', fontWeight: 'bold' }}>
                          ✂️ Design + Produce
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                      {designer.profile?.email} · Royalty: {designer.royalty_percent}% · Slug: /{designer.storefront_slug}
                    </div>
                    {designer.bio && (
                      <p style={{ fontSize: '13px', color: '#555', marginBottom: '10px' }}>{designer.bio}</p>
                    )}
                    {designer.specialties && designer.specialties.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {designer.specialties.map(s => (
                          <span key={s} style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px' }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                    {designer.status !== 'approved' && (
                      <button onClick={() => updateDesignerStatus(designer.id, 'approved')} style={{
                        padding: '8px 16px', backgroundColor: '#dcfce7', color: '#166534',
                        border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'
                      }}>✅ Approve</button>
                    )}
                    {designer.status !== 'suspended' && (
                      <button onClick={() => updateDesignerStatus(designer.id, 'suspended')} style={{
                        padding: '8px 16px', backgroundColor: '#fee2e2', color: '#dc2626',
                        border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'
                      }}>🚫 Suspend</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}