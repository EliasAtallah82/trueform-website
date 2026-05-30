'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import * as XLSX from 'xlsx'

const SKILLS = [
  'Suits & Blazers', 'Shirts & Tops', 'Trousers & Pants',
  'Thobes & Kanduras', 'Abayas & Modest Wear', 'Dresses & Skirts',
  'Full Outfits', 'Alterations', 'Embroidery', 'Monogramming',
  'Lining Work', 'Pattern Making', 'Bespoke Tailoring',
  'Kids Clothing', 'Wedding Wear', 'Traditional Wear'
]

export default function AdminCatalog() {
  const [user, setUser] = useState(null)
  const [items, setItems] = useState([])
  const [mode, setMode] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState({})
  const [sendingToTailors, setSendingToTailors] = useState({})
  const [activeFilter, setActiveFilter] = useState('all')
  const [bulkItems, setBulkItems] = useState([])
  const [bulkErrors, setBulkErrors] = useState([])
  const [bulkSubmitted, setBulkSubmitted] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)

  const [newItem, setNewItem] = useState({
    name: '', description: '', category: '', gender: '',
    occasion: '', modesty_level: '', fabrics: '', colors: '',
    price: '', turnaround_days: '', is_active: false,
    photo_main: '', photo_back: '', photo_detail: '', photo_model: '',
    required_skills: []
  })

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        fetchItems()
      }
    }
    init()
  }, [])

  const fetchItems = async () => {
    // First fetch catalog items
    const { data: catalogData } = await supabase
      .from('catalog')
      .select('*')
      .order('created_at', { ascending: false })

    if (!catalogData) { setItems([]); return }

    // Then fetch tailor_catalog_items separately
    const { data: tailorItems } = await supabase
      .from('tailor_catalog_items')
      .select('id, catalog_id, status, tailor_id')

    // Merge them
    const merged = catalogData.map(item => ({
      ...item,
      tailor_catalog_items: (tailorItems || []).filter(t => t.catalog_id === item.id)
    }))

    setItems(merged)
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
      trueformMargin: (net * 0.40).toFixed(2),
      tailorPayment: (net * 0.60).toFixed(2)
    }
  }

  const getItemStatus = (item) => {
    const hasPhotos = !!item.photo_main
    const tailorItems = item.tailor_catalog_items || []
    const sentToTailors = tailorItems.length > 0
    const hasApprovedTailor = tailorItems.some(t => t.status === 'approved')
    if (item.is_active && hasApprovedTailor) return 'live'
    if (hasApprovedTailor) return 'approved'
    if (sentToTailors) return 'sent'
    if (hasPhotos) return 'ready'
    return 'draft'
  }

  const getStatusBadge = (item) => {
    const status = getItemStatus(item)
    const map = {
      draft: { bg: '#f3f4f6', color: '#6b7280', label: '📝 Draft — Upload Photos' },
      ready: { bg: '#fef3c7', color: '#92400e', label: '📸 Ready — Send to Tailors' },
      sent: { bg: '#eff6ff', color: '#1e40af', label: '📬 Sent to Tailors' },
      approved: { bg: '#f0fdf4', color: '#166534', label: '✅ Tailor Approved' },
      live: { bg: '#dcfce7', color: '#166534', label: '🟢 Live' },
    }
    const s = map[status]
    return (
      <span style={{ backgroundColor: s.bg, color: s.color, fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 'bold' }}>
        {s.label}
      </span>
    )
  }

  const sendToAllTailors = async (item) => {
    if (!item.photo_main) {
      alert('Please upload at least the main photo before sending to tailors!')
      return
    }
    if (!confirm(`Send "${item.name}" to all tailors for pricing?`)) return
    setSendingToTailors(prev => ({ ...prev, [item.id]: true }))
    const { data: tailors } = await supabase.from('tailor_profiles').select('user_id')
    if (!tailors || tailors.length === 0) {
      alert('No tailors found on the platform yet!')
      setSendingToTailors(prev => ({ ...prev, [item.id]: false }))
      return
    }
    const { data: existing } = await supabase
      .from('tailor_catalog_items').select('tailor_id').eq('catalog_id', item.id)
    const existingTailorIds = (existing || []).map(e => e.tailor_id)
    const newTailors = tailors.filter(t => !existingTailorIds.includes(t.user_id))
    if (newTailors.length === 0) {
      alert('Already sent to all tailors!')
      setSendingToTailors(prev => ({ ...prev, [item.id]: false }))
      return
    }
    await supabase.from('tailor_catalog_items').insert(
      newTailors.map(tailor => ({
        catalog_id: item.id,
        tailor_id: tailor.user_id,
        status: 'pending'
      }))
    )
    setSendingToTailors(prev => ({ ...prev, [item.id]: false }))
    await fetchItems()
    alert(`✅ "${item.name}" sent to ${newTailors.length} tailor(s) for pricing!`)
  }

  const uploadPhoto = async (file, photoType, itemId) => {
    setUploading(prev => ({ ...prev, [`${itemId}-${photoType}`]: true }))
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${photoType}.${fileExt}`
    const { error } = await supabase.storage.from('catalog-photos').upload(fileName, file)
    if (error) { alert('Upload error: ' + error.message); setUploading(prev => ({ ...prev, [`${itemId}-${photoType}`]: false })); return }
    const { data: urlData } = supabase.storage.from('catalog-photos').getPublicUrl(fileName)
    if (itemId !== 'new') {
      await supabase.from('catalog').update({ [photoType]: urlData.publicUrl }).eq('id', itemId)
      setItems(items.map(i => i.id === itemId ? { ...i, [photoType]: urlData.publicUrl } : i))
    } else {
      setNewItem(prev => ({ ...prev, [photoType]: urlData.publicUrl }))
    }
    setUploading(prev => ({ ...prev, [`${itemId}-${photoType}`]: false }))
  }

  const handleSave = async () => {
    if (!newItem.name || !newItem.category || !newItem.price) {
      alert('Please fill in name, category and price!')
      return
    }
    setSaving(true)
    const { data, error } = await supabase.from('catalog').insert({
      ...newItem,
      required_skills: newItem.required_skills.join(','),
      price: parseFloat(newItem.price),
      turnaround_days: parseInt(newItem.turnaround_days) || 7,
      status: 'approved',
      is_active: false,
      created_by: 'admin',
      ai_prompt: generateAIPrompt(newItem)
    }).select()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    if (data) {
      await fetchItems()
      setMode(null)
      setNewItem({
        name: '', description: '', category: '', gender: '',
        occasion: '', modesty_level: '', fabrics: '', colors: '',
        price: '', turnaround_days: '', is_active: false,
        photo_main: '', photo_back: '', photo_detail: '', photo_model: '',
        required_skills: []
      })
      alert('✅ Item saved as draft! Upload photos then send to tailors.')
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
    setBulkSaving(true)
    const toInsert = bulkItems.map(item => ({
      name: item.name, description: item.description,
      category: item.category, gender: item.gender,
      occasion: item.occasion, modesty_level: item.modesty_level,
      fabrics: item.fabrics, colors: item.colors,
      price: item.price, turnaround_days: item.turnaround_days,
      status: 'approved', is_active: false,
      created_by: 'admin', ai_prompt: generateAIPrompt(item)
    }))
    const { data, error } = await supabase.from('catalog').insert(toInsert).select()
    if (error) { alert('Error: ' + error.message); setBulkSaving(false); return }
    if (data) {
      await fetchItems()
      setBulkSubmitted(true)
      setBulkSaving(false)
      alert(`✅ ${data.length} items saved as drafts! Now upload photos for each item.`)
    }
  }

  const toggleSkill = (skill) => {
    setNewItem(prev => ({
      ...prev,
      required_skills: prev.required_skills.includes(skill)
        ? prev.required_skills.filter(s => s !== skill)
        : [...prev.required_skills, skill]
    }))
  }

  const toggleActive = async (id, currentStatus) => {
    await supabase.from('catalog').update({ is_active: !currentStatus }).eq('id', id)
    setItems(items.map(item => item.id === id ? { ...item, is_active: !currentStatus } : item))
  }

  const deleteItem = async (id) => {
    if (!confirm('Are you sure?')) return
    await supabase.from('catalog').delete().eq('id', id)
    setItems(items.filter(item => item.id !== id))
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }
  const selectStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', backgroundColor: 'white' }
  const pricing = newItem.price ? calcPricing(newItem.price) : null

  const filteredItems = items.filter(item => {
    if (activeFilter === 'all') return true
    return getItemStatus(item) === activeFilter
  })

  const draftCount = items.filter(i => getItemStatus(i) === 'draft').length
  const readyCount = items.filter(i => getItemStatus(i) === 'ready').length
  const sentCount = items.filter(i => getItemStatus(i) === 'sent').length
  const liveCount = items.filter(i => getItemStatus(i) === 'live').length

  const InlinePhotoUpload = ({ item, photoType, label }) => {
    const isUploading = uploading[`${item.id}-${photoType}`]
    return (
      <div style={{
        border: photoType === 'photo_main' ? '2px solid #1a1a1a' : '1px dashed #ddd',
        borderRadius: '8px', padding: '8px', textAlign: 'center',
        backgroundColor: photoType === 'photo_main' ? '#f5f0eb' : 'white'
      }}>
        <div style={{ fontSize: '10px', marginBottom: '4px', fontWeight: photoType === 'photo_main' ? 'bold' : 'normal', color: '#555' }}>
          {label}
        </div>
        {item[photoType] ? (
          <div>
            <img src={item[photoType]} alt={label}
              style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '4px', marginBottom: '4px' }} />
            <label style={{ cursor: 'pointer' }}>
              <span style={{ fontSize: '10px', backgroundColor: '#1a1a1a', color: 'white', padding: '3px 8px', borderRadius: '4px' }}>
                {isUploading ? '...' : 'Replace'}
              </span>
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0], photoType, item.id)} />
            </label>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>📷</div>
            <label style={{ cursor: 'pointer' }}>
              <span style={{ fontSize: '10px', backgroundColor: '#1a1a1a', color: 'white', padding: '3px 8px', borderRadius: '4px' }}>
                {isUploading ? 'Uploading...' : 'Upload'}
              </span>
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0], photoType, item.id)} />
            </label>
          </div>
        )}
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f0eb' }}>
      <nav style={{ backgroundColor: '#1a1a1a', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm — Admin</h1>
        <a href="/dashboard/admin" style={{ color: 'white', fontSize: '14px' }}>← Back to Dashboard</a>
      </nav>

      <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>👔 Catalog Management</h2>
            <p style={{ color: '#888', fontSize: '14px' }}>{items.length} items in catalog</p>
          </div>
          {!mode && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setMode('bulk')} style={{
                padding: '12px 20px', backgroundColor: 'white', color: '#1a1a1a',
                border: '2px solid #1a1a1a', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
              }}>📊 Bulk Upload</button>
              <button onClick={() => setMode('individual')} style={{
                padding: '12px 20px', backgroundColor: '#1a1a1a', color: 'white',
                border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
              }}>➕ Add Item</button>
            </div>
          )}
          {mode && (
            <button onClick={() => { setMode(null); setBulkItems([]); setBulkErrors([]) }} style={{
              padding: '12px 20px', backgroundColor: '#fee2e2', color: '#dc2626',
              border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold'
            }}>✕ Cancel</button>
          )}
        </div>

        {/* Flow banner */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '12px' }}>📋 Item Journey</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { label: '📝 Draft', sub: `${draftCount} items`, color: '#f3f4f6', text: '#6b7280' },
              { label: '→' },
              { label: '📸 Photos Ready', sub: `${readyCount} items`, color: '#fef3c7', text: '#92400e' },
              { label: '→' },
              { label: '📬 Sent to Tailors', sub: `${sentCount} items`, color: '#eff6ff', text: '#1e40af' },
              { label: '→' },
              { label: '🟢 Live', sub: `${liveCount} items`, color: '#dcfce7', text: '#166534' },
            ].map((step, i) => (
              step.label === '→'
                ? <span key={i} style={{ color: '#aaa', fontSize: '18px' }}>→</span>
                : <div key={i} style={{ backgroundColor: step.color, padding: '8px 14px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: step.text }}>{step.label}</div>
                  {step.sub && <div style={{ fontSize: '11px', color: step.text }}>{step.sub}</div>}
                </div>
            ))}
          </div>
        </div>

        {/* INDIVIDUAL FORM */}
        {mode === 'individual' && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Add New Item</h3>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>Item will be saved as draft. Upload photos then send to tailors.</p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Item Name *</label>
              <input value={newItem.name} onChange={(e) => setNewItem(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Classic White Kandura" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Description</label>
              <textarea value={newItem.description} onChange={(e) => setNewItem(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe this item..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Selling Price — VAT Inclusive (AED) *</label>
              <input type="number" value={newItem.price} onChange={(e) => setNewItem(p => ({ ...p, price: e.target.value }))}
                placeholder="e.g. 350" style={{ ...inputStyle, maxWidth: '200px' }} />
              {pricing && (
                <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#f5f0eb', borderRadius: '10px', maxWidth: '320px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '10px' }}>💰 Pricing Breakdown</div>
                  {[
                    { label: 'Selling Price (incl. VAT):', value: `AED ${pricing.selling}`, bold: true },
                    { label: 'VAT (5%):', value: `- AED ${pricing.vat}`, red: true },
                    { label: 'Net Price (excl. VAT):', value: `AED ${pricing.net}`, border: true },
                    { label: 'TrueForm Margin (40%):', value: `AED ${pricing.trueformMargin}`, green: true },
                    { label: 'Max Tailor Payment (60%):', value: `AED ${pricing.tailorPayment}`, border: true },
                  ].map((row) => (
                    <div key={row.label} style={{
                      display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px',
                      borderTop: row.border ? '1px solid #ddd' : 'none', paddingTop: row.border ? '6px' : '0'
                    }}>
                      <span style={{ color: '#555', fontWeight: row.bold ? 'bold' : 'normal' }}>{row.label}</span>
                      <span style={{ color: row.green ? '#16a34a' : row.red ? '#dc2626' : '#1a1a1a', fontWeight: row.bold || row.green ? 'bold' : 'normal' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
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

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Turnaround (days)</label>
              <input type="number" value={newItem.turnaround_days} onChange={(e) => setNewItem(p => ({ ...p, turnaround_days: e.target.value }))}
                placeholder="e.g. 7" style={{ ...inputStyle, maxWidth: '200px' }} />
            </div>

            <button onClick={handleSave} disabled={saving} style={{
              width: '100%', padding: '14px', backgroundColor: '#1a1a1a', color: 'white',
              border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
            }}>
              {saving ? 'Saving...' : '💾 Save as Draft'}
            </button>
          </div>
        )}

        {/* BULK UPLOAD */}
        {mode === 'bulk' && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>📊 Bulk Upload</h3>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>Items saved as drafts. Upload photos then send to tailors.</p>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#1a1a1a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold', flexShrink: 0 }}>1</div>
                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>Download the catalog template</span>
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
                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>Upload your filled catalog</span>
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
                <div style={{ fontWeight: 'bold', color: '#991b1b', marginBottom: '8px' }}>⚠️ {bulkErrors.length} row(s) have errors:</div>
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
                  <span style={{ fontWeight: 'bold', fontSize: '15px' }}>Review {bulkItems.length} items</span>
                </div>
                <div style={{ marginLeft: '40px' }}>
                  <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#1a1a1a', color: 'white' }}>
                          {['#', 'Name', 'Category', 'Gender', 'Price (AED)', 'Turnaround', 'Max Tailor Payment'].map(h => (
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
                            <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 'bold' }}>AED {(item.price / 1.05 * 0.60).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', color: '#92400e' }}>
                    ⚠️ Items will be saved as <strong>drafts</strong> — hidden from customers and tailors until you upload photos and send to tailors manually.
                  </div>
                  <button onClick={handleBulkSubmit} disabled={bulkSaving} style={{
                    width: '100%', padding: '14px', backgroundColor: '#1a1a1a', color: 'white',
                    border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
                  }}>
                    {bulkSaving ? `Saving ${bulkItems.length} items...` : `💾 Save All ${bulkItems.length} Items as Drafts`}
                  </button>
                </div>
              </div>
            )}

            {bulkSubmitted && (
              <div style={{ textAlign: 'center', padding: '32px', backgroundColor: '#dcfce7', borderRadius: '12px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#166534', marginBottom: '8px' }}>
                  {bulkItems.length} items saved as drafts!
                </div>
                <div style={{ fontSize: '14px', color: '#166534', marginBottom: '20px' }}>
                  Next: upload photos for each item, then click "Send to Tailors".
                </div>
                <button onClick={() => { setMode(null); setBulkItems([]); setBulkErrors([]) }} style={{
                  padding: '10px 24px', backgroundColor: '#1a1a1a', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                }}>View Catalog →</button>
              </div>
            )}
          </div>
        )}

        {/* FILTER TABS */}
        {!mode && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: `All (${items.length})` },
              { key: 'draft', label: `📝 Draft (${draftCount})` },
              { key: 'ready', label: `📸 Ready (${readyCount})` },
              { key: 'sent', label: `📬 Sent (${sentCount})` },
              { key: 'live', label: `🟢 Live (${liveCount})` },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveFilter(tab.key)} style={{
                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                backgroundColor: activeFilter === tab.key ? '#1a1a1a' : 'white',
                color: activeFilter === tab.key ? 'white' : '#555',
                border: activeFilter === tab.key ? 'none' : '1px solid #ddd'
              }}>{tab.label}</button>
            ))}
          </div>
        )}

        {/* CATALOG LIST */}
        {!mode && (
          filteredItems.length === 0 ? (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '60px', textAlign: 'center', color: '#888' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👔</div>
              <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>No items here</h3>
              <p>Use "Add Item" or "Bulk Upload" to start building your catalog!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredItems.map((item) => {
                const hasPhotos = !!item.photo_main
                const tailorItems = item.tailor_catalog_items || []
                const sentToTailors = tailorItems.length > 0
                const approvedTailors = tailorItems.filter(t => t.status === 'approved').length

                return (
                  <div key={item.id} style={{
                    backgroundColor: 'white', borderRadius: '16px',
                    border: '1px solid #e0e0e0', overflow: 'hidden'
                  }}>
                    <div style={{ display: 'flex' }}>
                      <div style={{ width: '140px', minHeight: '140px', backgroundColor: '#f5f0eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.photo_main
                          ? <img src={item.photo_main} alt={item.name} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                          : <div style={{ fontSize: '40px' }}>👔</div>
                        }
                      </div>

                      <div style={{ padding: '20px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <h3 style={{ fontWeight: 'bold', fontSize: '16px' }}>{item.name}</h3>
                              {getStatusBadge(item)}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {item.category && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px' }}>{item.category}</span>}
                              {item.gender && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px' }}>{item.gender}</span>}
                              {item.modesty_level && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px' }}>{item.modesty_level}</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>AED {item.price}</div>
                            {approvedTailors > 0 && (
                              <div style={{ fontSize: '11px', color: '#16a34a' }}>{approvedTailors} tailor(s) approved</div>
                            )}
                          </div>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>Photos:</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 80px)', gap: '8px' }}>
                            <InlinePhotoUpload item={item} photoType="photo_main" label="⭐ Front" />
                            <InlinePhotoUpload item={item} photoType="photo_back" label="Back" />
                            <InlinePhotoUpload item={item} photoType="photo_detail" label="Detail" />
                            <InlinePhotoUpload item={item} photoType="photo_model" label="Model" />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {hasPhotos && !sentToTailors && (
                            <button onClick={() => sendToAllTailors(item)}
                              disabled={sendingToTailors[item.id]} style={{
                                padding: '8px 16px', backgroundColor: '#1a1a1a', color: 'white',
                                border: 'none', borderRadius: '8px', cursor: 'pointer',
                                fontWeight: 'bold', fontSize: '13px'
                              }}>
                              {sendingToTailors[item.id] ? '📬 Sending...' : '📬 Send to Tailors'}
                            </button>
                          )}

                          {sentToTailors && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ padding: '8px 16px', backgroundColor: '#eff6ff', color: '#1e40af', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                                📬 Sent to {tailorItems.length} tailor(s)
                              </span>
                              <button onClick={() => sendToAllTailors(item)}
                                disabled={sendingToTailors[item.id]} style={{
                                  padding: '8px 16px', backgroundColor: 'white', color: '#1a1a1a',
                                  border: '2px solid #1a1a1a', borderRadius: '8px', cursor: 'pointer',
                                  fontWeight: 'bold', fontSize: '13px'
                                }}>
                                🔄 Resend to New Tailors
                              </button>
                            </div>
                          )}

                          {approvedTailors > 0 && (
                            <button onClick={() => toggleActive(item.id, item.is_active)} style={{
                              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                              backgroundColor: item.is_active ? '#fee2e2' : '#dcfce7',
                              color: item.is_active ? '#dc2626' : '#16a34a', border: 'none', fontWeight: 'bold'
                            }}>{item.is_active ? 'Hide' : 'Make Live'}</button>
                          )}

                          <button onClick={() => deleteItem(item.id)} style={{
                            padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px',
                            backgroundColor: '#fee2e2', color: '#dc2626', border: 'none'
                          }}>Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </main>
  )
}