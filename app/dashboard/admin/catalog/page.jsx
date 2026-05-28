'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

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
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState({})
  const [newItem, setNewItem] = useState({
    name: '', description: '', category: '', gender: '',
    occasion: '', modesty_level: '', fabrics: '', colors: '',
    price: '', turnaround_days: '', is_active: true,
    photo_main: '', photo_back: '', photo_detail: '', photo_model: '',
    required_skills: []
  })

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

  const uploadPhoto = async (file, photoType) => {
    setUploading(prev => ({ ...prev, [photoType]: true }))
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${photoType}.${fileExt}`
    const { data, error } = await supabase.storage
      .from('catalog-photos').upload(fileName, file)
    if (error) { alert('Upload error: ' + error.message); setUploading(prev => ({ ...prev, [photoType]: false })); return }
    const { data: urlData } = supabase.storage.from('catalog-photos').getPublicUrl(fileName)
    setNewItem(prev => ({ ...prev, [photoType]: urlData.publicUrl }))
    setUploading(prev => ({ ...prev, [photoType]: false }))
  }

  const calcPricing = (price) => {
    const selling = parseFloat(price) || 0
    const vat = selling - selling / 1.05
    const net = selling / 1.05
    const trueformFee = net * 0.15
    const tailorCut = net * 0.85
    return {
      selling: selling.toFixed(2), vat: vat.toFixed(2),
      net: net.toFixed(2), trueformFee: trueformFee.toFixed(2),
      tailorCut: tailorCut.toFixed(2)
    }
  }

  const generateAIPrompt = () => {
    const parts = [
      'Professional fashion photography',
      newItem.name, newItem.category,
      newItem.gender && `for ${newItem.gender}`,
      newItem.colors && `in ${newItem.colors}`,
      newItem.fabrics && `made of ${newItem.fabrics}`,
      newItem.modesty_level && `${newItem.modesty_level} style`,
      newItem.description,
      'front view', 'white background', 'studio lighting',
      'high quality commercial fashion photography', 'no model', 'flat lay or mannequin'
    ].filter(Boolean)
    return parts.join(', ')
  }

  const copyPrompt = () => {
    navigator.clipboard.writeText(generateAIPrompt())
    alert('✅ AI prompt copied! Paste it into Midjourney or DALL-E')
  }

  const toggleSkill = (skill) => {
    setNewItem(prev => ({
      ...prev,
      required_skills: prev.required_skills.includes(skill)
        ? prev.required_skills.filter(s => s !== skill)
        : [...prev.required_skills, skill]
    }))
  }

  const inviteMatchingTailors = async (catalogId, requiredSkills) => {
    if (!requiredSkills.length) return 0
    const { data: tailors } = await supabase
      .from('tailor_profiles')
      .select('user_id, skills')
    if (!tailors) return 0
    const matchingTailors = tailors.filter(tailor => {
      if (!tailor.skills) return false
      const tailorSkills = tailor.skills.split(',')
      return requiredSkills.some(skill => tailorSkills.includes(skill))
    })
    if (matchingTailors.length > 0) {
      await supabase.from('tailor_catalog_items').insert(
        matchingTailors.map(tailor => ({
          catalog_id: catalogId,
          tailor_id: tailor.user_id,
          status: 'pending'
        }))
      )
    }
    return matchingTailors.length
  }

  const handleSave = async () => {
    if (!newItem.name || !newItem.category || !newItem.price) {
      alert('Please fill in name, category and price!')
      return
    }
    if (!newItem.photo_main) {
      alert('Please upload at least a main photo!')
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
      ai_prompt: generateAIPrompt()
    }).select()

    if (error) { alert('Error: ' + error.message); setSaving(false); return }

    if (data) {
      const invitedCount = await inviteMatchingTailors(data[0].id, newItem.required_skills)
      setItems([data[0], ...items])
      setShowAddForm(false)
      setNewItem({
        name: '', description: '', category: '', gender: '',
        occasion: '', modesty_level: '', fabrics: '', colors: '',
        price: '', turnaround_days: '', is_active: true,
        photo_main: '', photo_back: '', photo_detail: '', photo_model: '',
        required_skills: []
      })
      alert(`✅ Item added! ${invitedCount} tailor(s) invited to fulfill this item!`)
    }
    setSaving(false)
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>👔 Catalog Management</h2>
            <p style={{ color: '#888', fontSize: '14px' }}>{items.length} items in catalog</p>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ padding: '12px 24px', backgroundColor: '#1a1a1a', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
            {showAddForm ? '✕ Cancel' : '➕ Add Item'}
          </button>
        </div>

        {showAddForm && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Add New Item</h3>

            {/* Photos */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                Photos <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>All photos must be front-facing with white/neutral background.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <PhotoUpload label="⭐ Front View (Main)" photoType="photo_main" isMain={true} />
                <PhotoUpload label="Back View" photoType="photo_back" isMain={false} />
                <PhotoUpload label="Detail Shot" photoType="photo_detail" isMain={false} />
                <PhotoUpload label="On Model" photoType="photo_model" isMain={false} />
              </div>
              {(newItem.name || newItem.category || newItem.colors) && (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#1a1a1a', borderRadius: '12px' }}>
                  <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>🤖 Suggested AI prompt:</div>
                  <div style={{ fontSize: '12px', color: '#fff', marginBottom: '12px', lineHeight: '1.6' }}>{generateAIPrompt()}</div>
                  <button onClick={copyPrompt} style={{ padding: '8px 16px', backgroundColor: 'white', color: '#1a1a1a', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                    📋 Copy AI Prompt
                  </button>
                </div>
              )}
            </div>

            {/* Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Item Name *</label>
              <input value={newItem.name} onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Classic Navy Linen Shirt" style={inputStyle} />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Description</label>
              <textarea value={newItem.description} onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this item..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {/* Price */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Selling Price — VAT Inclusive (AED) *</label>
              <input type="number" value={newItem.price} onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                placeholder="e.g. 250" style={{ ...inputStyle, maxWidth: '200px' }} />
              {pricing && (
                <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#f5f0eb', borderRadius: '10px', maxWidth: '320px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '10px' }}>💰 Pricing Breakdown</div>
                  {[
                    { label: 'Selling Price (incl. VAT):', value: `AED ${pricing.selling}`, bold: true },
                    { label: 'VAT (5%):', value: `- AED ${pricing.vat}`, red: true },
                    { label: 'Net Price (excl. VAT):', value: `AED ${pricing.net}`, border: true },
                    { label: 'TrueForm Fee (15%):', value: `- AED ${pricing.trueformFee}`, red: true },
                    { label: 'Tailor net cut (excl. VAT):', value: `AED ${pricing.tailorCut}`, green: true, border: true },
                  ].map((row) => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', borderTop: row.border ? '1px solid #ddd' : 'none', paddingTop: row.border ? '6px' : '0' }}>
                      <span style={{ color: row.bold ? '#1a1a1a' : '#555', fontWeight: row.bold ? 'bold' : 'normal' }}>{row.label}</span>
                      <span style={{ color: row.green ? '#16a34a' : row.red ? '#dc2626' : '#1a1a1a', fontWeight: row.bold || row.green ? 'bold' : 'normal' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category + Gender */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Category *</label>
                <select value={newItem.category} onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))} style={selectStyle}>
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
                <select value={newItem.gender} onChange={(e) => setNewItem(prev => ({ ...prev, gender: e.target.value }))} style={selectStyle}>
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
                <input value={newItem.occasion} onChange={(e) => setNewItem(prev => ({ ...prev, occasion: e.target.value }))}
                  placeholder="e.g. Work, Wedding, Casual" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Modesty Level</label>
                <select value={newItem.modesty_level} onChange={(e) => setNewItem(prev => ({ ...prev, modesty_level: e.target.value }))} style={selectStyle}>
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
                <input value={newItem.fabrics} onChange={(e) => setNewItem(prev => ({ ...prev, fabrics: e.target.value }))}
                  placeholder="e.g. Linen, Cotton, Wool" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Available Colors</label>
                <input value={newItem.colors} onChange={(e) => setNewItem(prev => ({ ...prev, colors: e.target.value }))}
                  placeholder="e.g. Navy, White, Black" style={inputStyle} />
              </div>
            </div>

            {/* Turnaround */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Turnaround (days)</label>
              <input type="number" value={newItem.turnaround_days} onChange={(e) => setNewItem(prev => ({ ...prev, turnaround_days: e.target.value }))}
                placeholder="e.g. 7" style={{ ...inputStyle, maxWidth: '200px' }} />
            </div>

            {/* Required Skills */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                Required Skills to Fulfill This Item
              </label>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                Tailors with these skills will be automatically invited to fulfill this item
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                {SKILLS.map((skill) => (
                  <button key={skill} onClick={() => toggleSkill(skill)} style={{
                    padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                    textAlign: 'left', fontSize: '13px',
                    border: newItem.required_skills.includes(skill) ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                    backgroundColor: newItem.required_skills.includes(skill) ? '#1a1a1a' : 'white',
                    color: newItem.required_skills.includes(skill) ? 'white' : '#555'
                  }}>
                    {newItem.required_skills.includes(skill) ? '✅ ' : ''}{skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Active */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <input type="checkbox" id="active" checked={newItem.is_active}
                onChange={(e) => setNewItem(prev => ({ ...prev, is_active: e.target.checked }))} />
              <label htmlFor="active" style={{ fontSize: '14px', cursor: 'pointer' }}>
                Make visible to customers immediately
              </label>
            </div>

            <button onClick={handleSave} disabled={saving} style={{
              width: '100%', padding: '14px', backgroundColor: '#1a1a1a', color: 'white',
              border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
            }}>
              {saving ? 'Saving & Inviting Tailors...' : '✅ Add to Catalog & Invite Tailors'}
            </button>
          </div>
        )}

        {/* Catalog Items */}
        {items.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '60px', textAlign: 'center', color: '#888' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👔</div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>No items yet</h3>
            <p>Click "Add Item" to start building your catalog!</p>
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
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ fontWeight: 'bold', fontSize: '16px' }}>{item.name}</h3>
                    <span style={{ fontWeight: 'bold' }}>AED {item.price}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {item.category && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.category}</span>}
                    {item.gender && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.gender}</span>}
                    {item.modesty_level && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.modesty_level}</span>}
                  </div>
                  <div style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '8px', borderRadius: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Tailor net cut:</span>
                      <span style={{ color: '#16a34a', fontWeight: 'bold' }}>AED {(item.price / 1.05 * 0.85).toFixed(2)}</span>
                    </div>
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