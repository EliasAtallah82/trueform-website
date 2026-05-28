'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function TailorCatalog() {
  const [user, setUser] = useState(null)
  const [items, setItems] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [newItem, setNewItem] = useState({
    name: '', description: '', category: '', gender: '',
    occasion: '', modesty_level: '', fabrics: '', colors: '',
    price: '', turnaround_days: ''
  })

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        const { data: catalogItems } = await supabase
          .from('catalog')
          .select('*')
          .eq('tailor_id', data.user.id)
          .order('created_at', { ascending: false })
        setItems(catalogItems || [])
      }
    }
    init()
  }, [])

  const generateAIPrompt = (item) => {
    const parts = [
      'Professional fashion photography',
      item.name,
      item.category,
      item.gender && `for ${item.gender}`,
      item.colors && `in ${item.colors}`,
      item.fabrics && `made of ${item.fabrics}`,
      item.modesty_level && `${item.modesty_level} style`,
      item.description,
      'front view',
      'white background',
      'studio lighting',
      'high quality commercial fashion photography',
      'no model',
      'flat lay or mannequin'
    ].filter(Boolean)
    return parts.join(', ')
  }

  const copyPrompt = (item) => {
    navigator.clipboard.writeText(generateAIPrompt(item))
    alert('✅ AI prompt copied! Paste it into Midjourney or DALL-E to generate photos')
  }

  const calcPricing = (price) => {
    const selling = parseFloat(price) || 0
    const vat = selling - selling / 1.05
    const net = selling / 1.05
    const trueformFee = net * 0.15
    const tailorCut = net * 0.85
    return {
      selling: selling.toFixed(2),
      vat: vat.toFixed(2),
      net: net.toFixed(2),
      trueformFee: trueformFee.toFixed(2),
      tailorCut: tailorCut.toFixed(2)
    }
  }

  const handleSave = async () => {
    if (!newItem.name || !newItem.category || !newItem.price) {
      alert('Please fill in name, category and price!')
      return
    }
    setSaving(true)
    const aiPrompt = generateAIPrompt(newItem)
    const { data, error } = await supabase.from('catalog').insert({
      ...newItem,
      tailor_id: user.id,
      price: parseFloat(newItem.price),
      turnaround_days: parseInt(newItem.turnaround_days) || 7,
      status: 'pending',
      is_active: false,
      ai_prompt: aiPrompt
    }).select()

    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    if (data) {
      setItems([data[0], ...items])
      setShowAddForm(false)
      setNewItem({
        name: '', description: '', category: '', gender: '',
        occasion: '', modesty_level: '', fabrics: '', colors: '',
        price: '', turnaround_days: ''
      })
      alert('✅ Item submitted for TrueForm approval!')
    }
    setSaving(false)
  }

  const deleteItem = async (id, status) => {
    if (status === 'approved') {
      alert('Approved items cannot be deleted. Please contact TrueForm support.')
      return
    }
    if (!confirm('Are you sure you want to delete this item?')) return
    await supabase.from('catalog').delete().eq('id', id)
    setItems(items.filter(item => item.id !== id))
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

  const pricing = newItem.price ? calcPricing(newItem.price) : null

  const filteredItems = items.filter(item => {
    if (activeTab === 'all') return true
    return item.status === activeTab
  })

  const getStatusBadge = (status) => {
    const styles = {
      pending: { backgroundColor: '#fef3c7', color: '#92400e' },
      approved: { backgroundColor: '#dcfce7', color: '#166534' },
      rejected: { backgroundColor: '#fee2e2', color: '#991b1b' }
    }
    const labels = { pending: '⏳ Pending', approved: '✅ Approved', rejected: '❌ Rejected' }
    return (
      <span style={{ ...styles[status], fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 'bold' }}>
        {labels[status]}
      </span>
    )
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f0eb' }}>
      <nav style={{
        backgroundColor: '#1a1a1a', padding: '16px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm — Tailor</h1>
        <a href="/dashboard/tailor" style={{ color: 'white', fontSize: '14px' }}>← Back to Dashboard</a>
      </nav>

      <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>👔 My Catalog Items</h2>
            <p style={{ color: '#888', fontSize: '14px' }}>{items.length} items submitted</p>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{
            padding: '12px 24px', backgroundColor: '#1a1a1a', color: 'white',
            border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold'
          }}>
            {showAddForm ? '✕ Cancel' : '➕ Add Item'}
          </button>
        </div>

        {/* Info Banner */}
        <div style={{
          backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: '12px', padding: '16px', marginBottom: '24px',
          fontSize: '14px', color: '#1e40af'
        }}>
          💡 Items you submit go to TrueForm for approval before appearing to customers.
          The more items you list, the more orders you can receive!
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { key: 'all', label: `All (${items.length})` },
            { key: 'pending', label: `Pending (${items.filter(i => i.status === 'pending').length})` },
            { key: 'approved', label: `Approved (${items.filter(i => i.status === 'approved').length})` },
            { key: 'rejected', label: `Rejected (${items.filter(i => i.status === 'rejected').length})` },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
              backgroundColor: activeTab === tab.key ? '#1a1a1a' : 'white',
              color: activeTab === tab.key ? 'white' : '#555',
              border: activeTab === tab.key ? 'none' : '1px solid #ddd'
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Add Item Form */}
        {showAddForm && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Add New Item</h3>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
              Fill in the details — we'll generate an AI photo prompt for you!
            </p>

            {/* Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Item Name *</label>
              <input value={newItem.name}
                onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Classic Navy Linen Shirt" style={inputStyle} />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Description</label>
              <textarea value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this item in detail..." rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {/* Category + Gender */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Category *</label>
                <select value={newItem.category}
                  onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))} style={selectStyle}>
                  <option value="">Select category</option>
                  <option value="Shirt / Top">Shirt / Top</option>
                  <option value="Trousers / Pants">Trousers / Pants</option>
                  <option value="Suit / Blazer">Suit / Blazer</option>
                  <option value="Full Outfit">Full Outfit</option>
                  <option value="Thobe / Kandura">Thobe / Kandura</option>
                  <option value="Abaya / Modest Wear">Abaya / Modest Wear</option>
                  <option value="Dress / Skirt">Dress / Skirt</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Gender</label>
                <select value={newItem.gender}
                  onChange={(e) => setNewItem(prev => ({ ...prev, gender: e.target.value }))} style={selectStyle}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="unisex">Unisex</option>
                  <option value="kids">Kids</option>
                </select>
              </div>
            </div>

            {/* Occasion + Modesty */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Occasion</label>
                <input value={newItem.occasion}
                  onChange={(e) => setNewItem(prev => ({ ...prev, occasion: e.target.value }))}
                  placeholder="e.g. Work, Wedding, Casual" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Modesty Level</label>
                <select value={newItem.modesty_level}
                  onChange={(e) => setNewItem(prev => ({ ...prev, modesty_level: e.target.value }))} style={selectStyle}>
                  <option value="">Select modesty</option>
                  <option value="Fully Covered">Fully Covered</option>
                  <option value="Modest & Elegant">Modest & Elegant</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Fashion Forward">Fashion Forward</option>
                </select>
              </div>
            </div>

            {/* Fabrics + Colors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Available Fabrics</label>
                <input value={newItem.fabrics}
                  onChange={(e) => setNewItem(prev => ({ ...prev, fabrics: e.target.value }))}
                  placeholder="e.g. Linen, Cotton, Wool" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Available Colors</label>
                <input value={newItem.colors}
                  onChange={(e) => setNewItem(prev => ({ ...prev, colors: e.target.value }))}
                  placeholder="e.g. Navy, White, Black" style={inputStyle} />
              </div>
            </div>

            {/* Price */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                Selling Price — VAT Inclusive (AED) *
              </label>
              <input type="number" value={newItem.price}
                onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                placeholder="e.g. 250" style={{ ...inputStyle, maxWidth: '200px' }} />

              {pricing && (
                <div style={{
                  marginTop: '12px', padding: '16px', backgroundColor: '#f5f0eb',
                  borderRadius: '10px', maxWidth: '320px'
                }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '10px' }}>💰 Your Earnings Breakdown</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                    <span style={{ color: '#555' }}>Selling Price (incl. VAT):</span>
                    <span style={{ fontWeight: 'bold' }}>AED {pricing.selling}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                    <span style={{ color: '#555' }}>VAT (5%):</span>
                    <span style={{ color: '#dc2626' }}>- AED {pricing.vat}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', borderTop: '1px solid #ddd', paddingTop: '6px' }}>
                    <span style={{ color: '#555' }}>Net Price (excl. VAT):</span>
                    <span>AED {pricing.net}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                    <span style={{ color: '#555' }}>TrueForm Fee (15%):</span>
                    <span style={{ color: '#dc2626' }}>- AED {pricing.trueformFee}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: '1px solid #ddd', paddingTop: '6px' }}>
                    <span style={{ fontWeight: 'bold' }}>You receive (excl. VAT):</span>
                    <span style={{ fontWeight: 'bold', color: '#16a34a' }}>AED {pricing.tailorCut}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Turnaround */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Turnaround (days)</label>
              <input type="number" value={newItem.turnaround_days}
                onChange={(e) => setNewItem(prev => ({ ...prev, turnaround_days: e.target.value }))}
                placeholder="e.g. 7" style={{ ...inputStyle, maxWidth: '200px' }} />
            </div>

            {/* AI Prompt Preview */}
            {(newItem.name || newItem.category) && (
              <div style={{
                marginBottom: '24px', padding: '16px', backgroundColor: '#1a1a1a',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>
                  🤖 Auto-generated AI photo prompt:
                </div>
                <div style={{ fontSize: '12px', color: '#fff', marginBottom: '12px', lineHeight: '1.6' }}>
                  {generateAIPrompt(newItem)}
                </div>
                <button onClick={() => copyPrompt(newItem)} style={{
                  padding: '8px 16px', backgroundColor: 'white', color: '#1a1a1a',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 'bold'
                }}>
                  📋 Copy AI Prompt
                </button>
              </div>
            )}

            <button onClick={handleSave} disabled={saving} style={{
              width: '100%', padding: '14px', backgroundColor: '#1a1a1a', color: 'white',
              border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
            }}>
              {saving ? 'Submitting...' : '📤 Submit for Approval'}
            </button>
          </div>
        )}

        {/* Items List */}
        {filteredItems.length === 0 ? (
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', padding: '60px',
            textAlign: 'center', color: '#888'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👔</div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>No items here</h3>
            <p>{activeTab === 'all' ? 'Click "Add Item" to start listing your work!' : `No ${activeTab} items yet`}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredItems.map((item) => (
              <div key={item.id} style={{
                backgroundColor: 'white', borderRadius: '16px', padding: '24px',
                border: '1px solid #e0e0e0',
                opacity: item.status === 'rejected' ? 0.8 : 1
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ fontWeight: 'bold', fontSize: '18px' }}>{item.name}</h3>
                      {getStatusBadge(item.status)}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {item.category && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.category}</span>}
                      {item.gender && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.gender}</span>}
                      {item.modesty_level && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.modesty_level}</span>}
                    </div>
                    {item.description && <p style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>{item.description}</p>}
                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#555' }}>
                      <span>💰 AED {item.price}</span>
                      <span>⏱️ {item.turnaround_days} days</span>
                      <span style={{ color: '#16a34a', fontWeight: 'bold' }}>
                        You get: AED {(item.price / 1.05 * 0.85).toFixed(2)}
                      </span>
                    </div>

                    {/* Rejection reason */}
                    {item.status === 'rejected' && item.rejection_reason && (
                      <div style={{
                        marginTop: '12px', padding: '12px', backgroundColor: '#fee2e2',
                        borderRadius: '8px', fontSize: '13px', color: '#991b1b'
                      }}>
                        ❌ Rejection reason: {item.rejection_reason}
                      </div>
                    )}

                    {/* AI Prompt */}
                    {item.status === 'pending' && (
                      <div style={{ marginTop: '12px' }}>
                        <button onClick={() => copyPrompt(item)} style={{
                          padding: '6px 12px', backgroundColor: '#1a1a1a', color: 'white',
                          border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                        }}>
                          📋 Copy AI Photo Prompt
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                    {item.status !== 'approved' && (
                      <button onClick={() => deleteItem(item.id, item.status)} style={{
                        padding: '8px 12px', backgroundColor: '#fee2e2', color: '#dc2626',
                        border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px'
                      }}>Delete</button>
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