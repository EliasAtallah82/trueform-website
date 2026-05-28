'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Addresses() {
  const [user, setUser] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newAddress, setNewAddress] = useState({
    label: '', apt_number: '', floor: '', street: '',
    area: '', emirate: '', country: 'United Arab Emirates', is_default: false
  })

  const EMIRATES = [
    'Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman',
    'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'
  ]

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        const { data: adds } = await supabase
          .from('delivery_address')
          .select('*')
          .eq('customer_id', data.user.id)
          .order('is_default', { ascending: false })
        setAddresses(adds || [])
      }
    }
    init()
  }, [])

  const handleSave = async () => {
    if (!newAddress.label || !newAddress.apt_number || !newAddress.area || !newAddress.emirate) {
      alert('Please fill in all required fields!')
      return
    }
    setSaving(true)

    if (newAddress.is_default) {
      await supabase.from('delivery_address')
        .update({ is_default: false })
        .eq('customer_id', user.id)
    }

    const { data, error } = await supabase.from('delivery_address').insert({
      customer_id: user.id,
      ...newAddress
    }).select()

    if (error) {
      alert('Error: ' + error.message)
      setSaving(false)
      return
    }

    if (data) {
      setAddresses([...addresses, data[0]])
      setShowAddForm(false)
      setNewAddress({
        label: '', apt_number: '', floor: '', street: '',
        area: '', emirate: '', country: 'United Arab Emirates', is_default: false
      })
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('delivery_address').delete().eq('id', id)
    setAddresses(addresses.filter(a => a.id !== id))
  }

  const handleSetDefault = async (id) => {
    await supabase.from('delivery_address')
      .update({ is_default: false })
      .eq('customer_id', user.id)
    await supabase.from('delivery_address')
      .update({ is_default: true })
      .eq('id', id)
    setAddresses(addresses.map(a => ({ ...a, is_default: a.id === id })))
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const inputStyle = {
    width: '100%', padding: '10px', borderRadius: '8px',
    border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box'
  }

  const selectStyle = {
    width: '100%', padding: '10px', borderRadius: '8px',
    border: '1px solid #ddd', fontSize: '14px', backgroundColor: 'white'
  }

  const getLabelIcon = (label) => {
    const l = label?.toLowerCase()
    if (l?.includes('home')) return '🏠'
    if (l?.includes('work') || l?.includes('office')) return '💼'
    if (l?.includes('parent') || l?.includes('family')) return '👨‍👩‍👧'
    return '📍'
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
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>📍 My Addresses</h2>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>
            Manage your delivery addresses
          </p>

          {/* Address List */}
          {addresses.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              {addresses.map((address) => (
                <div key={address.id} style={{
                  padding: '20px', borderRadius: '12px', marginBottom: '12px',
                  border: address.is_default ? '2px solid #1a1a1a' : '1px solid #e0e0e0',
                  backgroundColor: address.is_default ? '#f5f0eb' : 'white'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontSize: '28px' }}>{getLabelIcon(address.label)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{address.label}</span>
                        {address.is_default && (
                          <span style={{
                            fontSize: '11px', backgroundColor: '#1a1a1a', color: 'white',
                            padding: '2px 8px', borderRadius: '20px'
                          }}>Default</span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: '#555' }}>
                        Flat {address.apt_number}
                        {address.floor ? `, Floor ${address.floor}` : ''}
                        {address.street ? `, ${address.street}` : ''}
                      </div>
                      <div style={{ fontSize: '13px', color: '#555' }}>
                        {address.area}, {address.emirate}, UAE
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    {!address.is_default && (
                      <button onClick={() => handleSetDefault(address.id)} style={{
                        padding: '6px 12px', backgroundColor: '#f5f0eb', color: '#1a1a1a',
                        border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                      }}>Set as Default</button>
                    )}
                    <button onClick={() => handleDelete(address.id)} style={{
                      padding: '6px 12px', backgroundColor: '#fee2e2', color: '#dc2626',
                      border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                    }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Address Form */}
          {showAddForm && (
            <div style={{
              backgroundColor: '#f5f0eb', borderRadius: '12px',
              padding: '24px', marginBottom: '20px'
            }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: '20px' }}>Add New Address</h3>

              {/* Label */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                  Address Label <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input value={newAddress.label}
                  onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                  placeholder="e.g. Home, Work, Parents' House"
                  style={inputStyle}
                />
              </div>

              {/* Flat + Floor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                    Flat No. <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input type="number" value={newAddress.apt_number}
                    onChange={(e) => setNewAddress({ ...newAddress, apt_number: e.target.value })}
                    placeholder="e.g. 204"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Floor</label>
                  <input type="number" value={newAddress.floor}
                    onChange={(e) => setNewAddress({ ...newAddress, floor: e.target.value })}
                    placeholder="e.g. 3"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Street */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Street Name</label>
                <input type="text" value={newAddress.street}
                  onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                  placeholder="e.g. Sheikh Zayed Road"
                  style={inputStyle}
                />
              </div>

              {/* Area */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                  Area / Neighborhood <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input type="text" value={newAddress.area}
                  onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
                  placeholder="e.g. Jumeirah, Marina, Downtown"
                  style={inputStyle}
                />
              </div>

              {/* Emirate */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                  Emirate <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select value={newAddress.emirate}
                  onChange={(e) => setNewAddress({ ...newAddress, emirate: e.target.value })}
                  style={selectStyle}>
                  <option value="">Select Emirate</option>
                  {EMIRATES.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>

              {/* Country */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Country</label>
                <select value="United Arab Emirates" onChange={() => {}} style={selectStyle}>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                </select>
              </div>

              {/* Set as Default */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <input type="checkbox" id="default"
                  checked={newAddress.is_default}
                  onChange={(e) => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                />
                <label htmlFor="default" style={{ fontSize: '14px', cursor: 'pointer' }}>
                  Set as my default address
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleSave} disabled={saving} style={{
                  flex: 1, padding: '12px', backgroundColor: '#1a1a1a', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                }}>
                  {saving ? 'Saving...' : 'Save Address'}
                </button>
                <button onClick={() => setShowAddForm(false)} style={{
                  flex: 1, padding: '12px', backgroundColor: 'transparent', color: '#888',
                  border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer'
                }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Add Button */}
          {!showAddForm && (
            <button onClick={() => setShowAddForm(true)} style={{
              width: '100%', padding: '14px', backgroundColor: 'transparent',
              color: '#1a1a1a', border: '2px dashed #1a1a1a', borderRadius: '12px',
              fontSize: '16px', cursor: 'pointer'
            }}>➕ Add New Address</button>
          )}
        </div>
      </div>
    </main>
  )
}