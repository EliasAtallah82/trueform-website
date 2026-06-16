'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function DesignerDesigns() {
  const [user, setUser] = useState(null)
  const [designerProfile, setDesignerProfile] = useState(null)
  const [designs, setDesigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [uploading, setUploading] = useState({})

  const [newDesign, setNewDesign] = useState({
    name: '', description: '', category: '', occasion: '',
    modesty_level: '', gender: '', base_price: '',
    production_mode: 'open_to_tailors', combined_split_percent: 70,
    fabrics: [], accessories: []
  })

  const [newFabric, setNewFabric] = useState({ fabric_name: '', price_delta: 0 })
  const [newAccessory, setNewAccessory] = useState({
    accessory_name: '', description: '', price_delta: 0,
    is_optional: true, reference_photo: ''
  })

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        const { data: dp } = await supabase
          .from('designer_profiles').select('*').eq('user_id', data.user.id).single()
        setDesignerProfile(dp)
        if (dp) fetchDesigns(dp.id)
      }
    }
    init()
  }, [])

  const fetchDesigns = async (designerId) => {
    const { data: designsData } = await supabase
      .from('designs').select('*')
      .eq('designer_id', designerId)
      .order('created_at', { ascending: false })

    if (!designsData) { setDesigns([]); setLoading(false); return }

    // Fetch fabrics and accessories for each design
    const designIds = designsData.map(d => d.id)

    const { data: fabricsData } = await supabase
      .from('design_fabrics').select('*').in('design_id', designIds)

    const { data: accessoriesData } = await supabase
      .from('design_accessories').select('*').in('design_id', designIds)

    const merged = designsData.map(d => ({
      ...d,
      fabrics: fabricsData?.filter(f => f.design_id === d.id) || [],
      accessories: accessoriesData?.filter(a => a.design_id === d.id) || []
    }))

    setDesigns(merged)
    setLoading(false)
  }

  const uploadPhoto = async (file, photoType, designId) => {
    setUploading(prev => ({ ...prev, [`${designId}-${photoType}`]: true }))
    const fileExt = file.name.split('.').pop()
    const fileName = `designs/${Date.now()}-${photoType}.${fileExt}`
    const { error } = await supabase.storage.from('catalog-photos').upload(fileName, file)
    if (error) { alert('Upload error: ' + error.message); setUploading(prev => ({ ...prev, [`${designId}-${photoType}`]: false })); return }
    const { data: urlData } = supabase.storage.from('catalog-photos').getPublicUrl(fileName)
    if (designId === 'new') {
      // handled separately
    } else {
      await supabase.from('designs').update({ [photoType]: urlData.publicUrl }).eq('id', designId)
      setDesigns(designs.map(d => d.id === designId ? { ...d, [photoType]: urlData.publicUrl } : d))
    }
    setUploading(prev => ({ ...prev, [`${designId}-${photoType}`]: false }))
    return urlData.publicUrl
  }

  const handleSave = async () => {
    if (!newDesign.name || !newDesign.category || !newDesign.base_price) {
      alert('Please fill in name, category and base price!')
      return
    }
    setSaving(true)

    const { data, error } = await supabase.from('designs').insert({
      designer_id: designerProfile.id,
      name: newDesign.name,
      description: newDesign.description,
      category: newDesign.category,
      occasion: newDesign.occasion,
      modesty_level: newDesign.modesty_level,
      gender: newDesign.gender,
      base_price: parseFloat(newDesign.base_price),
      royalty_percent: designerProfile.royalty_percent,
      production_mode: newDesign.production_mode,
      combined_split_percent: newDesign.production_mode === 'design_and_produce'
        ? parseFloat(newDesign.combined_split_percent) : null,
      status: 'pending_review'
    }).select()

    if (error) { alert('Error: ' + error.message); setSaving(false); return }

    const designId = data[0].id

    // Insert fabrics
    if (newDesign.fabrics.length > 0) {
      await supabase.from('design_fabrics').insert(
        newDesign.fabrics.map(f => ({ design_id: designId, ...f }))
      )
    }

    // Insert accessories
    if (newDesign.accessories.length > 0) {
      await supabase.from('design_accessories').insert(
        newDesign.accessories.map(a => ({ design_id: designId, ...a }))
      )
    }

    await fetchDesigns(designerProfile.id)
    setMode(null)
    setNewDesign({
      name: '', description: '', category: '', occasion: '',
      modesty_level: '', gender: '', base_price: '',
      production_mode: 'open_to_tailors', combined_split_percent: 70,
      fabrics: [], accessories: []
    })
    alert('✅ Design submitted for review!')
    setSaving(false)
  }

  const addFabric = () => {
    if (!newFabric.fabric_name) { alert('Please enter fabric name!'); return }
    setNewDesign(prev => ({ ...prev, fabrics: [...prev.fabrics, { ...newFabric }] }))
    setNewFabric({ fabric_name: '', price_delta: 0 })
  }

  const removeFabric = (index) => {
    setNewDesign(prev => ({ ...prev, fabrics: prev.fabrics.filter((_, i) => i !== index) }))
  }

  const addAccessory = () => {
    if (!newAccessory.accessory_name) { alert('Please enter accessory name!'); return }
    setNewDesign(prev => ({ ...prev, accessories: [...prev.accessories, { ...newAccessory }] }))
    setNewAccessory({ accessory_name: '', description: '', price_delta: 0, is_optional: true, reference_photo: '' })
  }

  const removeAccessory = (index) => {
    setNewDesign(prev => ({ ...prev, accessories: prev.accessories.filter((_, i) => i !== index) }))
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

  const net = parseFloat(newDesign.base_price) / 1.05 || 0
  const royalty = net * (designerProfile?.royalty_percent || 0) / 100

  const allDesigns = designs
  const draftDesigns = designs.filter(d => d.status === 'draft')
  const pendingDesigns = designs.filter(d => d.status === 'pending_review')
  const liveDesigns = designs.filter(d => d.status === 'live')
  const rejectedDesigns = designs.filter(d => d.status === 'rejected')

  const filteredDesigns = activeTab === 'all' ? allDesigns
    : activeTab === 'pending' ? pendingDesigns
    : activeTab === 'live' ? liveDesigns
    : activeTab === 'rejected' ? rejectedDesigns
    : draftDesigns

  const getStatusBadge = (status) => {
    const map = {
      draft: { bg: '#f3f4f6', color: '#6b7280', label: '📝 Draft' },
      pending_review: { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending Review' },
      sent_to_tailors: { bg: '#eff6ff', color: '#1e40af', label: '📬 Sent to Tailors' },
      live: { bg: '#dcfce7', color: '#166534', label: '🟢 Live' },
      rejected: { bg: '#fee2e2', color: '#991b1b', label: '❌ Rejected' },
    }
    const s = map[status] || map.draft
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
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm — Designer</h1>
        <a href="/dashboard/designer" style={{ color: 'white', fontSize: '14px' }}>← Back to Dashboard</a>
      </nav>

      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>🎨 My Designs</h2>
            <p style={{ color: '#888', fontSize: '14px' }}>{designs.length} designs submitted</p>
          </div>
          {!mode && (
            <button onClick={() => setMode('create')} style={{
              padding: '12px 24px', backgroundColor: '#1a1a1a', color: 'white',
              border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
            }}>➕ Create Design</button>
          )}
          {mode && (
            <button onClick={() => setMode(null)} style={{
              padding: '12px 20px', backgroundColor: '#fee2e2', color: '#dc2626',
              border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold'
            }}>✕ Cancel</button>
          )}
        </div>

        {/* Create Design Form */}
        {mode === 'create' && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Create New Design</h3>

            {/* Basic Info */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Design Name *</label>
              <input value={newDesign.name}
                onChange={(e) => setNewDesign(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Floral Summer Dress" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Description</label>
              <textarea value={newDesign.description}
                onChange={(e) => setNewDesign(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe your design..." rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Category *</label>
                <select value={newDesign.category}
                  onChange={(e) => setNewDesign(p => ({ ...p, category: e.target.value }))}
                  style={selectStyle}>
                  <option value="">Select category</option>
                  {['Shirt / Top', 'Trousers / Pants', 'Suit / Blazer', 'Full Outfit',
                    'Thobe / Kandura', 'Abaya / Modest Wear', 'Dress / Skirt', 'Accessories'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Gender</label>
                <select value={newDesign.gender}
                  onChange={(e) => setNewDesign(p => ({ ...p, gender: e.target.value }))}
                  style={selectStyle}>
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
                <input value={newDesign.occasion}
                  onChange={(e) => setNewDesign(p => ({ ...p, occasion: e.target.value }))}
                  placeholder="e.g. Wedding, Casual, Work" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Modesty Level</label>
                <select value={newDesign.modesty_level}
                  onChange={(e) => setNewDesign(p => ({ ...p, modesty_level: e.target.value }))}
                  style={selectStyle}>
                  <option value="">Select modesty</option>
                  <option value="Fully Covered">Fully Covered</option>
                  <option value="Modest & Elegant">Modest & Elegant</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Fashion Forward">Fashion Forward</option>
                </select>
              </div>
            </div>

            {/* Base Price */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                Base Price (AED, VAT incl.) * <span style={{ fontSize: '12px', color: '#888' }}>— for the design in its basic form</span>
              </label>
              <input type="number" value={newDesign.base_price}
                onChange={(e) => setNewDesign(p => ({ ...p, base_price: e.target.value }))}
                placeholder="e.g. 350" style={{ ...inputStyle, maxWidth: '200px' }} />
              {newDesign.base_price && (
                <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#f5f0eb', borderRadius: '10px', maxWidth: '320px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#555' }}>Net price (excl. VAT):</span>
                    <span>AED {net.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#555' }}>Your royalty ({designerProfile?.royalty_percent}%):</span>
                    <span style={{ color: '#16a34a', fontWeight: 'bold' }}>AED {royalty.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Production Mode */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 'bold' }}>
                Production Mode
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => setNewDesign(p => ({ ...p, production_mode: 'open_to_tailors' }))} style={{
                  padding: '16px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                  border: newDesign.production_mode === 'open_to_tailors' ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                  backgroundColor: newDesign.production_mode === 'open_to_tailors' ? '#f5f0eb' : 'white'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>🧵 Open to Tailors</div>
                  <div style={{ fontSize: '13px', color: '#888' }}>Your design is sent to the tailor pool for production pricing. Best for standard designs.</div>
                </button>
                <button onClick={() => setNewDesign(p => ({ ...p, production_mode: 'design_and_produce' }))} style={{
                  padding: '16px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                  border: newDesign.production_mode === 'design_and_produce' ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                  backgroundColor: newDesign.production_mode === 'design_and_produce' ? '#f5f0eb' : 'white'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>✂️ Design + Produce (I make it myself)</div>
                  <div style={{ fontSize: '13px', color: '#888' }}>You produce this design yourself. Full control over quality and execution.</div>
                </button>
              </div>

              {newDesign.production_mode === 'design_and_produce' && (
                <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#f5f0eb', borderRadius: '10px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>
                    Your share of net price (%) — TrueForm keeps the rest
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="number" min="50" max="90" value={newDesign.combined_split_percent}
                      onChange={(e) => setNewDesign(p => ({ ...p, combined_split_percent: e.target.value }))}
                      style={{ ...inputStyle, maxWidth: '100px' }} />
                    <span>%</span>
                    <span style={{ fontSize: '13px', color: '#888' }}>
                      You: AED {(net * newDesign.combined_split_percent / 100).toFixed(2)} · TrueForm: AED {(net * (100 - newDesign.combined_split_percent) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Fabrics */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                🧵 Available Fabrics
              </label>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
                Add fabric options customers can choose from. Each fabric can have a price delta (0 = same as base price).
              </p>

              {newDesign.fabrics.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  {newDesign.fabrics.map((fabric, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginBottom: '6px'
                    }}>
                      <span style={{ fontSize: '14px' }}>
                        {fabric.fabric_name}
                        {fabric.price_delta > 0 && <span style={{ color: '#16a34a', marginLeft: '8px' }}>+AED {fabric.price_delta}</span>}
                        {fabric.price_delta < 0 && <span style={{ color: '#dc2626', marginLeft: '8px' }}>-AED {Math.abs(fabric.price_delta)}</span>}
                      </span>
                      <button onClick={() => removeFabric(i)} style={{
                        padding: '4px 10px', backgroundColor: '#fee2e2', color: '#dc2626',
                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                      }}>Remove</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>Fabric Name</label>
                  <input value={newFabric.fabric_name}
                    onChange={(e) => setNewFabric(p => ({ ...p, fabric_name: e.target.value }))}
                    placeholder="e.g. Premium Cotton" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>Price Delta (AED)</label>
                  <input type="number" value={newFabric.price_delta}
                    onChange={(e) => setNewFabric(p => ({ ...p, price_delta: parseFloat(e.target.value) || 0 }))}
                    placeholder="0" style={inputStyle} />
                </div>
                <button onClick={addFabric} style={{
                  padding: '10px 16px', backgroundColor: '#1a1a1a', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'
                }}>+ Add</button>
              </div>
            </div>

            {/* Accessories */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                ✨ Accessories & Variances
              </label>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
                Add optional add-ons customers can select. Each needs a reference photo.
              </p>

              {newDesign.accessories.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  {newDesign.accessories.map((acc, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginBottom: '6px'
                    }}>
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>{acc.accessory_name}</span>
                        {acc.price_delta > 0 && <span style={{ color: '#16a34a', marginLeft: '8px', fontSize: '13px' }}>+AED {acc.price_delta}</span>}
                        {acc.description && <div style={{ fontSize: '12px', color: '#888' }}>{acc.description}</div>}
                      </div>
                      <button onClick={() => removeAccessory(i)} style={{
                        padding: '4px 10px', backgroundColor: '#fee2e2', color: '#dc2626',
                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                      }}>Remove</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ backgroundColor: '#f9f9f9', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>Accessory Name</label>
                    <input value={newAccessory.accessory_name}
                      onChange={(e) => setNewAccessory(p => ({ ...p, accessory_name: e.target.value }))}
                      placeholder="e.g. Embroidered Collar" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>Additional Price (AED)</label>
                    <input type="number" value={newAccessory.price_delta}
                      onChange={(e) => setNewAccessory(p => ({ ...p, price_delta: parseFloat(e.target.value) || 0 }))}
                      placeholder="0" style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>Description / Spec</label>
                  <input value={newAccessory.description}
                    onChange={(e) => setNewAccessory(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe this accessory for the tailor..." style={inputStyle} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={newAccessory.is_optional}
                      onChange={(e) => setNewAccessory(p => ({ ...p, is_optional: e.target.checked }))} />
                    Optional (customer can choose to add/remove)
                  </label>
                  <button onClick={addAccessory} style={{
                    padding: '8px 16px', backgroundColor: '#1a1a1a', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'
                  }}>+ Add Accessory</button>
                </div>
              </div>
            </div>

            <button onClick={handleSave} disabled={saving} style={{
              width: '100%', padding: '14px', backgroundColor: '#1a1a1a', color: 'white',
              border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
            }}>
              {saving ? 'Submitting...' : '📤 Submit for Admin Review'}
            </button>
          </div>
        )}

        {/* Tabs */}
        {!mode && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: `All (${allDesigns.length})` },
              { key: 'pending', label: `Pending (${pendingDesigns.length})` },
              { key: 'live', label: `Live (${liveDesigns.length})` },
              { key: 'rejected', label: `Rejected (${rejectedDesigns.length})` },
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
        )}

        {/* Designs List */}
        {!mode && (
          loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>Loading designs...</div>
          ) : filteredDesigns.length === 0 ? (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '60px', textAlign: 'center', color: '#888' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
              <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>No designs yet</h3>
              <p>Click "Create Design" to submit your first design!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredDesigns.map(design => (
                <div key={design.id} style={{
                  backgroundColor: 'white', borderRadius: '16px',
                  border: '1px solid #e0e0e0', overflow: 'hidden'
                }}>
                  <div style={{ display: 'flex' }}>
                    {/* Photo */}
                    <div style={{ width: '120px', minHeight: '120px', backgroundColor: '#f5f0eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {design.photo_main
                        ? <img src={design.photo_main} alt={design.name} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                        : <div style={{ fontSize: '36px' }}>🎨</div>
                      }
                      {/* Photo Upload */}
                      <label style={{
                        position: 'absolute', bottom: '4px', right: '4px',
                        backgroundColor: 'rgba(0,0,0,0.6)', color: 'white',
                        padding: '3px 6px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer'
                      }}>
                        {uploading[`${design.id}-photo_main`] ? '...' : '📷'}
                        <input type="file" accept="image/*" style={{ display: 'none' }}
                          onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0], 'photo_main', design.id)} />
                      </label>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '16px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <h3 style={{ fontWeight: 'bold', fontSize: '16px' }}>{design.name}</h3>
                            {getStatusBadge(design.status)}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {design.category && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px' }}>{design.category}</span>}
                            {design.gender && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px' }}>{design.gender}</span>}
                            {design.production_mode === 'design_and_produce' && <span style={{ fontSize: '11px', backgroundColor: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '20px' }}>✂️ D+P</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>AED {design.base_price}</div>
                          <div style={{ fontSize: '11px', color: '#16a34a' }}>
                            Royalty: AED {(design.base_price / 1.05 * (design.royalty_percent || 0) / 100).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Fabrics */}
                      {design.fabrics && design.fabrics.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#888' }}>Fabrics: </span>
                          {design.fabrics.map(f => (
                            <span key={f.id} style={{ fontSize: '11px', backgroundColor: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: '20px', marginRight: '4px' }}>
                              {f.fabric_name}{f.price_delta > 0 ? ` +${f.price_delta}` : ''}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Accessories */}
                      {design.accessories && design.accessories.length > 0 && (
                        <div>
                          <span style={{ fontSize: '12px', color: '#888' }}>Accessories: </span>
                          {design.accessories.map(a => (
                            <span key={a.id} style={{ fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '20px', marginRight: '4px' }}>
                              {a.accessory_name}{a.price_delta > 0 ? ` +${a.price_delta}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </main>
  )
}