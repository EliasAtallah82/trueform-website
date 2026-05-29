'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function NewOrder() {
  const [user, setUser] = useState(null)
  const [familyMembers, setFamilyMembers] = useState([])
  const [addresses, setAddresses] = useState([])
  const [step, setStep] = useState(1)
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [fitPreferences, setFitPreferences] = useState({})
  const [selectedFit, setSelectedFit] = useState('')
  const [changingFit, setChangingFit] = useState(false)
  const [newMember, setNewMember] = useState({ name: '', relationship: '', gender: '', age: '' })
  const [orderDetails, setOrderDetails] = useState({
    occasion: [], garment_type: [], modesty: '', budget_range: ''
  })
  const [newAddress, setNewAddress] = useState({
    label: '', apt_number: '', floor: '', street: '',
    area: '', emirate: '', country: 'United Arab Emirates', is_default: false
  })

  const EMIRATES = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah']

  const FIT_MAP = {
    'Shirt / Top': 'fit_shirts',
    'Trousers / Pants': 'fit_trousers',
    'Suit / Blazer': 'fit_suits',
    'Thobe / Kandura': 'fit_thobes',
    'Abaya / Modest Wear': 'fit_abayas',
    'Dress / Skirt': 'fit_dresses',
    'Full Outfit': 'fit_shirts',
    'Accessories': null
  }

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        const { data: members } = await supabase
          .from('family_members').select('*').eq('owner_id', data.user.id)
        setFamilyMembers(members || [])
        const { data: adds } = await supabase
          .from('delivery_address').select('*').eq('customer_id', data.user.id)
          .order('is_default', { ascending: false })
        setAddresses(adds || [])
        const defaultAddr = adds?.find(a => a.is_default)
        if (defaultAddr) setSelectedAddress(defaultAddr.id)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('fit_shirts, fit_trousers, fit_suits, fit_thobes, fit_abayas, fit_dresses')
          .eq('id', data.user.id).single()
        if (profileData) setFitPreferences(profileData)
      }
    }
    init()
  }, [])

  // Auto-set fit when garment type is selected
  useEffect(() => {
    if (orderDetails.garment_type.length > 0) {
      const firstGarment = orderDetails.garment_type[0]
      const fitKey = FIT_MAP[firstGarment]
      if (fitKey && fitPreferences[fitKey]) {
        setSelectedFit(fitPreferences[fitKey])
        setChangingFit(false)
      } else {
        setSelectedFit('')
      }
    }
  }, [orderDetails.garment_type, fitPreferences])

  const addFamilyMember = async () => {
    const { data } = await supabase.from('family_members').insert({
      owner_id: user.id, ...newMember
    }).select()
    if (data) {
      setFamilyMembers([...familyMembers, data[0]])
      setShowAddMember(false)
      setNewMember({ name: '', relationship: '', gender: '', age: '' })
    }
  }

  const addAddress = async () => {
    if (!newAddress.label || !newAddress.apt_number || !newAddress.area || !newAddress.emirate) {
      alert('Please fill in all required fields!')
      return
    }
    const { data, error } = await supabase.from('delivery_address').insert({
      customer_id: user.id, ...newAddress
    }).select()
    if (error) { alert('Error: ' + error.message); return }
    if (data) {
      setAddresses([...addresses, data[0]])
      setSelectedAddress(data[0].id)
      setShowAddAddress(false)
      setNewAddress({ label: '', apt_number: '', floor: '', street: '', area: '', emirate: '', country: 'United Arab Emirates', is_default: false })
    }
  }

  const handleOrderSelect = (field, value, multi = false) => {
    if (multi) {
      const current = orderDetails[field]
      if (current.includes(value)) {
        setOrderDetails({ ...orderDetails, [field]: current.filter(v => v !== value) })
      } else {
        setOrderDetails({ ...orderDetails, [field]: [...current, value] })
      }
    } else {
      setOrderDetails({ ...orderDetails, [field]: value })
    }
  }

  const handleNext = () => setStep(step + 1)
  const handleBack = () => setStep(step - 1)

  const getLabelIcon = (label) => {
    const l = label?.toLowerCase()
    if (l?.includes('home')) return '🏠'
    if (l?.includes('work') || l?.includes('office')) return '💼'
    if (l?.includes('parent') || l?.includes('family')) return '👨‍👩‍👧'
    return '📍'
  }

  const getFitOptions = () => {
    if (orderDetails.garment_type.includes('Abaya / Modest Wear') ||
        orderDetails.garment_type.includes('Dress / Skirt')) {
      return ['Fitted', 'Regular', 'Loose']
    }
    if (orderDetails.garment_type.includes('Suit / Blazer') ||
        orderDetails.garment_type.includes('Thobe / Kandura')) {
      return ['Slim', 'Regular', 'Loose']
    }
    return ['Skinny', 'Slim', 'Regular', 'Relaxed', 'Loose']
  }

  const getSavedFit = () => {
    if (orderDetails.garment_type.length === 0) return null
    const firstGarment = orderDetails.garment_type[0]
    const fitKey = FIT_MAP[firstGarment]
    return fitKey ? fitPreferences[fitKey] : null
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }
  const selectStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', backgroundColor: 'white' }

  const savedFit = getSavedFit()

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f0eb' }}>
      <nav style={{ backgroundColor: '#1a1a1a', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm</h1>
        <a href="/dashboard/customer" style={{ color: 'white', fontSize: '14px' }}>← Back to Dashboard</a>
      </nav>

      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Progress */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#888' }}>Step {step} of 4</span>
            <span style={{ fontSize: '14px', color: '#888' }}>{Math.round((step / 4) * 100)}%</span>
          </div>
          <div style={{ height: '6px', backgroundColor: '#e0e0e0', borderRadius: '3px' }}>
            <div style={{ height: '6px', backgroundColor: '#1a1a1a', borderRadius: '3px', width: `${(step / 4) * 100}%`, transition: 'width 0.4s ease' }}/>
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Who is this order for?</h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>Select a person or add someone new</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <button onClick={() => setSelectedMember('myself')} style={{
                padding: '20px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                border: selectedMember === 'myself' ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                backgroundColor: selectedMember === 'myself' ? '#f5f0eb' : 'white'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
                <div style={{ fontWeight: 'bold' }}>{user.user_metadata.full_name}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>Myself</div>
              </button>

              {familyMembers.map((member) => (
                <button key={member.id} onClick={() => setSelectedMember(member.id)} style={{
                  padding: '20px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                  border: selectedMember === member.id ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                  backgroundColor: selectedMember === member.id ? '#f5f0eb' : 'white'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                    {member.relationship === 'wife' ? '👩' : member.relationship === 'son' ? '👦' : member.relationship === 'daughter' ? '👧' : member.relationship === 'father' ? '👴' : member.relationship === 'mother' ? '👵' : '👤'}
                  </div>
                  <div style={{ fontWeight: 'bold' }}>{member.name}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{member.relationship}</div>
                </button>
              ))}

              <button onClick={() => setShowAddMember(true)} style={{
                padding: '20px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                border: '2px dashed #e0e0e0', backgroundColor: 'white'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>➕</div>
                <div style={{ fontWeight: 'bold', color: '#888' }}>Add Person</div>
              </button>
            </div>

            {showAddMember && (
              <div style={{ backgroundColor: '#f5f0eb', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>Add New Person</h3>
                {[{ label: 'Name', key: 'name', placeholder: 'e.g. Sarah' }, { label: 'Relationship', key: 'relationship', placeholder: 'e.g. wife, son' }].map((field) => (
                  <div key={field.key} style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>{field.label}</label>
                    <input value={newMember[field.key]} onChange={(e) => setNewMember({ ...newMember, [field.key]: e.target.value })} placeholder={field.placeholder} style={inputStyle} />
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Gender</label>
                    <select value={newMember.gender} onChange={(e) => setNewMember({ ...newMember, gender: e.target.value })} style={selectStyle}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Age (optional)</label>
                    <input type="number" value={newMember.age} onChange={(e) => setNewMember({ ...newMember, age: e.target.value })} placeholder="e.g. 8" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={addFamilyMember} style={{ flex: 1, padding: '10px', backgroundColor: '#1a1a1a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Add</button>
                  <button onClick={() => setShowAddMember(false)} style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', color: '#888', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}

            <button onClick={handleNext} disabled={!selectedMember} style={{
              width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
              fontSize: '16px', fontWeight: 'bold', cursor: !selectedMember ? 'not-allowed' : 'pointer',
              backgroundColor: !selectedMember ? '#ccc' : '#1a1a1a', color: 'white'
            }}>Next →</button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>What are you looking for?</h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>Tell us about this order</p>

            <h3 style={{ fontWeight: 'bold', marginBottom: '12px' }}>Occasion</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              {['Work & Office', 'Wedding & Events', 'Casual Everyday', 'Eid & Religious', 'Formal Dinner', 'Special Celebration', 'Family Gathering', 'Date Night', 'Beach & Holiday', 'Gift for Someone', 'Other'].map((item) => (
                <button key={item} onClick={() => handleOrderSelect('occasion', item, true)} style={{
                  padding: '12px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer',
                  border: orderDetails.occasion.includes(item) ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                  backgroundColor: orderDetails.occasion.includes(item) ? '#f5f0eb' : 'white'
                }}>{item}</button>
              ))}
            </div>

            <h3 style={{ fontWeight: 'bold', marginBottom: '12px' }}>What do you need?</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              {['Full Outfit', 'Shirt / Top', 'Trousers / Pants', 'Suit / Blazer', 'Thobe / Kandura', 'Abaya / Modest Wear', 'Dress / Skirt', 'Accessories'].map((item) => (
                <button key={item} onClick={() => handleOrderSelect('garment_type', item, true)} style={{
                  padding: '12px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer',
                  border: orderDetails.garment_type.includes(item) ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                  backgroundColor: orderDetails.garment_type.includes(item) ? '#f5f0eb' : 'white'
                }}>{item}</button>
              ))}
            </div>

            <h3 style={{ fontWeight: 'bold', marginBottom: '12px' }}>Modesty preference</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              {[
                { label: 'Fully Covered', desc: 'Full sleeves, high neck' },
                { label: 'Modest & Elegant', desc: 'Covered but fitted' },
                { label: 'Moderate', desc: 'Some skin, tasteful' },
                { label: 'Fashion Forward', desc: 'Trendy and expressive' }
              ].map((item) => (
                <button key={item.label} onClick={() => handleOrderSelect('modesty', item.label)} style={{
                  padding: '12px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                  border: orderDetails.modesty === item.label ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                  backgroundColor: orderDetails.modesty === item.label ? '#f5f0eb' : 'white'
                }}>
                  <div style={{ fontWeight: 'bold' }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>{item.desc}</div>
                </button>
              ))}
            </div>

            <h3 style={{ fontWeight: 'bold', marginBottom: '12px' }}>Budget per item</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              {[
                { label: 'Budget', desc: 'Under AED 200' },
                { label: 'Mid Range', desc: 'AED 200 – 500' },
                { label: 'Premium', desc: 'AED 500 – 1,000' },
                { label: 'Luxury', desc: 'AED 1,000+' }
              ].map((item) => (
                <button key={item.label} onClick={() => handleOrderSelect('budget_range', item.label)} style={{
                  padding: '12px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                  border: orderDetails.budget_range === item.label ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                  backgroundColor: orderDetails.budget_range === item.label ? '#f5f0eb' : 'white'
                }}>
                  <div style={{ fontWeight: 'bold' }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>{item.desc}</div>
                </button>
              ))}
            </div>

            {/* Fit Preference */}
            {orderDetails.garment_type.length > 0 && orderDetails.garment_type[0] !== 'Accessories' && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontWeight: 'bold', marginBottom: '12px' }}>Fit Preference</h3>

                {savedFit && !changingFit ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button onClick={() => { setSelectedFit(savedFit); }}
                      style={{
                        padding: '20px', borderRadius: '12px', border: '2px solid #1a1a1a',
                        backgroundColor: '#f5f0eb', cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: '16px'
                      }}>
                      <span style={{ fontSize: '28px' }}>✅</span>
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                          Use my saved fit — {savedFit}
                        </div>
                        <div style={{ fontSize: '13px', color: '#888' }}>
                          From your profile preferences
                        </div>
                      </div>
                    </button>
                    <button onClick={() => setChangingFit(true)}
                      style={{
                        padding: '20px', borderRadius: '12px', border: '2px solid #e0e0e0',
                        backgroundColor: 'white', cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: '16px'
                      }}>
                      <span style={{ fontSize: '28px' }}>🔄</span>
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                          Change fit for this order
                        </div>
                        <div style={{ fontSize: '13px', color: '#888' }}>
                          Override your default preference
                        </div>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div>
                    {savedFit && (
                      <button onClick={() => { setChangingFit(false); setSelectedFit(savedFit); }}
                        style={{ fontSize: '13px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '12px', textDecoration: 'underline' }}>
                        ← Back to saved fit
                      </button>
                    )}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {getFitOptions().map((fit) => (
                        <button key={fit} onClick={() => setSelectedFit(fit)} style={{
                          padding: '10px 20px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer',
                          border: selectedFit === fit ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                          backgroundColor: selectedFit === fit ? '#f5f0eb' : 'white'
                        }}>{fit}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleBack} style={{ flex: 1, padding: '16px', backgroundColor: 'transparent', color: '#888', border: '1px solid #ddd', borderRadius: '12px', fontSize: '16px', cursor: 'pointer' }}>← Back</button>
              <button onClick={handleNext}
                disabled={orderDetails.occasion.length === 0 || orderDetails.garment_type.length === 0 || !orderDetails.modesty || !orderDetails.budget_range}
                style={{
                  flex: 2, padding: '16px', borderRadius: '12px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
                  backgroundColor: (orderDetails.occasion.length === 0 || orderDetails.garment_type.length === 0 || !orderDetails.modesty || !orderDetails.budget_range) ? '#ccc' : '#1a1a1a',
                  color: 'white'
                }}>Next →</button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Measurements</h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>
              {selectedMember === 'myself' ? 'Use your saved measurements or update them' : `Use ${familyMembers.find(m => m.id === selectedMember)?.name || 'their'}'s measurements`}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {[
                { icon: '✅', label: selectedMember === 'myself' ? 'Use my saved measurements' : `Use ${familyMembers.find(m => m.id === selectedMember)?.name}'s saved measurements`, desc: 'Quick and easy!', action: handleNext },
                { icon: '⚖️', label: selectedMember === 'myself' ? 'I lost or gained weight' : `${familyMembers.find(m => m.id === selectedMember)?.name} lost or gained weight`, desc: 'Rescan for best fit', action: () => window.location.href = '/measurements' },
                { icon: '🔄', label: selectedMember === 'myself' ? 'I just want to update' : `Update ${familyMembers.find(m => m.id === selectedMember)?.name}'s measurements`, desc: 'Rescan to refresh', action: () => window.location.href = '/measurements' },
              ].map((option) => (
                <button key={option.label} onClick={option.action} style={{
                  padding: '20px', borderRadius: '12px', border: '2px solid #e0e0e0',
                  backgroundColor: 'white', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: '16px'
                }}>
                  <span style={{ fontSize: '28px' }}>{option.icon}</span>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{option.label}</div>
                    <div style={{ fontSize: '13px', color: '#888' }}>{option.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <button onClick={handleBack} style={{ width: '100%', padding: '16px', backgroundColor: 'transparent', color: '#888', border: '1px solid #ddd', borderRadius: '12px', fontSize: '16px', cursor: 'pointer' }}>← Back</button>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Delivery Address</h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>Where should we deliver your order?</p>

            {addresses.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                {addresses.map((address) => (
                  <button key={address.id} onClick={() => setSelectedAddress(address.id)} style={{
                    width: '100%', padding: '16px', borderRadius: '12px', marginBottom: '12px',
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px',
                    border: selectedAddress === address.id ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                    backgroundColor: selectedAddress === address.id ? '#f5f0eb' : 'white'
                  }}>
                    <span style={{ fontSize: '24px' }}>{getLabelIcon(address.label)}</span>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                        {address.label}
                        {address.is_default && (
                          <span style={{ fontSize: '11px', backgroundColor: '#1a1a1a', color: 'white', padding: '2px 8px', borderRadius: '20px', marginLeft: '8px' }}>Default</span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: '#555' }}>Flat {address.apt_number}{address.floor ? `, Floor ${address.floor}` : ''}{address.street ? `, ${address.street}` : ''}</div>
                      <div style={{ fontSize: '13px', color: '#555' }}>{address.area}, {address.emirate}, UAE</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showAddAddress && (
              <div style={{ backgroundColor: '#f5f0eb', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>Add New Address</h3>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Label *</label>
                  <input value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} placeholder="e.g. Home, Work" style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Flat No. *</label>
                    <input type="number" value={newAddress.apt_number} onChange={(e) => setNewAddress({ ...newAddress, apt_number: e.target.value })} placeholder="e.g. 204" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Floor</label>
                    <input type="number" value={newAddress.floor} onChange={(e) => setNewAddress({ ...newAddress, floor: e.target.value })} placeholder="e.g. 3" style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Street</label>
                  <input value={newAddress.street} onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })} placeholder="e.g. Sheikh Zayed Road" style={inputStyle} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Area *</label>
                  <input value={newAddress.area} onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })} placeholder="e.g. Downtown, Marina" style={inputStyle} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Emirate *</label>
                  <select value={newAddress.emirate} onChange={(e) => setNewAddress({ ...newAddress, emirate: e.target.value })} style={selectStyle}>
                    <option value="">Select Emirate</option>
                    {EMIRATES.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={addAddress} style={{ flex: 1, padding: '12px', backgroundColor: '#1a1a1a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Save Address</button>
                  <button onClick={() => setShowAddAddress(false)} style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: '#888', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}

            {!showAddAddress && (
              <button onClick={() => setShowAddAddress(true)} style={{
                width: '100%', padding: '14px', backgroundColor: 'transparent',
                color: '#1a1a1a', border: '2px dashed #1a1a1a', borderRadius: '12px',
                fontSize: '14px', cursor: 'pointer', marginBottom: '20px'
              }}>➕ Add New Address</button>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleBack} style={{ flex: 1, padding: '16px', backgroundColor: 'transparent', color: '#888', border: '1px solid #ddd', borderRadius: '12px', fontSize: '16px', cursor: 'pointer' }}>← Back</button>
              <button
                onClick={() => window.location.href = '/recommendations'}
                disabled={!selectedAddress}
                style={{
                  flex: 2, padding: '16px', borderRadius: '12px', border: 'none',
                  fontSize: '16px', fontWeight: 'bold',
                  cursor: selectedAddress ? 'pointer' : 'not-allowed',
                  backgroundColor: selectedAddress ? '#1a1a1a' : '#ccc',
                  color: 'white'
                }}>See Recommendations →</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}