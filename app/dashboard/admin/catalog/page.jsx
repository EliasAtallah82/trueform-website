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
  const [mode, setMode] = useState(null) // null | 'individual' | 'bulk'
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState({})

  // Individual form
  const [newItem, setNewItem] = useState({
    name: '', description: '', category: '', gender: '',
    occasion: '', modesty_level: '', fabrics: '', colors: '',
    price: '', turnaround_days: '', is_active: true,
    photo_main: '', photo_back: '', photo_detail: '', photo_model: '',
    required_skills: []
  })

  // Bulk upload
  const [bulkItems, setBulkItems] = useState([])
  const [bulkErrors, setBulkErrors] = useState([])
  const [bulkSubmitted, setBulkSubmitted] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        const { data: catalogItems } = await supabase
          .from('catalog').select('*').order('created_at', { ascending: false })
        setItems(catalogItems || [])
      }
    }
    init()
  }, [])

  // ── Helpers ────────────────────────────────────────────────────────

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

  const inviteAllTailors = async (catalogId) => {
    const { data: tailors } = await supabase
      .from('tailor_profiles').select('user_id')
    if (!tailors || tailors.length === 0) return 0
    await supabase.from('tailor_catalog_items').insert(
      tailors.map(tailor => ({
        catalog_id: catalogId,
        tailor_id: tailor.user_id,
        status: 'pending'
      }))
    )
    return tailors.length
  }

  // ── Photo upload ───────────────────────────────────────────────────

  const uploadPhoto = async (file, photoType) => {
    setUploading(prev => ({ ...prev, [photoType]: true }))
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${photoType}.${fileExt}`
    const { error } = await supabase.storage.from('catalog-photos').upload(fileName, file)
    if (error) { alert('Upload error: ' + error.message); setUploading(prev => ({ ...prev, [photoType]: false })); return }
    const { data: urlData } = supabase.storage.from('catalog-photos').getPublicUrl(fileName)
    setNewItem(prev => ({ ...prev, [photoType]: urlData.publicUrl }))
    setUploading(prev => ({ ...prev, [photoType]: false }))
  }

  // ── Individual save ────────────────────────────────────────────────

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
      is_active: true,
      created_by: 'admin',
      ai_prompt: generateAIPrompt(newItem)
    }).select()

    if (error) { alert('Error: ' + error.message); setSaving(false); return }

    if (data) {
      const invitedCount = await inviteAllTailors(data[0].id)
      setItems([data[0], ...items])
      setMode(null)
      setNewItem({
        name: '', description: '', category: '', gender: '',
        occasion: '', modesty_level: '', fabrics: '', colors: '',
        price: '', turnaround_days: '', is_active: true,
        photo_main: '', photo_back: '', photo_detail: '', photo_model: '',
        required_skills: []
      })
      alert(`✅ Item added and sent to ${invitedCount} tailor(s) for pricing!`)
    }
    setSaving(false)
  }

  // ── Bulk upload ────────────────────────────────────────────────────

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
      const errors = []

      rows.forEach((row, i) => {
        const name = String(row['Item Name *'] || '').trim()
        const category = String(row['Category *'] || '').trim()
        const price = parseFloat(row['Price AED (VAT incl) *']) || 0

        const rowErrors = []
        if (!name) rowErrors.push('Item Name is required')
        if (!category) rowErrors.push('Category is required')
        if (!price || price <= 0) rowErrors.push('Price must be greater than 0')

        const item = {
          name,
          description: String(row['Description'] || '').trim(),
          category,
          gender: String(row['Gender'] || '').trim(),
          occasion: String(row['Occasion'] || '').trim(),
          modesty_level: String(row['Modesty Level'] || '').trim(),
          fabrics: String(row['Available Fabrics'] || '').trim(),
          colors: String(row['Available Colors'] || '').trim(),
          price,
          turnaround_days: parseInt(row['Turnaround Days']) || 7,
          _errors: rowErrors,
          _rowNum: i + 2
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
      name: item.name,
      description: item.description,
      category: item.category,
      gender: item.gender,
      occasion: item.occasion,
      modesty_level: item.modesty_level,
      fabrics: item.fabrics,
      colors: item.colors,
      price: item.price,
      turnaround_days: item.turnaround_days,
      status: 'approved',
      is_active: true,
      created_by: 'admin',
      ai_prompt: generateAIPrompt(item)
    }))

    const { data, error } = await supabase.from('catalog').insert(toInsert).select()
    if (error) { alert('Error: ' + error.message); setBulkSaving(false); return }

    if (data) {
      // Invite all tailors to each item
      let totalTailors = 0
      for (const item of data) {
        const count = await inviteAllTailors(item.id)
        totalTailors = count // same count for all items
      }
      setItems([...data, ...items])
      setBulkSubmitted(true)
      setBulkSaving(false)
      alert(`✅ ${data.length} items added to catalog and sent to ${totalTailors} tailor(s) for pricing!`)
    }
  }

  // ── Other actions ──────────────────────────────────────────────────

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

  const PhotoUpload = ({ label, photoType, isMain }) => (
    <div style={{
      border: isMain ? '2px solid #1a1a1a' : '1px dashed #ddd',
      borderRadius: '12px', padding: '16px', textAlign: 'center',
      backgroundColor: isMain ? '#f5f0eb' : 'white'
    }}>
      <div style={{ fontSize: '12px', fontWeight: isMain ? 'bold' : 'normal', marginBottom: '8px', color: isMain ? '#1a1a1a' : '#888' }}>
        {label}
      </div>
      {newItem[photoType] ? (
        <div>
          <img src={newItem[photoType]} alt={label} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
          <button onClick={() => setNewItem(prev => ({ ...prev, [photoType]: '' }))}
            style={{ fontSize: '11px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
          <label style={{ cursor: 'pointer' }}>
            <span style={{ fontSize: '12px', backgroundColor: '#1a1a1a', color: 'white', padding: '6px 12px', borderRadius: '6px' }}>
              {uploading[photoType] ? 'Uploading...' : 'Upload Photo'}
            </span>
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0], photoType)} />
          </label>
        </div>
      )}
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f0eb' }}>
      <nav style={{ backgroundColor: '#1a1a1a', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm — Admin</h1>
        <a href="/dashboard/admin" style={{ color: 'white', fontSize: '14px' }}>← Back to Dashboard</a>
      </nav>

      <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>

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

        {/* Info banner */}
        <div style={{
          backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '16px',
          marginBottom: '24px', fontSize: '13px', color: '#ccc'
        }}>
          <span style={{ color: 'white', fontWeight: 'bold' }}>👑 Admin Range: </span>
          Items you add are sent to ALL tailors for pricing. Tailors submit their price, you approve the best fits. Cheapest approved tailor gets orders first.
        </div>

        {/* ── INDIVIDUAL FORM ── */}
        {mode === 'individual' && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Add New Item</h3>

            {/* Photos */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Photos</label>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                Upload photos now or generate AI photos later from the approvals page.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <PhotoUpload label="⭐ Front View (Main)" photoType="photo_main" isMain={true} />
                <PhotoUpload label="Back View" photoType="photo_back" isMain={false} />
                <PhotoUpload label="Detail Shot" photoType="photo_detail" isMain={false} />
                <PhotoUpload label="On Model" photoType="photo_model" isMain={false} />
              </div>
            </div>

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
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '8px', padding: '8px', backgroundColor: '#e5e7eb', borderRadius: '6px' }}>
                    💡 Actual tailor payment determined by their bid. Lower bid = more margin for TrueForm.
                  </div>
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

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Turnaround (days)</label>
              <input type="number" value={newItem.turnaround_days} onChange={(e) => setNewItem(p => ({ ...p, turnaround_days: e.target.value }))}
                placeholder="e.g. 7" style={{ ...inputStyle, maxWidth: '200px' }} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Required Skills</label>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>Optional — for reference only on admin range items</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                {SKILLS.map((skill) => (
                  <button key={skill} onClick={() => toggleSkill(skill)} style={{
                    padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '13px',
                    border: newItem.required_skills.includes(skill) ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                    backgroundColor: newItem.required_skills.includes(skill) ? '#1a1a1a' : 'white',
                    color: newItem.required_skills.includes(skill) ? 'white' : '#555'
                  }}>
                    {newItem.required_skills.includes(skill) ? '✅ ' : ''}{skill}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSave} disabled={saving} style={{
              width: '100%', padding: '14px', backgroundColor: '#1a1a1a', color: 'white',
              border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
            }}>
              {saving ? 'Adding & Sending to Tailors...' : '✅ Add to Catalog & Send to All Tailors'}
            </button>
          </div>
        )}

        {/* ── BULK UPLOAD ── */}
        {mode === 'bulk' && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>📊 Bulk Upload</h3>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
              Upload your starter catalog all at once. All items will be sent to tailors for pricing immediately.
            </p>

            {/* Step 1 */}
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

            {/* Step 2 */}
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

            {/* Errors */}
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

            {/* Step 3 - Preview */}
            {bulkItems.length > 0 && !bulkSubmitted && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#1a1a1a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold', flexShrink: 0 }}>3</div>
                  <span style={{ fontWeight: 'bold', fontSize: '15px' }}>Review {bulkItems.length} items ready to upload</span>
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
                        {bulkItems.map((item, i) => {
                          const maxTailorPayment = (item.price / 1.05 * 0.60).toFixed(2)
                          return (
                            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #e0e0e0' }}>
                              <td style={{ padding: '10px 12px', color: '#888' }}>{i + 1}</td>
                              <td style={{ padding: '10px 12px', fontWeight: '500' }}>{item.name}</td>
                              <td style={{ padding: '10px 12px' }}>{item.category}</td>
                              <td style={{ padding: '10px 12px' }}>{item.gender || '—'}</td>
                              <td style={{ padding: '10px 12px' }}>{item.price}</td>
                              <td style={{ padding: '10px 12px' }}>{item.turnaround_days} days</td>
                              <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 'bold' }}>AED {maxTailorPayment}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: '#f5f0eb', borderRadius: '12px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '32px' }}>📬</div>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>All tailors will be invited to submit prices</div>
                      <div style={{ fontSize: '13px', color: '#555' }}>After upload, every tailor on the platform receives these items and can submit their price. You review and approve the best bids.</div>
                    </div>
                  </div>

                  <button onClick={handleBulkSubmit} disabled={bulkSaving} style={{
                    width: '100%', padding: '14px', backgroundColor: '#1a1a1a', color: 'white',
                    border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
                  }}>
                    {bulkSaving ? `Uploading ${bulkItems.length} items & inviting tailors...` : `✅ Upload All ${bulkItems.length} Items & Send to Tailors`}
                  </button>
                </div>
              </div>
            )}

            {/* Success */}
            {bulkSubmitted && (
              <div style={{ textAlign: 'center', padding: '32px', backgroundColor: '#dcfce7', borderRadius: '12px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#166534', marginBottom: '8px' }}>
                  {bulkItems.length} items uploaded successfully!
                </div>
                <div style={{ fontSize: '14px', color: '#166534', marginBottom: '20px' }}>
                  All tailors have been notified and can now submit their prices. Check the Approvals page to review bids.
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button onClick={() => { setMode(null); setBulkItems([]); setBulkErrors([]) }} style={{
                    padding: '10px 24px', backgroundColor: '#1a1a1a', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                  }}>View Catalog</button>
                  <a href="/dashboard/admin/approvals" style={{
                    padding: '10px 24px', backgroundColor: 'white', color: '#1a1a1a',
                    border: '2px solid #1a1a1a', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold'
                  }}>Review Bids →</a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CATALOG GRID ── */}
        {items.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '60px', textAlign: 'center', color: '#888' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👔</div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>No items yet</h3>
            <p>Use "Add Item" or "Bulk Upload" to start building your catalog!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {items.map((item) => (
              <div key={item.id} style={{
                backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden',
                border: item.is_active ? '1px solid #e0e0e0' : '1px dashed #ccc',
                opacity: item.is_active ? 1 : 0.6
              }}>
                <div style={{ height: '200px', backgroundColor: '#f5f0eb', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {item.photo_main ? (
                    <img src={item.photo_main} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ fontSize: '60px' }}>👔</div>
                  )}
                  {!item.is_active && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '11px', padding: '3px 8px', borderRadius: '20px' }}>Hidden</div>
                  )}
                  <div style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: item.created_by === 'admin' ? '#dbeafe' : '#f0fdf4', color: item.created_by === 'admin' ? '#1e40af' : '#166534', fontSize: '11px', padding: '3px 8px', borderRadius: '20px' }}>
                    {item.created_by === 'admin' ? '👑 Admin' : '✂️ Tailor'}
                  </div>
                  {!item.photo_main && (
                    <div style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: '#7c3aed', color: 'white', fontSize: '11px', padding: '3px 8px', borderRadius: '20px' }}>
                      📷 No photos yet
                    </div>
                  )}
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ fontWeight: 'bold', fontSize: '16px' }}>{item.name}</h3>
                    <span style={{ fontWeight: 'bold' }}>AED {item.price}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {item.category && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.category}</span>}
                    {item.gender && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.gender}</span>}
                    {item.modesty_level && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.modesty_level}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => toggleActive(item.id, item.is_active)} style={{
                      flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px',
                      backgroundColor: item.is_active ? '#fee2e2' : '#dcfce7',
                      color: item.is_active ? '#dc2626' : '#16a34a', border: 'none'
                    }}>{item.is_active ? 'Hide' : 'Show'}</button>
                    <button onClick={() => deleteItem(item.id)} style={{
                      flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px',
                      backgroundColor: '#fee2e2', color: '#dc2626', border: 'none'
                    }}>Delete</button>
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