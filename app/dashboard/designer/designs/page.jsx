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
  const [wizardStep, setWizardStep] = useState(1)

  const [newDesign, setNewDesign] = useState({
    name: '', description: '', category: '', occasion: '',
    modesty_level: '', gender: '', base_price: '',
    production_mode: 'open_to_tailors', combined_split_percent: 70,
    fabrics: [], accessories: [],
    photo_main: '', photo_back: '', photo_detail: '', photo_model: '',
    tech_sketch_front: '', tech_sketch_back: '', tech_pack_pdf: '',
    construction_notes: ''
  })

  const [newFabric, setNewFabric] = useState({
    fabric_name: '', price_delta: 0,
    fabric_gsm: '', fabric_composition: '',
    lining_required: false, interfacing_required: false
  })

  const [newAccessory, setNewAccessory] = useState({
    accessory_name: '', description: '', price_delta: 0,
    is_optional: true, reference_photo: '',
    dimensions: '', placement: '', attachment_method: ''
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

  const handleNewDesignPhotoUpload = async (file, photoType) => {
    setUploading(prev => ({ ...prev, [`new-${photoType}`]: true }))
    const fileExt = file.name.split('.').pop()
    const fileName = `designs/${Date.now()}-${photoType}.${fileExt}`
    const { error } = await supabase.storage.from('catalog-photos').upload(fileName, file)
    if (error) { alert('Upload error: ' + error.message); setUploading(prev => ({ ...prev, [`new-${photoType}`]: false })); return }
    const { data: urlData } = supabase.storage.from('catalog-photos').getPublicUrl(fileName)
    setNewDesign(prev => ({ ...prev, [photoType]: urlData.publicUrl }))
    setUploading(prev => ({ ...prev, [`new-${photoType}`]: false }))
  }

  const handleTechPackUpload = async (file) => {
    setUploading(prev => ({ ...prev, tech_pack: true }))
    const fileName = `techpacks/${Date.now()}-techpack.pdf`
    const { error } = await supabase.storage.from('catalog-photos').upload(fileName, file)
    if (error) { alert('Upload error: ' + error.message); setUploading(prev => ({ ...prev, tech_pack: false })); return }
    const { data: urlData } = supabase.storage.from('catalog-photos').getPublicUrl(fileName)
    setNewDesign(prev => ({ ...prev, tech_pack_pdf: urlData.publicUrl }))
    setUploading(prev => ({ ...prev, tech_pack: false }))
  }

  const uploadPhoto = async (file, photoType, designId) => {
    setUploading(prev => ({ ...prev, [`${designId}-${photoType}`]: true }))
    const fileExt = file.name.split('.').pop()
    const fileName = `designs/${Date.now()}-${photoType}.${fileExt}`
    const { error } = await supabase.storage.from('catalog-photos').upload(fileName, file)
    if (error) { alert('Upload error: ' + error.message); setUploading(prev => ({ ...prev, [`${designId}-${photoType}`]: false })); return }
    const { data: urlData } = supabase.storage.from('catalog-photos').getPublicUrl(fileName)
    await supabase.from('designs').update({ [photoType]: urlData.publicUrl }).eq('id', designId)
    setDesigns(designs.map(d => d.id === designId ? { ...d, [photoType]: urlData.publicUrl } : d))
    setUploading(prev => ({ ...prev, [`${designId}-${photoType}`]: false }))
  }

  const handleSave = async () => {
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
      status: 'pending_review',
      photo_main: newDesign.photo_main,
      photo_back: newDesign.photo_back,
      photo_detail: newDesign.photo_detail,
      photo_model: newDesign.photo_model,
      tech_sketch_front: newDesign.tech_sketch_front,
      tech_sketch_back: newDesign.tech_sketch_back,
      tech_pack_pdf: newDesign.tech_pack_pdf,
      construction_notes: newDesign.construction_notes,
    }).select()

    if (error) { alert('Error: ' + error.message); setSaving(false); return }

    const designId = data[0].id

    if (newDesign.fabrics.length > 0) {
      await supabase.from('design_fabrics').insert(
        newDesign.fabrics.map(f => ({
          design_id: designId,
          fabric_name: f.fabric_name,
          price_delta: f.price_delta,
          fabric_gsm: f.fabric_gsm || null,
          fabric_composition: f.fabric_composition,
          lining_required: f.lining_required,
          interfacing_required: f.interfacing_required
        }))
      )
    }

    if (newDesign.accessories.length > 0) {
      await supabase.from('design_accessories').insert(
        newDesign.accessories.map(a => ({
          design_id: designId,
          accessory_name: a.accessory_name,
          description: a.description,
          price_delta: a.price_delta,
          is_optional: a.is_optional,
          reference_photo: a.reference_photo,
          dimensions: a.dimensions,
          placement: a.placement,
          attachment_method: a.attachment_method
        }))
      )
    }

    await fetchDesigns(designerProfile.id)
    setMode(null)
    setWizardStep(1)
    setNewDesign({
      name: '', description: '', category: '', occasion: '',
      modesty_level: '', gender: '', base_price: '',
      production_mode: 'open_to_tailors', combined_split_percent: 70,
      fabrics: [], accessories: [],
      photo_main: '', photo_back: '', photo_detail: '', photo_model: '',
      tech_sketch_front: '', tech_sketch_back: '', tech_pack_pdf: '',
      construction_notes: ''
    })
    alert('✅ Design submitted for review!')
    setSaving(false)
  }

  const addFabric = () => {
    if (!newFabric.fabric_name) { alert('Please enter fabric name!'); return }
    setNewDesign(prev => ({ ...prev, fabrics: [...prev.fabrics, { ...newFabric }] }))
    setNewFabric({ fabric_name: '', price_delta: 0, fabric_gsm: '', fabric_composition: '', lining_required: false, interfacing_required: false })
  }

  const removeFabric = (index) => {
    setNewDesign(prev => ({ ...prev, fabrics: prev.fabrics.filter((_, i) => i !== index) }))
  }

  const addAccessory = () => {
    if (!newAccessory.accessory_name) { alert('Please enter accessory name!'); return }
    setNewDesign(prev => ({ ...prev, accessories: [...prev.accessories, { ...newAccessory }] }))
    setNewAccessory({ accessory_name: '', description: '', price_delta: 0, is_optional: true, reference_photo: '', dimensions: '', placement: '', attachment_method: '' })
  }

  const removeAccessory = (index) => {
    setNewDesign(prev => ({ ...prev, accessories: prev.accessories.filter((_, i) => i !== index) }))
  }

  const handleDeleteDesign = async (id) => {
    if (!confirm('Delete this design? This cannot be undone.')) return
    await supabase.from('design_fabrics').delete().eq('design_id', id)
    await supabase.from('design_accessories').delete().eq('design_id', id)
    await supabase.from('designs').delete().eq('id', id)
    setDesigns(designs.filter(d => d.id !== id))
  }

  const getSteps = () => {
    const base = [
      { number: 1, label: 'Basics' },
      { number: 2, label: 'Photos' },
      { number: 3, label: 'Fabrics' },
      { number: 4, label: 'Accessories' },
    ]
    if (newDesign.production_mode === 'open_to_tailors') {
      base.push({ number: 5, label: 'References' })
    }
    base.push({ number: newDesign.production_mode === 'open_to_tailors' ? 6 : 5, label: 'Review' })
    return base
  }

  const steps = getSteps()
  const totalSteps = steps.length

  const canProceed = () => {
    if (wizardStep === 1) return newDesign.name && newDesign.category && newDesign.base_price
    if (wizardStep === 2) return !!newDesign.photo_main
    return true
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', border: '1px solid #ddd' }
  const selectStyle = { width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px', backgroundColor: 'white', border: '1px solid #ddd' }

  const net = parseFloat(newDesign.base_price) / 1.05 || 0
  const royalty = net * (designerProfile?.royalty_percent || 0) / 100

  const allDesigns = designs
  const pendingDesigns = designs.filter(d => d.status === 'pending_review')
  const liveDesigns = designs.filter(d => d.status === 'live')
  const rejectedDesigns = designs.filter(d => d.status === 'rejected')

  const filteredDesigns = activeTab === 'all' ? allDesigns
    : activeTab === 'pending' ? pendingDesigns
    : activeTab === 'live' ? liveDesigns
    : rejectedDesigns

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

  const isReviewStep = wizardStep === totalSteps

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f0eb' }}>
      <nav style={{ backgroundColor: '#1a1a1a', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            <button onClick={() => { setMode('create'); setWizardStep(1) }} style={{
              padding: '12px 24px', backgroundColor: '#1a1a1a', color: 'white',
              border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
            }}>➕ Create Design</button>
          )}
          {mode && (
            <button onClick={() => { setMode(null); setWizardStep(1) }} style={{
              padding: '12px 20px', backgroundColor: '#fee2e2', color: '#dc2626',
              border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold'
            }}>✕ Cancel</button>
          )}
        </div>

        {/* WIZARD */}
        {mode === 'create' && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', marginBottom: '32px' }}>

            {/* Progress Bar */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                {steps.map((step) => (
                  <div key={step.number} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      backgroundColor: wizardStep > step.number ? '#16a34a' : wizardStep === step.number ? '#1a1a1a' : '#e0e0e0',
                      color: wizardStep >= step.number ? 'white' : '#888',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 'bold', marginBottom: '6px'
                    }}>
                      {wizardStep > step.number ? '✓' : step.number}
                    </div>
                    <span style={{ fontSize: '11px', color: wizardStep === step.number ? '#1a1a1a' : '#888', fontWeight: wizardStep === step.number ? 'bold' : 'normal' }}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ height: '4px', backgroundColor: '#e0e0e0', borderRadius: '2px' }}>
                <div style={{
                  height: '4px', backgroundColor: '#1a1a1a', borderRadius: '2px',
                  width: `${((wizardStep - 1) / (totalSteps - 1)) * 100}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* STEP 1: BASICS */}
            {wizardStep === 1 && (
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '6px' }}>Basic Information</h3>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>Tell us about your design and how it will be produced.</p>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Design Name *</label>
                  <input value={newDesign.name} onChange={(e) => setNewDesign(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Floral Summer Dress" style={inputStyle} />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Description</label>
                  <textarea value={newDesign.description} onChange={(e) => setNewDesign(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe your design..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Gender</label>
                    <select value={newDesign.gender} onChange={(e) => setNewDesign(p => ({ ...p, gender: e.target.value }))} style={selectStyle}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="unisex">Unisex</option>
                      <option value="kids">Kids</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Category *</label>
                    <select value={newDesign.category} onChange={(e) => setNewDesign(p => ({ ...p, category: e.target.value }))} style={selectStyle}>
                      <option value="">Select category</option>
                      {['Shirt / Top', 'Trousers / Pants', 'Suit / Blazer', 'Full Outfit', 'Thobe / Kandura', 'Abaya / Modest Wear', 'Dress / Skirt', 'Accessories'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Occasion</label>
                    <input value={newDesign.occasion} onChange={(e) => setNewDesign(p => ({ ...p, occasion: e.target.value }))}
                      placeholder="e.g. Wedding, Casual, Work" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Modesty Level</label>
                    <select value={newDesign.modesty_level} onChange={(e) => setNewDesign(p => ({ ...p, modesty_level: e.target.value }))} style={selectStyle}>
                      <option value="">Select modesty</option>
                      <option value="Fully Covered">Fully Covered</option>
                      <option value="Modest & Elegant">Modest & Elegant</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Fashion Forward">Fashion Forward</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Base Price (AED, VAT incl.) *</label>
                  <input type="number" value={newDesign.base_price}
                    onChange={(e) => setNewDesign(p => ({ ...p, base_price: e.target.value }))}
                    placeholder="e.g. 350" style={{ ...inputStyle, maxWidth: '200px' }} />
                  {newDesign.base_price && (
                    <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#f5f0eb', borderRadius: '10px', maxWidth: '320px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#555' }}>Net (excl. VAT):</span>
                        <span>AED {net.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#555' }}>Your royalty ({designerProfile?.royalty_percent}%):</span>
                        <span style={{ color: '#16a34a', fontWeight: 'bold' }}>AED {royalty.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Production Mode */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 'bold' }}>Production Mode</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button onClick={() => setNewDesign(p => ({ ...p, production_mode: 'open_to_tailors' }))} style={{
                      padding: '16px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                      border: newDesign.production_mode === 'open_to_tailors' ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                      backgroundColor: newDesign.production_mode === 'open_to_tailors' ? '#f5f0eb' : 'white'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>🧵 Open to Tailors</div>
                      <div style={{ fontSize: '13px', color: '#888' }}>Your design goes to our tailor pool. You'll need to provide reference images so tailors can produce it correctly.</div>
                    </button>
                    <button onClick={() => setNewDesign(p => ({ ...p, production_mode: 'design_and_produce' }))} style={{
                      padding: '16px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                      border: newDesign.production_mode === 'design_and_produce' ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                      backgroundColor: newDesign.production_mode === 'design_and_produce' ? '#f5f0eb' : 'white'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>✂️ I produce this myself</div>
                      <div style={{ fontSize: '13px', color: '#888' }}>You make the garment yourself. No technical specs needed — just photos for customers.</div>
                    </button>
                  </div>

                  {newDesign.production_mode === 'design_and_produce' && (
                    <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#f5f0eb', borderRadius: '10px' }}>
                      <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>Your share of net price (%)</label>
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
              </div>
            )}

            {/* STEP 2: PHOTOS */}
            {wizardStep === 2 && (
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '6px' }}>Design Photos</h3>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>Upload customer-facing photos. Front photo is required.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  {[
                    { key: 'photo_main', label: '⭐ Front View', required: true, hint: 'Main photo customers see first' },
                    { key: 'photo_back', label: 'Back View', required: false, hint: 'Back of the garment' },
                    { key: 'photo_detail', label: 'Detail Shot', required: false, hint: 'Close-up of fabric or detail' },
                    { key: 'photo_model', label: 'On Model', required: false, hint: 'Worn by a model or mannequin' },
                  ].map(({ key, label, required, hint }) => (
                    <div key={key} style={{
                      border: required ? '2px solid #1a1a1a' : '2px dashed #ddd',
                      borderRadius: '12px', padding: '20px', textAlign: 'center',
                      backgroundColor: required ? '#f5f0eb' : 'white'
                    }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{label}</div>
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>{hint}</div>
                      {newDesign[key] ? (
                        <div>
                          <img src={newDesign[key]} alt={label} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} />
                          <label style={{ cursor: 'pointer' }}>
                            <span style={{ fontSize: '13px', backgroundColor: '#1a1a1a', color: 'white', padding: '6px 14px', borderRadius: '6px' }}>
                              {uploading[`new-${key}`] ? 'Uploading...' : '🔄 Replace'}
                            </span>
                            <input type="file" accept="image/*" style={{ display: 'none' }}
                              onChange={(e) => e.target.files[0] && handleNewDesignPhotoUpload(e.target.files[0], key)} />
                          </label>
                        </div>
                      ) : (
                        <label style={{ cursor: 'pointer' }}>
                          <div style={{ fontSize: '40px', marginBottom: '8px' }}>📷</div>
                          <span style={{ fontSize: '13px', backgroundColor: '#1a1a1a', color: 'white', padding: '8px 16px', borderRadius: '8px' }}>
                            {uploading[`new-${key}`] ? 'Uploading...' : 'Upload Photo'}
                          </span>
                          <input type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={(e) => e.target.files[0] && handleNewDesignPhotoUpload(e.target.files[0], key)} />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: FABRICS */}
            {wizardStep === 3 && (
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '6px' }}>Available Fabrics</h3>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
                  Add fabric options customers can choose from. Fill in details then click Save.
                </p>

                {newDesign.fabrics.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    {newDesign.fabrics.map((fabric, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: '10px', marginBottom: '8px',
                        border: '1px solid #bbf7d0'
                      }}>
                        <div>
                          <span style={{ fontSize: '15px', fontWeight: '500' }}>✅ {fabric.fabric_name}</span>
                          {fabric.price_delta > 0 && <span style={{ color: '#16a34a', marginLeft: '8px' }}>+AED {fabric.price_delta}</span>}
                          {fabric.price_delta === 0 && <span style={{ color: '#888', marginLeft: '8px', fontSize: '12px' }}>Base price</span>}
                          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                            {fabric.fabric_composition && fabric.fabric_composition}
                            {fabric.fabric_gsm && ` · ${fabric.fabric_gsm}GSM`}
                            {fabric.lining_required && ' · Lining ✓'}
                            {fabric.interfacing_required && ' · Interfacing ✓'}
                          </div>
                        </div>
                        <button onClick={() => removeFabric(i)} style={{
                          padding: '6px 12px', backgroundColor: '#fee2e2', color: '#dc2626',
                          border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                        }}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ backgroundColor: '#f9f9f9', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: '12px' }}>
                    {newDesign.fabrics.length === 0 ? 'Add your first fabric:' : 'Add another fabric:'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '4px' }}>Fabric Name *</label>
                      <input value={newFabric.fabric_name}
                        onChange={(e) => setNewFabric(p => ({ ...p, fabric_name: e.target.value }))}
                        placeholder="e.g. Premium Cotton" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '4px' }}>Price Delta (AED) — 0 = same as base</label>
                      <input type="number" value={newFabric.price_delta}
                        onChange={(e) => setNewFabric(p => ({ ...p, price_delta: parseFloat(e.target.value) || 0 }))}
                        placeholder="0" style={inputStyle} />
                    </div>
                  </div>

                  {newDesign.production_mode === 'open_to_tailors' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '4px' }}>Fabric Composition</label>
                          <input value={newFabric.fabric_composition}
                            onChange={(e) => setNewFabric(p => ({ ...p, fabric_composition: e.target.value }))}
                            placeholder="e.g. 100% Cotton" style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '4px' }}>Weight (GSM)</label>
                          <input type="number" value={newFabric.fabric_gsm}
                            onChange={(e) => setNewFabric(p => ({ ...p, fabric_gsm: parseInt(e.target.value) || '' }))}
                            placeholder="e.g. 180" style={inputStyle} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                          <input type="checkbox" checked={newFabric.lining_required}
                            onChange={(e) => setNewFabric(p => ({ ...p, lining_required: e.target.checked }))} />
                          Lining Required
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                          <input type="checkbox" checked={newFabric.interfacing_required}
                            onChange={(e) => setNewFabric(p => ({ ...p, interfacing_required: e.target.checked }))} />
                          Interfacing Required
                        </label>
                      </div>
                    </>
                  )}

                  <button onClick={addFabric} style={{
                    padding: '10px 20px', backgroundColor: '#1a1a1a', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
                  }}>
                    {newDesign.fabrics.length === 0 ? '💾 Save Fabric' : '💾 Save & Add Another'}
                  </button>
                </div>

                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', fontSize: '13px', color: '#92400e' }}>
                  ⚠️ You can skip this step if your design comes in one fabric only — add the fabric name in the construction notes instead.
                </div>
              </div>
            )}

            {/* STEP 4: ACCESSORIES */}
            {wizardStep === 4 && (
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '6px' }}>Accessories & Variances</h3>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
                  Add optional add-ons customers can choose. Fill in details then click Save.
                </p>

                {newDesign.accessories.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    {newDesign.accessories.map((acc, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 16px', backgroundColor: '#fefce8', borderRadius: '10px', marginBottom: '8px',
                        border: '1px solid #fde68a'
                      }}>
                        <div>
                          <span style={{ fontSize: '15px', fontWeight: '500' }}>✅ {acc.accessory_name}</span>
                          {acc.price_delta > 0 && <span style={{ color: '#16a34a', marginLeft: '8px' }}>+AED {acc.price_delta}</span>}
                          {!acc.is_optional && <span style={{ fontSize: '11px', backgroundColor: '#fee2e2', color: '#dc2626', marginLeft: '8px', padding: '2px 6px', borderRadius: '10px' }}>Included</span>}
                          {acc.description && <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{acc.description}</div>}
                        </div>
                        <button onClick={() => removeAccessory(i)} style={{
                          padding: '6px 12px', backgroundColor: '#fee2e2', color: '#dc2626',
                          border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                        }}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ backgroundColor: '#f9f9f9', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: '12px' }}>
                    {newDesign.accessories.length === 0 ? 'Add your first accessory:' : 'Add another accessory:'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '4px' }}>Accessory Name *</label>
                      <input value={newAccessory.accessory_name}
                        onChange={(e) => setNewAccessory(p => ({ ...p, accessory_name: e.target.value }))}
                        placeholder="e.g. Embroidered Collar" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '4px' }}>Additional Price (AED)</label>
                      <input type="number" value={newAccessory.price_delta}
                        onChange={(e) => setNewAccessory(p => ({ ...p, price_delta: parseFloat(e.target.value) || 0 }))}
                        placeholder="0" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '4px' }}>Description</label>
                    <input value={newAccessory.description}
                      onChange={(e) => setNewAccessory(p => ({ ...p, description: e.target.value }))}
                      placeholder="Describe this accessory..." style={inputStyle} />
                  </div>

                  {newDesign.production_mode === 'open_to_tailors' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '4px' }}>Dimensions</label>
                        <input value={newAccessory.dimensions}
                          onChange={(e) => setNewAccessory(p => ({ ...p, dimensions: e.target.value }))}
                          placeholder="e.g. 5cm × 3cm" style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '4px' }}>Placement</label>
                        <input value={newAccessory.placement}
                          onChange={(e) => setNewAccessory(p => ({ ...p, placement: e.target.value }))}
                          placeholder="e.g. Center chest" style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '4px' }}>Attachment Method</label>
                        <input value={newAccessory.attachment_method}
                          onChange={(e) => setNewAccessory(p => ({ ...p, attachment_method: e.target.value }))}
                          placeholder="e.g. Hand stitched" style={inputStyle} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input type="checkbox" checked={newAccessory.is_optional}
                        onChange={(e) => setNewAccessory(p => ({ ...p, is_optional: e.target.checked }))} />
                      Optional (customer can choose to add/remove)
                    </label>
                    <button onClick={addAccessory} style={{
                      padding: '10px 20px', backgroundColor: '#1a1a1a', color: 'white',
                      border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
                    }}>
                      {newDesign.accessories.length === 0 ? '💾 Save Accessory' : '💾 Save & Add Another'}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f5f0eb', borderRadius: '8px', fontSize: '13px', color: '#555' }}>
                  💡 You can skip this step if your design has no optional accessories.
                </div>
              </div>
            )}

            {/* STEP 5: REFERENCES (open_to_tailors only) */}
            {wizardStep === 5 && newDesign.production_mode === 'open_to_tailors' && (
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '6px' }}>Reference Images & Notes</h3>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
                  This goes directly to the tailor. Any clear image works — sketch, photo, or Pinterest screenshot.
                </p>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Reference Images</label>
                  <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
                    Need a template? <a href="https://www.canva.com/search/templates?q=fashion+flat" target="_blank" rel="noreferrer" style={{ color: '#1a1a1a', fontWeight: 'bold' }}>Free Canva fashion templates →</a>
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {[
                      { key: 'tech_sketch_front', label: 'Front Reference', hint: 'Front view — sketch, photo or any reference' },
                      { key: 'tech_sketch_back', label: 'Back Reference', hint: 'Back view — sketch, photo or any reference' },
                    ].map(({ key, label, hint }) => (
                      <div key={key} style={{ border: '2px dashed #ddd', borderRadius: '12px', padding: '20px', textAlign: 'center', backgroundColor: 'white' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>{label}</div>
                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>{hint}</div>
                        {newDesign[key] ? (
                          <div>
                            <img src={newDesign[key]} alt={label} style={{ width: '100%', height: '140px', objectFit: 'contain', borderRadius: '6px', marginBottom: '8px' }} />
                            <label style={{ cursor: 'pointer' }}>
                              <span style={{ fontSize: '12px', backgroundColor: '#1a1a1a', color: 'white', padding: '6px 12px', borderRadius: '6px' }}>
                                {uploading[`new-${key}`] ? '...' : '🔄 Replace'}
                              </span>
                              <input type="file" accept="image/*" style={{ display: 'none' }}
                                onChange={(e) => e.target.files[0] && handleNewDesignPhotoUpload(e.target.files[0], key)} />
                            </label>
                          </div>
                        ) : (
                          <label style={{ cursor: 'pointer' }}>
                            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📐</div>
                            <span style={{ fontSize: '12px', backgroundColor: '#1a1a1a', color: 'white', padding: '8px 16px', borderRadius: '8px' }}>
                              {uploading[`new-${key}`] ? 'Uploading...' : 'Upload Reference'}
                            </span>
                            <input type="file" accept="image/*" style={{ display: 'none' }}
                              onChange={(e) => e.target.files[0] && handleNewDesignPhotoUpload(e.target.files[0], key)} />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Spec Document (optional)</label>
                  <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>Any PDF with additional details — measurements, material specs, inspiration board.</p>
                  {newDesign.tech_pack_pdf ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                      <span style={{ fontSize: '24px' }}>📄</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#166534' }}>Document uploaded</div>
                        <a href={newDesign.tech_pack_pdf} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#16a34a' }}>View PDF</a>
                      </div>
                      <label style={{ cursor: 'pointer', marginLeft: 'auto' }}>
                        <span style={{ fontSize: '12px', backgroundColor: '#1a1a1a', color: 'white', padding: '6px 12px', borderRadius: '6px' }}>Replace</span>
                        <input type="file" accept=".pdf" style={{ display: 'none' }}
                          onChange={(e) => e.target.files[0] && handleTechPackUpload(e.target.files[0])} />
                      </label>
                    </div>
                  ) : (
                    <label style={{ cursor: 'pointer' }}>
                      <div style={{ border: '2px dashed #ddd', borderRadius: '10px', padding: '20px', textAlign: 'center', backgroundColor: 'white' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
                        <div style={{ fontSize: '14px', color: '#555' }}>{uploading['tech_pack'] ? 'Uploading...' : 'Upload Spec Document'}</div>
                      </div>
                      <input type="file" accept=".pdf" style={{ display: 'none' }}
                        onChange={(e) => e.target.files[0] && handleTechPackUpload(e.target.files[0])} />
                    </label>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Construction Notes</label>
                  <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>Plain language is fine — describe how you want it made.</p>
                  <textarea value={newDesign.construction_notes}
                    onChange={(e) => setNewDesign(p => ({ ...p, construction_notes: e.target.value }))}
                    placeholder="e.g.&#10;- French seams throughout&#10;- Blind hem on all edges&#10;- Invisible zip on left side seam"
                    rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>
            )}

            {/* REVIEW STEP */}
            {isReviewStep && (
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '6px' }}>Review & Submit</h3>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>Review your design before submitting for admin approval.</p>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                  {newDesign.photo_main && (
                    <img src={newDesign.photo_main} alt={newDesign.name}
                      style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '12px', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>{newDesign.name}</h4>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {newDesign.category && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px' }}>{newDesign.category}</span>}
                      {newDesign.gender && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px' }}>{newDesign.gender}</span>}
                      {newDesign.modesty_level && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px' }}>{newDesign.modesty_level}</span>}
                    </div>
                    {newDesign.description && <p style={{ fontSize: '13px', color: '#555' }}>{newDesign.description}</p>}
                  </div>
                </div>

                {[
                  { label: 'Base Price', value: `AED ${newDesign.base_price} (Your royalty: AED ${royalty.toFixed(2)})` },
                  { label: 'Production Mode', value: newDesign.production_mode === 'open_to_tailors' ? '🧵 Open to Tailors' : '✂️ Design + Produce' },
                  { label: 'Fabrics', value: newDesign.fabrics.length > 0 ? newDesign.fabrics.map(f => f.fabric_name).join(', ') : 'No fabrics added' },
                  { label: 'Accessories', value: newDesign.accessories.length > 0 ? newDesign.accessories.map(a => a.accessory_name).join(', ') : 'No accessories added' },
                  { label: 'Photos', value: [newDesign.photo_main && 'Front ✓', newDesign.photo_back && 'Back ✓', newDesign.photo_detail && 'Detail ✓', newDesign.photo_model && 'Model ✓'].filter(Boolean).join(', ') },
                  newDesign.production_mode === 'open_to_tailors' && { label: 'References', value: [newDesign.tech_sketch_front && 'Front ✓', newDesign.tech_sketch_back && 'Back ✓'].filter(Boolean).join(', ') || 'None uploaded' },
                  newDesign.production_mode === 'open_to_tailors' && { label: 'Spec Document', value: newDesign.tech_pack_pdf ? '✅ Uploaded' : 'Not uploaded' },
                ].filter(Boolean).map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontSize: '14px' }}>
                    <span style={{ color: '#888' }}>{row.label}</span>
                    <span style={{ fontWeight: '500', textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
                  </div>
                ))}

                <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fef3c7', borderRadius: '10px', fontSize: '13px', color: '#92400e' }}>
                  ⚠️ Once submitted, admin will review your design. You'll be notified when approved or if changes are needed.
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              {wizardStep > 1 && (
                <button onClick={() => setWizardStep(w => w - 1)} style={{
                  flex: 1, padding: '14px', backgroundColor: 'transparent', color: '#555',
                  border: '1px solid #ddd', borderRadius: '12px', fontSize: '15px', cursor: 'pointer'
                }}>← Back</button>
              )}
              {!isReviewStep ? (
                <button onClick={() => {
                  if (!canProceed()) {
                    if (wizardStep === 1) alert('Please fill in name, category and base price!')
                    if (wizardStep === 2) alert('Please upload the front photo!')
                    return
                  }
                  setWizardStep(w => w + 1)
                }} style={{
                  flex: 2, padding: '14px', backgroundColor: '#1a1a1a', color: 'white',
                  border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer'
                }}>Next →</button>
              ) : (
                <button onClick={handleSave} disabled={saving} style={{
                  flex: 2, padding: '14px', backgroundColor: '#16a34a', color: 'white',
                  border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer'
                }}>
                  {saving ? 'Submitting...' : '📤 Submit for Admin Review'}
                </button>
              )}
            </div>
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
                    <div style={{ width: '120px', minHeight: '120px', backgroundColor: '#f5f0eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {design.photo_main
                        ? <img src={design.photo_main} alt={design.name} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                        : <div style={{ fontSize: '36px' }}>🎨</div>
                      }
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

                      {design.fabrics?.length > 0 && (
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', color: '#888' }}>Fabrics: </span>
                          {design.fabrics.map(f => (
                            <span key={f.id} style={{ fontSize: '11px', backgroundColor: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: '20px', marginRight: '4px' }}>
                              {f.fabric_name}{f.price_delta > 0 ? ` +${f.price_delta}` : ''}
                            </span>
                          ))}
                        </div>
                      )}

                      {design.accessories?.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#888' }}>Accessories: </span>
                          {design.accessories.map(a => (
                            <span key={a.id} style={{ fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '20px', marginRight: '4px' }}>
                              {a.accessory_name}{a.price_delta > 0 ? ` +${a.price_delta}` : ''}
                            </span>
                          ))}
                        </div>
                      )}

                      {design.status === 'rejected' && design.construction_notes && (
                        <div style={{ fontSize: '12px', color: '#991b1b', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '6px', marginBottom: '8px' }}>
                          ❌ Rejection reason: {design.construction_notes}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        {['pending_review', 'rejected', 'draft'].includes(design.status) && (
                          <button onClick={() => handleDeleteDesign(design.id)} style={{
                            padding: '8px 14px', backgroundColor: '#fee2e2', color: '#dc2626',
                            border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'
                          }}>🗑️ Delete</button>
                        )}
                        {design.status === 'rejected' && (
                          <div style={{ padding: '8px 14px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                            ✏️ Edit & Resubmit — coming soon
                          </div>
                        )}
                      </div>
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