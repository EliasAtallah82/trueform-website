'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Order() {
  const searchParams = useSearchParams()
  const itemId = searchParams.get('item')
  const selectedColor = searchParams.get('color')

  const [user, setUser] = useState(null)
  const [item, setItem] = useState(null)
  const [profile, setProfile] = useState(null)
  const [familyMembers, setFamilyMembers] = useState([])
  const [addresses, setAddresses] = useState([])
  const [step, setStep] = useState(1)

  // Order selections
  const [selectedMember, setSelectedMember] = useState('myself')
  const [selectedFit, setSelectedFit] = useState('')
  const [selectedAddress, setSelectedAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [placing, setPlacing] = useState(false)

  // Add address
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [newAddress, setNewAddress] = useState({
    label: '', apt_number: '', floor: '', street: '',
    area: '', emirate: '', country: 'United Arab Emirates', is_default: false
  })

  const EMIRATES = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah']

  const getFitOptions = (category) => {
    if (!category) return ['Slim', 'Regular', 'Loose']
    if (category.includes('Abaya') || category.includes('Dress')) return ['Fitted', 'Regular', 'Loose']
    if (category.includes('Suit') || category.includes('Blazer')) return ['Slim', 'Regular', 'Relaxed']
    if (category.includes('Thobe') || category.includes('Kandura')) return ['Slim', 'Regular', 'Loose']
    if (category.includes('Shirt') || category.includes('Top')) return ['Skinny', 'Slim', 'Regular', 'Relaxed', 'Loose']
    if (category.includes('Trousers') || category.includes('Pants')) return ['Skinny', 'Slim', 'Regular', 'Relaxed', 'Loose']
    return ['Slim', 'Regular', 'Loose']
  }

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { window.location.href = '/auth/login'; return }
      setUser(data.user)

      // Fetch item
      if (itemId) {
        const { data: itemData } = await supabase
          .from('catalog').select('*').eq('id', itemId).single()
        setItem(itemData)
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', data.user.id).single()
      setProfile(profileData)

      // Fetch family members
      const { data: members } = await supabase
        .from('family_members').select('*').eq('owner_id', data.user.id)
      setFamilyMembers(members || [])

      // Fetch addresses
      const { data: adds } = await supabase
        .from('delivery_address').select('*').eq('customer_id', data.user.id)
        .order('is_default', { ascending: false })
      setAddresses(adds || [])
      const defaultAddr = adds?.find(a => a.is_default)
      if (defaultAddr) setSelectedAddress(defaultAddr.id)
    }
    init()
  }, [itemId])

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

  const placeOrder = async () => {
    if (!selectedAddress) { alert('Please select a delivery address!'); return }
    setPlacing(true)

    const address = addresses.find(a => a.id === selectedAddress)
    const addressStr = `${address.label}: Flat ${address.apt_number}${address.floor ? `, Floor ${address.floor}` : ''}${address.street ? `, ${address.street}` : ''}, ${address.area}, ${address.emirate}, UAE`

    // Find cheapest approved tailor for this item
const { data: tailorBids } = await supabase
  .from('tailor_catalog_items')
  .select('tailor_id, tailor_price')
  .eq('catalog_id', itemId)
  .eq('status', 'approved')
  .order('tailor_price', { ascending: true })
  .limit(1)

console.log('Tailor bids:', tailorBids)
const assignedTailor = tailorBids?.[0]?.tailor_id || null
console.log('Assigned tailor:', assignedTailor)

const now = new Date()
const assignmentDeadline = new Date(now.getTime() + 2 * 60 * 60 * 1000) // +2 hours
const orderDeadline = new Date(now.getTime() + 12 * 60 * 60 * 1000) // +12 hours

const { data, error } = await supabase.from('orders').insert({
  customer_id: user.id,
  family_member_id: selectedMember === 'myself' ? null : selectedMember,
  catalog_id: itemId,
  tailor_id: assignedTailor,
  garment_type: item?.category,
  color: selectedColor,
  fit: selectedFit,
  total_price: item?.price,
  status: assignedTailor ? 'new' : 'pending_tailor',
  delivery_address: addressStr,
  notes: notes,
  occasion: item?.occasion,
  modesty: item?.modesty_level,
  assignment_deadline: assignmentDeadline.toISOString(),
  order_deadline: orderDeadline.toISOString(),
  assignment_attempt: 1,
  attempted_tailors: assignedTailor || '',
}).select()

    if (error) { alert('Error placing order: ' + error.message); setPlacing(false); return }

    if (data) {
      window.location.href = `/orders?success=true`
    }
    setPlacing(false)
  }

  if (!user || !item) return <div style={{ padding: '40px' }}>Loading...</div>

  const fitOptions = getFitOptions(item.category)
  const totalSteps = 4

  const inputStyle = {
    width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px',
    boxSizing: 'border-box', border: '1px solid #ddd'
  }

  const selectStyle = {
    width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px',
    backgroundColor: 'white', border: '1px solid #ddd'
  }

  const getMemberIcon = (relationship) => {
    const icons = { 'wife': '👩', 'husband': '👨', 'son': '👦', 'daughter': '👧', 'father': '👴', 'mother': '👵', 'brother': '👦', 'sister': '👧' }
    return icons[relationship?.toLowerCase()] || '👤'
  }

  const getLabelIcon = (label) => {
    const l = label?.toLowerCase()
    if (l?.includes('home')) return '🏠'
    if (l?.includes('work') || l?.includes('office')) return '💼'
    return '📍'
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f0eb' }}>
      <nav style={{
        backgroundColor: '#1a1a1a', padding: '16px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm</h1>
        <a href={`/catalog/${itemId}`} style={{ color: 'white', fontSize: '14px' }}>← Back to Item</a>
      </nav>

      <div style={{ padding: '40px', maxWidth: '680px', margin: '0 auto' }}>

        {/* Order Summary Bar */}
        <div style={{
          backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '16px 20px',
          marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {item.photo_main && (
              <img src={item.photo_main} alt={item.name}
                style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
            )}
            <div>
              <div style={{ color: 'white', fontWeight: 'bold', fontSize: '15px' }}>{item.name}</div>
              <div style={{ color: '#aaa', fontSize: '12px' }}>
                {selectedColor && `${selectedColor} · `}{item.fabrics} · {item.turnaround_days} days
              </div>
            </div>
          </div>
          <div style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>AED {item.price}</div>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#888' }}>Step {step} of {totalSteps}</span>
            <span style={{ fontSize: '14px', color: '#888' }}>{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div style={{ height: '6px', backgroundColor: '#e0e0e0', borderRadius: '3px' }}>
            <div style={{
              height: '6px', backgroundColor: '#1a1a1a', borderRadius: '3px',
              width: `${(step / totalSteps) * 100}%`, transition: 'width 0.4s ease'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            {['Who', 'Fit', 'Measurements', 'Address'].map((label, i) => (
              <span key={label} style={{
                fontSize: '11px', color: step > i ? '#1a1a1a' : '#aaa',
                fontWeight: step === i + 1 ? 'bold' : 'normal'
              }}>{label}</span>
            ))}
          </div>
        </div>

        {/* ── STEP 1: WHO ── */}
        {step === 1 && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>Who is this order for?</h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>Select yourself or a family member</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <button onClick={() => setSelectedMember('myself')} style={{
                padding: '20px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                border: selectedMember === 'myself' ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                backgroundColor: selectedMember === 'myself' ? '#f5f0eb' : 'white'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
                <div style={{ fontWeight: 'bold' }}>{profile?.full_name || 'Myself'}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>Myself</div>
              </button>

              {familyMembers.map((member) => (
                <button key={member.id} onClick={() => setSelectedMember(member.id)} style={{
                  padding: '20px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                  border: selectedMember === member.id ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                  backgroundColor: selectedMember === member.id ? '#f5f0eb' : 'white'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{getMemberIcon(member.relationship)}</div>
                  <div style={{ fontWeight: 'bold' }}>{member.name}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{member.relationship}</div>
                </button>
              ))}
            </div>

            <button onClick={() => setStep(2)} style={{
              width: '100%', padding: '16px', backgroundColor: '#1a1a1a', color: 'white',
              border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
            }}>Next →</button>
          </div>
        )}

        {/* ── STEP 2: FIT ── */}
        {step === 2 && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>How would you like it to fit?</h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>Choose your preferred fit for this garment</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {fitOptions.map((fit) => (
                <button key={fit} onClick={() => setSelectedFit(fit)} style={{
                  padding: '16px 20px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                  border: selectedFit === fit ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                  backgroundColor: selectedFit === fit ? '#f5f0eb' : 'white',
                  display: 'flex', alignItems: 'center', gap: '12px'
                }}>
                  <span style={{ fontSize: '20px' }}>
                    {fit === 'Skinny' ? '🔲' : fit === 'Slim' ? '📐' : fit === 'Regular' ? '⬜' : fit === 'Relaxed' ? '🔳' : fit === 'Loose' ? '🟦' : fit === 'Fitted' ? '📐' : '⬜'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{fit}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {fit === 'Skinny' ? 'Very tight, body hugging' :
                       fit === 'Slim' ? 'Close to body, tailored look' :
                       fit === 'Regular' ? 'Classic comfortable fit' :
                       fit === 'Relaxed' ? 'Slightly loose, easy wear' :
                       fit === 'Loose' ? 'Flowing, maximum comfort' :
                       fit === 'Fitted' ? 'Shaped to your figure' : ''}
                    </div>
                  </div>
                  {selectedFit === fit && <span style={{ marginLeft: 'auto', fontSize: '18px' }}>✅</span>}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(1)} style={{
                flex: 1, padding: '14px', backgroundColor: 'transparent', color: '#888',
                border: '1px solid #ddd', borderRadius: '12px', fontSize: '15px', cursor: 'pointer'
              }}>← Back</button>
              <button onClick={() => setStep(3)} disabled={!selectedFit} style={{
                flex: 2, padding: '14px', backgroundColor: selectedFit ? '#1a1a1a' : '#ccc',
                color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px',
                fontWeight: 'bold', cursor: selectedFit ? 'pointer' : 'not-allowed'
              }}>Next →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: MEASUREMENTS ── */}
        {step === 3 && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>Measurements</h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
              {selectedMember === 'myself'
                ? 'Confirm your measurements are up to date'
                : `Confirm ${familyMembers.find(m => m.id === selectedMember)?.name}'s measurements are up to date`}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              <button onClick={() => setStep(4)} style={{
                padding: '20px', borderRadius: '12px', border: '2px solid #1a1a1a',
                backgroundColor: '#f5f0eb', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '16px'
              }}>
                <span style={{ fontSize: '28px' }}>✅</span>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>My measurements are up to date</div>
                  <div style={{ fontSize: '13px', color: '#888' }}>Use saved measurements — quick and easy!</div>
                </div>
              </button>

              <button onClick={() => window.location.href = `/measurements?redirect=/order?item=${itemId}&color=${selectedColor}`} style={{
                padding: '20px', borderRadius: '12px', border: '2px solid #e0e0e0',
                backgroundColor: 'white', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '16px'
              }}>
                <span style={{ fontSize: '28px' }}>📏</span>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Update my measurements</div>
                  <div style={{ fontSize: '13px', color: '#888' }}>Rescan for best fit — takes 2 minutes</div>
                </div>
              </button>
            </div>

            <button onClick={() => setStep(2)} style={{
              width: '100%', padding: '14px', backgroundColor: 'transparent', color: '#888',
              border: '1px solid #ddd', borderRadius: '12px', fontSize: '15px', cursor: 'pointer'
            }}>← Back</button>
          </div>
        )}

        {/* ── STEP 4: ADDRESS ── */}
        {step === 4 && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>Delivery Address</h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>Where should we deliver your order?</p>

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
                  <div style={{ fontSize: '13px', color: '#555' }}>
                    Flat {address.apt_number}{address.floor ? `, Floor ${address.floor}` : ''}{address.street ? `, ${address.street}` : ''}
                  </div>
                  <div style={{ fontSize: '13px', color: '#555' }}>{address.area}, {address.emirate}, UAE</div>
                </div>
              </button>
            ))}

            {showAddAddress && (
              <div style={{ backgroundColor: '#f5f0eb', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>Add New Address</h3>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Label *</label>
                  <input value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    placeholder="e.g. Home, Work" style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Flat No. *</label>
                    <input type="number" value={newAddress.apt_number} onChange={(e) => setNewAddress({ ...newAddress, apt_number: e.target.value })}
                      placeholder="e.g. 204" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Floor</label>
                    <input type="number" value={newAddress.floor} onChange={(e) => setNewAddress({ ...newAddress, floor: e.target.value })}
                      placeholder="e.g. 3" style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Street</label>
                  <input value={newAddress.street} onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                    placeholder="e.g. Sheikh Zayed Road" style={inputStyle} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Area *</label>
                  <input value={newAddress.area} onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
                    placeholder="e.g. Downtown, Marina" style={inputStyle} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Emirate *</label>
                  <select value={newAddress.emirate} onChange={(e) => setNewAddress({ ...newAddress, emirate: e.target.value })} style={selectStyle}>
                    <option value="">Select Emirate</option>
                    {EMIRATES.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={addAddress} style={{
                    flex: 1, padding: '12px', backgroundColor: '#1a1a1a', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                  }}>Save Address</button>
                  <button onClick={() => setShowAddAddress(false)} style={{
                    flex: 1, padding: '12px', backgroundColor: 'transparent', color: '#888',
                    border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer'
                  }}>Cancel</button>
                </div>
              </div>
            )}

            {!showAddAddress && (
              <button onClick={() => setShowAddAddress(true)} style={{
                width: '100%', padding: '14px', backgroundColor: 'transparent',
                color: '#1a1a1a', border: '2px dashed #1a1a1a', borderRadius: '12px',
                fontSize: '14px', cursor: 'pointer', marginBottom: '16px'
              }}>➕ Add New Address</button>
            )}

            {/* Notes */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                Special Notes (optional)
              </label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions for the tailor or delivery..."
                rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {/* Order Summary */}
{(() => {
  const itemPrice = parseFloat(item.price) || 0
  const itemNet = itemPrice / 1.05
  const itemVat = itemPrice - itemNet
  const freeDelivery = itemPrice > 500
  const deliveryTotal = freeDelivery ? 0 : 25
  const deliveryNet = deliveryTotal / 1.05
  const deliveryVat = deliveryTotal - deliveryNet
  const grandTotal = itemPrice + deliveryTotal

  return (
    <div style={{ backgroundColor: '#f5f0eb', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
      <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>Order Summary</h3>

      {/* Item details */}
      {[
        { label: 'Item', value: item.name },
        { label: 'Color', value: selectedColor || 'White' },
        { label: 'Fabric', value: item.fabrics },
        { label: 'Fit', value: selectedFit },
        { label: 'For', value: selectedMember === 'myself' ? (profile?.full_name || 'Myself') : familyMembers.find(m => m.id === selectedMember)?.name },
        { label: 'Turnaround', value: `${item.turnaround_days} days` },
      ].map((row) => (
        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
          <span style={{ color: '#888' }}>{row.label}:</span>
          <span style={{ fontWeight: '500' }}>{row.value}</span>
        </div>
      ))}

      <div style={{ height: '1px', backgroundColor: '#ddd', margin: '12px 0' }} />

      {/* Item price breakdown */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Item</div>
        {[
          { label: 'Net price (excl. VAT)', value: `AED ${itemNet.toFixed(2)}` },
          { label: 'VAT (5%)', value: `AED ${itemVat.toFixed(2)}` },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
            <span style={{ color: '#888' }}>{row.label}</span>
            <span>{row.value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginTop: '6px' }}>
          <span>Item Total</span>
          <span>AED {itemPrice.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: '#ddd', margin: '12px 0' }} />

      {/* Delivery breakdown */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delivery</div>
        {freeDelivery ? (
          <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 'bold' }}>🚚 Free delivery on orders over AED 500</div>
        ) : (
          <>
            {[
              { label: 'Net delivery (excl. VAT)', value: `AED ${deliveryNet.toFixed(2)}` },
              { label: 'VAT (5%)', value: `AED ${deliveryVat.toFixed(2)}` },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                <span style={{ color: '#888' }}>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginTop: '6px' }}>
              <span>Delivery Total</span>
              <span>AED {deliveryTotal.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      <div style={{ height: '2px', backgroundColor: '#1a1a1a', margin: '12px 0' }} />

      {/* Grand Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Grand Total</span>
        <span style={{ fontWeight: 'bold', fontSize: '22px', color: '#1a1a1a' }}>AED {grandTotal.toFixed(2)}</span>
      </div>
      <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', textAlign: 'right' }}>VAT inclusive</div>
    </div>
  )
})()}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(3)} style={{
                flex: 1, padding: '14px', backgroundColor: 'transparent', color: '#888',
                border: '1px solid #ddd', borderRadius: '12px', fontSize: '15px', cursor: 'pointer'
              }}>← Back</button>
              <button onClick={placeOrder} disabled={!selectedAddress || placing} style={{
                flex: 2, padding: '14px',
                backgroundColor: selectedAddress && !placing ? '#1a1a1a' : '#ccc',
                color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px',
                fontWeight: 'bold', cursor: selectedAddress && !placing ? 'pointer' : 'not-allowed'
              }}>
                {placing ? 'Placing Order...' : '🎉 Place Order'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}