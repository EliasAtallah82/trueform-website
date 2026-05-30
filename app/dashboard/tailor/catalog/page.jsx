'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import * as XLSX from 'xlsx'

export default function TailorCatalog() {
  const [user, setUser] = useState(null)
  const [myItems, setMyItems] = useState([])
  const [approvedItems, setApprovedItems] = useState([])
  const [mode, setMode] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [editingPrice, setEditingPrice] = useState({})
  const [newPrices, setNewPrices] = useState({})

  const [newItem, setNewItem] = useState({
    name: '', description: '', category: '', gender: '',
    occasion: '', modesty_level: '', fabrics: '', colors: '',
    price: '', turnaround_days: ''
  })

  const [bulkItems, setBulkItems] = useState([])
  const [bulkErrors, setBulkErrors] = useState([])
  const [bulkSubmitted, setBulkSubmitted] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        fetchMyItems(data.user.id)
        fetchApprovedItems(data.user.id)
      }
    }
    init()
  }, [])

  const fetchMyItems = async (userId) => {
    const { data } = await supabase
      .from('catalog')
      .select('*')
      .eq('tailor_id', userId)
      .order('created_at', { ascending: false })
    setMyItems(data || [])
  }

  const fetchApprovedItems = async (userId) => {
    const { data: tailorItems } = await supabase
      .from('tailor_catalog_items')
      .select('*')
      .eq('tailor_id', userId)
      .eq('status', 'approved')

    if (!tailorItems || tailorItems.length === 0) { setApprovedItems([]); return }

    const catalogIds = tailorItems.map(t => t.catalog_id)
    const { data: catalogItems } = await supabase
      .from('catalog')
      .select('*')
      .in('id', catalogIds)

    const merged = tailorItems.map(t => ({
      ...t,
      catalog: catalogItems?.find(c => c.id === t.catalog_id) || null
    }))

    setApprovedItems(merged)
  }

  const generateAIPrompt = (item) => {
    return [
      'Professional fashion photography',
      item.name, item.category,
      item.gender && `for ${item.gender}`,
      item.colors && `in ${item.colors}`,
      item.fabrics && `made of ${item.fabrics}`,
      item.modesty_level && `${item.modesty_level} style`,
      item.description,
      'front view', 'white background', 'studio lighting',
      'high quality commercial fashion photography', 'no model', 'flat lay or mannequin'
    ].filter(Boolean).join(', ')
  }

  const calcPricing = (price) => {
    const selling = parseFloat(price) || 0
    const net = selling / 1.05
    return {
      selling: selling.toFixed(2),
      vat: (selling - net).toFixed(2),
      net: net.toFixed(2),
      trueformFee: (net * 0.15).toFixed(2),
      tailorCut: (net * 0.85).toFixed(2)
    }
  }

  const handleSaveIndividual = async () => {
    if (!newItem.name || !newItem.category || !newItem.price) {
      alert('Please fill in item name, category and price!')
      return
    }
    setSaving(true)
    const { data, error } = await supabase.from('catalog').insert({
      ...newItem,
      tailor_id: user.id,
      price: parseFloat(newItem.price),
      turnaround_days: parseInt(newItem.turnaround_days) || 7,
      status: 'pending',
      is_active: false,
      ai_prompt: generateAIPrompt(newItem),
      created_by: 'tailor'
    }).select()

    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    if (data) {
      setMyItems([data[0], ...myItems])
      setMode(null)
      setNewItem({
        name: '', description: '', category: '', gender: '',
        occasion: '', modesty_level: '', fabrics: '', colors: '',
        price: '', turnaround_days: ''
      })
      alert('✅ Item submitted for TrueForm approval!')
    }
    setSaving(false)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' })
      const ws = wb.Sheets['Items']
      if (!ws) { alert('Could not find the "Items" sheet. Please use the TrueForm template.'); return }
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      const parsed = []
      rows.forEach((row, i) => {
        const name = String(row['Item Name *'] || '').trim()
        const category = String(row['Category *'] || '').trim()
        const price = parseFloat(row['Price AED (VAT incl) *']) || 0
        const rowErrors = []
        if (!name) rowErrors.push('Item Name is required')
        if (!category) rowErrors.push('Category is required')
        if (!price || price <= 0) rowErrors.push('Price must be greater than 0')
        const item = {
          name, description: String(row['Description'] || '').trim(),
          category, gender: String(row['Gender'] || '').trim(),
          occasion: String(row['Occasion'] || '').trim(),
          modesty_level: String(row['Modesty Level'] || '').trim(),
          fabrics: String(row['Available Fabrics'] || '').trim(),
          colors: String(row['Available Colors'] || '').trim(),
          price, turnaround_days: parseInt(row['Turnaround Days']) || 7,
          _errors: rowErrors, _rowNum: i + 2
        }
        if (name || category || price) parsed.push(item)
      })
      setBulkErrors(parsed.filter(r => r._errors.length > 0))
      setBulkItems(parsed.filter(r => r._errors.length === 0))
      setBulkSubmitted(false)
    }
    reader.readAsBinaryString(file)
  }

  const handleBulkSubmit = async () => {
    if (bulkItems.length === 0) { alert('No valid items to submit!'); return }
    setSaving(true)
    const toInsert = bulkItems.map(item => ({
      name: item.name, description: item.description,
      category: item.category, gender: item.gender,
      occasion: item.occasion, modesty_level: item.modesty_level,
      fabrics: item.fabrics, colors: item.colors,
      price: item.price, turnaround_days: item.turnaround_days,
      tailor_id: user.id, status: 'pending', is_active: false,
      ai_prompt: generateAIPrompt(item), created_by: 'tailor'
    }))
    const { data, error } = await supabase.from('catalog').insert(toInsert).select()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    if (data) {
      setMyItems([...data, ...myItems])
      setBulkSubmitted(true)
      setSaving(false)
      alert(`✅ ${data.length} items submitted for TrueForm approval!`)
    }
  }

  const handleUpdatePrice = async (invId) => {
    const price = parseFloat(newPrices[invId])
    if (!price || price <= 0) { alert('Please enter a valid price!'); return }
    await supabase.from('tailor_catalog_items').update({
      tailor_price: price,
      price_updated_at: new Date().toISOString()
    }).eq('id', invId)
    setApprovedItems(approvedItems.map(i =>
      i.id === invId ? { ...i, tailor_price: price } : i
    ))
    setEditingPrice({ ...editingPrice, [invId]: false })
    setNewPrices({ ...newPrices, [invId]: '' })
    alert('✅ Price updated!')
  }

  const deleteItem = async (id, status) => {
    if (status === 'approved') { alert('Approved items cannot be deleted.'); return }
    if (!confirm('Delete this item?')) return
    await supabase.from('catalog').delete().eq('id', id)
    setMyItems(myItems.filter(item => item.id !== id))
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

  const filteredMyItems = activeTab === 'all' ? myItems : myItems.filter(i => i.status === activeTab)

  const getStatusBadge = (status) => {
    const map = {
      pending: { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending' },
      approved: { bg: '#dcfce7', color: '#166534', label: '✅ Approved' },
      rejected: { bg: '#fee2e2', color: '#991b1b', label: '❌ Rejected' }
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
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm — Tailor</h1>
        <a href="/dashboard/tailor" style={{ color: 'white', fontSize: '14px' }}>← Back to Dashboard</a>
      </nav>

      <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>

        {/* ── APPROVED ADMIN ITEMS ── */}
        {approvedItems.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '4px' }}>
              👑 TrueForm Range — My Active Items
            </h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>
              Items from TrueForm's catalog that you are approved to fulfill
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {approvedItems.map((inv) => {
                const item = inv.catalog
                if (!item) return null
                const isEditing = editingPrice[inv.id]

                return (
                  <div key={inv.id} style={{
                    backgroundColor: 'white', borderRadius: '16px',
                    border: '2px solid #dcfce7', overflow: 'hidden'
                  }}>
                    <div style={{ display: 'flex' }}>
                      {/* Photo */}
                      <div style={{ width: '120px', minHeight: '120px', backgroundColor: '#f5f0eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.photo_main
                          ? <img src={item.photo_main} alt={item.name} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                          : <div style={{ fontSize: '36px' }}>👔</div>
                        }
                      </div>

                      {/* Content */}
                      <div style={{ padding: '20px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <h3 style={{ fontWeight: 'bold', fontSize: '16px' }}>{item.name}</h3>
                              <span style={{ backgroundColor: '#dcfce7', color: '#166534', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold' }}>✅ Active</span>
                              <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '11px', padding: '2px 8px', borderRadius: '20px' }}>👑 TrueForm Range</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {item.category && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px' }}>{item.category}</span>}
                              {item.gender && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px' }}>{item.gender}</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Your payment per order</div>
                            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#16a34a' }}>AED {inv.tailor_price}</div>
                          </div>
                        </div>

                        {item.description && (
                          <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>{item.description}</p>
                        )}

                        <div style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
                          ⏱️ Turnaround: <strong>{item.turnaround_days} days</strong>
                        </div>

                        {/* Update price */}
                        {!isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button onClick={() => setEditingPrice({ ...editingPrice, [inv.id]: true })} style={{
                              padding: '8px 16px', backgroundColor: 'white', color: '#1a1a1a',
                              border: '2px solid #1a1a1a', borderRadius: '8px', cursor: 'pointer',
                              fontWeight: 'bold', fontSize: '13px'
                            }}>✏️ Update My Price</button>
                            <span style={{ fontSize: '12px', color: '#888' }}>Lower price = priority in order queue</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{ position: 'relative', maxWidth: '160px' }}>
                              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#555', fontWeight: 'bold' }}>AED</span>
                              <input type="number"
                                value={newPrices[inv.id] || ''}
                                onChange={(e) => setNewPrices({ ...newPrices, [inv.id]: e.target.value })}
                                placeholder={inv.tailor_price}
                                style={{ width: '100%', padding: '10px 10px 10px 48px', borderRadius: '8px', border: '2px solid #1a1a1a', fontSize: '15px', fontWeight: 'bold', boxSizing: 'border-box' }}
                              />
                            </div>
                            <button onClick={() => handleUpdatePrice(inv.id)} style={{
                              padding: '10px 20px', backgroundColor: '#1a1a1a', color: 'white',
                              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                            }}>Update</button>
                            <button onClick={() => setEditingPrice({ ...editingPrice, [inv.id]: false })} style={{
                              padding: '10px 16px', backgroundColor: '#f5f5f5', color: '#555',
                              border: 'none', borderRadius: '8px', cursor: 'pointer'
                            }}>Cancel</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── MY OWN ITEMS ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '4px' }}>✂️ My Own Items</h2>
              <p style={{ color: '#888', fontSize: '14px' }}>{myItems.length} items submitted</p>
            </div>
            {!mode && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setMode('bulk')} style={{
                  padding: '10px 16px', backgroundColor: 'white', color: '#1a1a1a',
                  border: '2px solid #1a1a1a', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'
                }}>📊 Bulk Upload</button>
                <button onClick={() => setMode('individual')} style={{
                  padding: '10px 16px', backgroundColor: '#1a1a1a', color: 'white',
                  border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'
                }}>➕ Add Item</button>
              </div>
            )}
            {mode && (
              <button onClick={() => { setMode(null); setBulkItems([]); setBulkErrors([]) }} style={{
                padding: '10px 16px', backgroundColor: '#fee2e2', color: '#dc2626',
                border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold'
              }}>✕ Cancel</button>
            )}
          </div>

          {/* Info Banner */}
          <div style={{
            backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: '12px', padding: '16px', marginBottom: '24px',
            fontSize: '14px', color: '#1e40af'
          }}>
            💡 Items you submit go to TrueForm for review. Once approved, AI photos will be generated automatically.
          </div>

          {/* INDIVIDUAL FORM */}
          {mode === 'individual' && (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Add New Item</h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Item Name *</label>
                <input value={newItem.name} onChange={(e) => setNewItem(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Classic Navy Linen Shirt" style={inputStyle} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Description</label>
                <textarea value={newItem.description} onChange={(e) => setNewItem(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe this item in detail..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Category *</label>
                  <select value={newItem.category} onChange={(e) => setNewItem(p => ({ ...p, category: e.target.value }))} style={selectStyle}>
                    <option value="">Select category</option>
                    {['Shirt / Top','Trousers / Pants','Suit / Blazer','Full Outfit','Thobe / Kandura','Abaya / Modest Wear','Dress / Skirt','Accessories'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Gender</label>
                  <select value={newItem.gender} onChange={(e) => setNewItem(p => ({ ...p, gender: e.target.value }))} style={selectStyle}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unisex">Unisex</option>
                    <option value="kids">Kids</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Occasion</label>
                  <input value={newItem.occasion} onChange={(e) => setNewItem(p => ({ ...p, occasion: e.target.value }))}
                    placeholder="e.g. Work, Wedding, Casual" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Modesty Level</label>
                  <select value={newItem.modesty_level} onChange={(e) => setNewItem(p => ({ ...p, modesty_level: e.target.value }))} style={selectStyle}>
                    <option value="">Select modesty</option>
                    <option value="Fully Covered">Fully Covered</option>
                    <option value="Modest & Elegant">Modest & Elegant</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Fashion Forward">Fashion Forward</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Available Fabrics</label>
                  <input value={newItem.fabrics} onChange={(e) => setNewItem(p => ({ ...p, fabrics: e.target.value }))}
                    placeholder="e.g. Linen, Cotton, Wool" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Available Colors</label>
                  <input value={newItem.colors} onChange={(e) => setNewItem(p => ({ ...p, colors: e.target.value }))}
                    placeholder="e.g. Navy, White, Black" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Selling Price — VAT Inclusive (AED) *</label>
                  <input type="number" value={newItem.price} onChange={(e) => setNewItem(p => ({ ...p, price: e.target.value }))}
                    placeholder="e.g. 250" style={inputStyle} />
                  {pricing && (
                    <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#f5f0eb', borderRadius: '10px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#555' }}>VAT (5%):</span>
                        <span style={{ color: '#dc2626' }}>- AED {pricing.vat}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#555' }}>TrueForm fee (15%):</span>
                        <span style={{ color: '#dc2626' }}>- AED {pricing.trueformFee}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', paddingTop: '6px', marginTop: '4px' }}>
                        <span style={{ fontWeight: 'bold' }}>You receive:</span>
                        <span style={{ fontWeight: 'bold', color: '#16a34a' }}>AED {pricing.tailorCut}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Turnaround (days)</label>
                  <input type="number" value={newItem.turnaround_days} onChange={(e) => setNewItem(p => ({ ...p, turnaround_days: e.target.value }))}
                    placeholder="e.g. 7" style={inputStyle} />
                </div>
              </div>

              <button onClick={handleSaveIndividual} disabled={saving} style={{
                width: '100%', padding: '14px', backgroundColor: '#1a1a1a', color: 'white',
                border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
              }}>
                {saving ? 'Submitting...' : '📤 Submit for Approval'}
              </button>
            </div>
          )}

          {/* BULK UPLOAD */}
          {mode === 'bulk' && (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>📊 Bulk Upload</h3>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>Upload up to 50 items at once using the Excel template</p>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#1a1a1a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold', flexShrink: 0 }}>1</div>
                  <span style={{ fontWeight: 'bold', fontSize: '15px' }}>Download the template</span>
                </div>
                <div style={{ marginLeft: '40px' }}>
                  <a href="/trueform_bulk_upload_template.xlsx" download style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px', backgroundColor: '#f5f0eb', color: '#1a1a1a',
                    borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold',
                    border: '1px solid #1a1a1a'
                  }}>📥 Download Excel Template</a>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#1a1a1a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold', flexShrink: 0 }}>2</div>
                  <span style={{ fontWeight: 'bold', fontSize: '15px' }}>Upload your filled template</span>
                </div>
                <div style={{ marginLeft: '40px' }}>
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                    padding: '12px 24px', backgroundColor: '#1a1a1a', color: 'white',
                    borderRadius: '8px', fontSize: '14px', fontWeight: 'bold'
                  }}>
                    📂 Choose Excel File
                    <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />
                  </label>
                </div>
              </div>

              {bulkErrors.length > 0 && (
                <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#fee2e2', borderRadius: '12px' }}>
                  <div style={{ fontWeight: 'bold', color: '#991b1b', marginBottom: '8px' }}>⚠️ {bulkErrors.length} row(s) have errors and will be skipped:</div>
                  {bulkErrors.map((row, i) => (
                    <div key={i} style={{ fontSize: '13px', color: '#991b1b', marginBottom: '4px' }}>
                      Row {row._rowNum}: {row.name || '(no name)'} — {row._errors.join(', ')}
                    </div>
                  ))}
                </div>
              )}

              {bulkItems.length > 0 && !bulkSubmitted && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#1a1a1a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold', flexShrink: 0 }}>3</div>
                    <span style={{ fontWeight: 'bold', fontSize: '15px' }}>Review {bulkItems.length} items ready to submit</span>
                  </div>
                  <div style={{ marginLeft: '40px' }}>
                    <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#1a1a1a', color: 'white' }}>
                            {['#', 'Name', 'Category', 'Gender', 'Price (AED)', 'Turnaround', 'Your Cut'].map(h => (
                              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bulkItems.map((item, i) => (
                            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #e0e0e0' }}>
                              <td style={{ padding: '10px 12px', color: '#888' }}>{i + 1}</td>
                              <td style={{ padding: '10px 12px', fontWeight: '500' }}>{item.name}</td>
                              <td style={{ padding: '10px 12px' }}>{item.category}</td>
                              <td style={{ padding: '10px 12px' }}>{item.gender || '—'}</td>
                              <td style={{ padding: '10px 12px' }}>{item.price}</td>
                              <td style={{ padding: '10px 12px' }}>{item.turnaround_days} days</td>
                              <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 'bold' }}>AED {(item.price / 1.05 * 0.85).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: '#f5f0eb', borderRadius: '12px', marginBottom: '20px' }}>
                      <div style={{ fontSize: '32px' }}>🤖</div>
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>AI Photos will be generated after approval</div>
                        <div style={{ fontSize: '13px', color: '#555' }}>Once TrueForm approves your items, AI photos will be automatically created for each one.</div>
                      </div>
                    </div>

                    <button onClick={handleBulkSubmit} disabled={saving} style={{
                      width: '100%', padding: '14px', backgroundColor: '#1a1a1a', color: 'white',
                      border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
                    }}>
                      {saving ? `Submitting ${bulkItems.length} items...` : `📤 Submit All ${bulkItems.length} Items for Approval`}
                    </button>
                  </div>
                </div>
              )}

              {bulkSubmitted && (
                <div style={{ textAlign: 'center', padding: '32px', backgroundColor: '#dcfce7', borderRadius: '12px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                  <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#166534', marginBottom: '8px' }}>
                    {bulkItems.length} items submitted successfully!
                  </div>
                  <div style={{ fontSize: '14px', color: '#166534', marginBottom: '20px' }}>
                    TrueForm will review and approve your items.
                  </div>
                  <button onClick={() => { setMode(null); setBulkItems([]); setBulkErrors([]) }} style={{
                    padding: '10px 24px', backgroundColor: '#1a1a1a', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                  }}>View My Items</button>
                </div>
              )}
            </div>
          )}

          {/* TABS */}
          {!mode && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              {[
                { key: 'all', label: `All (${myItems.length})` },
                { key: 'pending', label: `Pending (${myItems.filter(i => i.status === 'pending').length})` },
                { key: 'approved', label: `Approved (${myItems.filter(i => i.status === 'approved').length})` },
                { key: 'rejected', label: `Rejected (${myItems.filter(i => i.status === 'rejected').length})` },
              ].map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                  padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                  backgroundColor: activeTab === tab.key ? '#1a1a1a' : 'white',
                  color: activeTab === tab.key ? 'white' : '#555',
                  border: activeTab === tab.key ? 'none' : '1px solid #ddd'
                }}>{tab.label}</button>
              ))}
            </div>
          )}

          {/* MY ITEMS LIST */}
          {!mode && (
            filteredMyItems.length === 0 ? (
              <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '60px', textAlign: 'center', color: '#888' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👔</div>
                <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>No items here</h3>
                <p>{activeTab === 'all' ? 'Use "Add Item" or "Bulk Upload" to start listing your work!' : `No ${activeTab} items yet`}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredMyItems.map((item) => (
                  <div key={item.id} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e0e0e0' }}>
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
                          <span style={{ color: '#16a34a', fontWeight: 'bold' }}>You get: AED {(item.price / 1.05 * 0.85).toFixed(2)}</span>
                        </div>
                        {item.status === 'rejected' && item.rejection_reason && (
                          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fee2e2', borderRadius: '8px', fontSize: '13px', color: '#991b1b' }}>
                            ❌ Rejection reason: {item.rejection_reason}
                          </div>
                        )}
                        {item.status === 'approved' && !item.photo_main && (
                          <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: '8px', fontSize: '13px', color: '#1e40af' }}>
                            🤖 AI photos being generated by TrueForm...
                          </div>
                        )}
                        {item.photo_main && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '12px' }}>
                            {[item.photo_main, item.photo_back, item.photo_detail, item.photo_model].filter(Boolean).map((photo, i) => (
                              <img key={i} src={photo} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ marginLeft: '16px' }}>
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
            )
          )}
        </div>
      </div>
    </main>
  )
}