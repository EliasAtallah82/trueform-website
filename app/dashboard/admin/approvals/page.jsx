'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function AdminApprovals() {
  const [user, setUser] = useState(null)
  const [items, setItems] = useState([])
  const [bids, setBids] = useState([])
  const [activeTab, setActiveTab] = useState('pending')
  const [rejectionReason, setRejectionReason] = useState({})
  const [loading, setLoading] = useState(false)
  const [generatingPhotos, setGeneratingPhotos] = useState({})

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        fetchItems()
        fetchBids()
      }
    }
    init()
  }, [])

  const fetchItems = async () => {
    const { data } = await supabase
      .from('catalog')
      .select('*')
      .order('created_at', { ascending: false })
    setItems(data || [])
  }

  const fetchBids = async () => {
    const { data } = await supabase
      .from('tailor_catalog_items')
      .select('*, catalog(*), profiles(full_name, email)')
      .eq('status', 'price_submitted')
      .order('tailor_price', { ascending: true })
    setBids(data || [])
  }

  // ── Catalog item actions ──────────────────────────────────────────

  const handleApprove = async (id) => {
    setLoading(true)
    await supabase.from('catalog').update({
      status: 'approved', is_active: true, rejection_reason: null
    }).eq('id', id)
    setItems(items.map(item => item.id === id ? { ...item, status: 'approved', is_active: true } : item))
    setLoading(false)
  }

  const handleReject = async (id) => {
    const reason = rejectionReason[id]
    if (!reason) { alert('Please provide a rejection reason!'); return }
    setLoading(true)
    await supabase.from('catalog').update({
      status: 'rejected', is_active: false, rejection_reason: reason
    }).eq('id', id)
    setItems(items.map(item => item.id === id ? { ...item, status: 'rejected', rejection_reason: reason } : item))
    setRejectionReason({ ...rejectionReason, [id]: '' })
    setLoading(false)
  }

  // ── Tailor bid actions ────────────────────────────────────────────

  const handleApproveBid = async (bid) => {
    setLoading(true)
    await supabase.from('tailor_catalog_items')
      .update({ status: 'approved' })
      .eq('id', bid.id)
    setBids(bids.filter(b => b.id !== bid.id))
    setLoading(false)
    alert(`✅ ${bid.profiles?.full_name || 'Tailor'} approved for "${bid.catalog?.name}" at AED ${bid.tailor_price}`)
  }

  const handleRejectBid = async (bid) => {
    if (!rejectionReason[bid.id]) { alert('Please provide a rejection reason!'); return }
    setLoading(true)
    await supabase.from('tailor_catalog_items')
      .update({ status: 'rejected' })
      .eq('id', bid.id)
    setBids(bids.filter(b => b.id !== bid.id))
    setRejectionReason({ ...rejectionReason, [bid.id]: '' })
    setLoading(false)
  }

  // ── AI Photo generation ───────────────────────────────────────────

  const generatePhotosForItem = async (item) => {
    setGeneratingPhotos(prev => ({ ...prev, [item.id]: 'generating' }))
    const basePrompt = item.ai_prompt || [
      'Professional fashion photography',
      item.name, item.category,
      item.gender && `for ${item.gender}`,
      item.colors && `in ${item.colors}`,
      item.fabrics && `made of ${item.fabrics}`,
      item.modesty_level && `${item.modesty_level} style`,
      item.description,
      'white background', 'studio lighting',
      'high quality commercial fashion photography', 'no model', 'flat lay or mannequin'
    ].filter(Boolean).join(', ')

    try {
      const photoTypes = [
        { key: 'photo_main', angle: 'front view, white background' },
        { key: 'photo_back', angle: 'back view, white background' },
        { key: 'photo_detail', angle: 'close up detail shot, white background' },
        { key: 'photo_model', angle: 'worn on mannequin, white background' }
      ]
      const updates = {}
      for (const photo of photoTypes) {
        const fullPrompt = basePrompt.replace('front view', photo.angle)
        const res = await fetch('/api/generate-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: fullPrompt })
        })
        const data = await res.json()
        if (data.url) {
          const imageRes = await fetch(data.url)
          const blob = await imageRes.blob()
          const file = new File([blob], `${photo.key}.png`, { type: 'image/png' })
          const fileName = `${Date.now()}-${item.id}-${photo.key}.png`
          const { error } = await supabase.storage.from('catalog-photos').upload(fileName, file)
          if (!error) {
            const { data: urlData } = supabase.storage.from('catalog-photos').getPublicUrl(fileName)
            updates[photo.key] = urlData.publicUrl
          }
        }
      }
      await supabase.from('catalog').update(updates).eq('id', item.id)
      setItems(items.map(i => i.id === item.id ? { ...i, ...updates } : i))
      setGeneratingPhotos(prev => ({ ...prev, [item.id]: 'done' }))
      alert(`✅ AI photos generated for "${item.name}"!`)
    } catch (error) {
      alert('Error generating photos: ' + error.message)
      setGeneratingPhotos(prev => ({ ...prev, [item.id]: null }))
    }
  }

  const generateAllPhotos = async (approvedItems) => {
    if (!confirm(`Generate AI photos for all ${approvedItems.length} approved items without photos? This may take a few minutes.`)) return
    for (const item of approvedItems) await generatePhotosForItem(item)
    alert('✅ All photos generated!')
  }

  const uploadPhoto = async (file, itemId, photoType) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${itemId}-${photoType}.${fileExt}`
    const { error } = await supabase.storage.from('catalog-photos').upload(fileName, file)
    if (error) { alert('Upload error: ' + error.message); return }
    const { data: urlData } = supabase.storage.from('catalog-photos').getPublicUrl(fileName)
    await supabase.from('catalog').update({ [photoType]: urlData.publicUrl }).eq('id', itemId)
    setItems(items.map(item => item.id === itemId ? { ...item, [photoType]: urlData.publicUrl } : item))
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const pendingItems = items.filter(i => i.status === 'pending')
  const approvedItems = items.filter(i => i.status === 'approved')
  const rejectedItems = items.filter(i => i.status === 'rejected')
  const approvedWithoutPhotos = approvedItems.filter(i => !i.photo_main)

  const filteredItems = activeTab === 'pending' ? pendingItems
    : activeTab === 'approved' ? approvedItems
    : activeTab === 'rejected' ? rejectedItems : []

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

  // Group bids by catalog item
  const bidsByItem = bids.reduce((acc, bid) => {
    const key = bid.catalog_id
    if (!acc[key]) acc[key] = []
    acc[key].push(bid)
    return acc
  }, {})

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f0eb' }}>
      <nav style={{
        backgroundColor: '#1a1a1a', padding: '16px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm — Admin</h1>
        <a href="/dashboard/admin" style={{ color: 'white', fontSize: '14px' }}>← Back to Dashboard</a>
      </nav>

      <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>📋 Approvals</h2>
          <p style={{ color: '#888', fontSize: '14px' }}>Review tailor submissions, bids and generate AI photos</p>
        </div>

        {/* Generate All Photos Banner */}
        {approvedWithoutPhotos.length > 0 && (
          <div style={{
            backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '20px',
            marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{ color: 'white', fontWeight: 'bold', marginBottom: '4px' }}>
                🤖 {approvedWithoutPhotos.length} approved item(s) need AI photos
              </div>
              <div style={{ color: '#aaa', fontSize: '13px' }}>Generate all at once or individually below</div>
            </div>
            <button onClick={() => generateAllPhotos(approvedWithoutPhotos)} style={{
              padding: '10px 20px', backgroundColor: '#7c3aed', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
            }}>🤖 Generate All Photos</button>
          </div>
        )}

        {/* Tailor Bids Banner */}
        {bids.length > 0 && activeTab !== 'bids' && (
          <div style={{
            backgroundColor: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: '12px', padding: '16px', marginBottom: '24px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '2px' }}>
                💰 {bids.length} tailor bid(s) waiting for your review
              </div>
              <div style={{ fontSize: '13px', color: '#b45309' }}>
                Tailors have submitted their prices for admin range items
              </div>
            </div>
            <button onClick={() => setActiveTab('bids')} style={{
              padding: '10px 20px', backgroundColor: '#92400e', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
            }}>Review Bids →</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { key: 'pending', label: `Pending (${pendingItems.length})` },
            { key: 'approved', label: `Approved (${approvedItems.length})` },
            { key: 'rejected', label: `Rejected (${rejectedItems.length})` },
            { key: 'bids', label: `💰 Tailor Bids (${bids.length})`, highlight: bids.length > 0 },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
              backgroundColor: activeTab === tab.key ? '#1a1a1a' : tab.highlight ? '#fef3c7' : 'white',
              color: activeTab === tab.key ? 'white' : tab.highlight ? '#92400e' : '#555',
              border: activeTab === tab.key ? 'none' : tab.highlight ? '1px solid #fde68a' : '1px solid #ddd',
              fontWeight: tab.highlight ? 'bold' : 'normal'
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ── TAILOR BIDS TAB ── */}
        {activeTab === 'bids' && (
          <div>
            {Object.keys(bidsByItem).length === 0 ? (
              <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '60px', textAlign: 'center', color: '#888' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
                <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>No pending bids</h3>
                <p>Tailor price submissions will appear here</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {Object.entries(bidsByItem).map(([catalogId, itemBids]) => {
                  const catalogItem = itemBids[0]?.catalog
                  if (!catalogItem) return null
                  const sortedBids = [...itemBids].sort((a, b) => a.tailor_price - b.tailor_price)

                  return (
                    <div key={catalogId} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #e0e0e0' }}>

                      {/* Item Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e0e0e0' }}>
                        <div style={{ width: '60px', height: '60px', backgroundColor: '#f5f0eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {catalogItem.photo_main
                            ? <img src={catalogItem.photo_main} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                            : <span style={{ fontSize: '24px' }}>👔</span>
                          }
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>{catalogItem.name}</h3>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {catalogItem.category && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px' }}>{catalogItem.category}</span>}
                            {catalogItem.gender && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px' }}>{catalogItem.gender}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', color: '#888' }}>Selling price</div>
                          <div style={{ fontWeight: 'bold', fontSize: '20px' }}>AED {catalogItem.price}</div>
                        </div>
                      </div>

                      {/* Bids info */}
                      <div style={{ fontSize: '13px', color: '#555', marginBottom: '16px' }}>
                        <span style={{ fontWeight: 'bold' }}>{sortedBids.length} tailor(s)</span> submitted prices — sorted cheapest first. Approve the ones you want for this item.
                      </div>

                      {/* Bids list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {sortedBids.map((bid, index) => {
                          const margin = catalogItem.price ? ((catalogItem.price / 1.05 - bid.tailor_price) / (catalogItem.price / 1.05) * 100).toFixed(0) : 0
                          const trueformEarning = catalogItem.price ? (catalogItem.price / 1.05 - bid.tailor_price).toFixed(2) : 0

                          return (
                            <div key={bid.id} style={{
                              border: index === 0 ? '2px solid #16a34a' : '1px solid #e0e0e0',
                              borderRadius: '12px', padding: '16px',
                              backgroundColor: index === 0 ? '#f0fdf4' : 'white'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    {index === 0 && (
                                      <span style={{ fontSize: '11px', backgroundColor: '#16a34a', color: 'white', padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold' }}>
                                        🏆 Cheapest
                                      </span>
                                    )}
                                    <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                                      {bid.profiles?.full_name || 'Tailor'}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#888' }}>
                                    {bid.profiles?.email} · Submitted {new Date(bid.price_updated_at || bid.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: index === 0 ? '#16a34a' : '#1a1a1a' }}>
                                    AED {bid.tailor_price}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#888' }}>tailor's price</div>
                                </div>
                              </div>

                              {/* Margin breakdown */}
                              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                <div style={{ flex: 1, backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>TrueForm earns</div>
                                  <div style={{ fontWeight: 'bold', color: '#1a1a1a' }}>AED {trueformEarning}</div>
                                </div>
                                <div style={{ flex: 1, backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>TrueForm margin</div>
                                  <div style={{ fontWeight: 'bold', color: margin >= 30 ? '#16a34a' : '#dc2626' }}>{margin}%</div>
                                </div>
                                <div style={{ flex: 1, backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Tailor share</div>
                                  <div style={{ fontWeight: 'bold' }}>{(100 - margin)}%</div>
                                </div>
                              </div>

                              {/* Approve / Reject bid */}
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <button onClick={() => handleApproveBid(bid)} disabled={loading} style={{
                                  padding: '10px 20px', backgroundColor: '#16a34a', color: 'white',
                                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'
                                }}>
                                  ✅ Approve
                                </button>
                                <div style={{ flex: 1 }}>
                                  <input
                                    value={rejectionReason[bid.id] || ''}
                                    onChange={(e) => setRejectionReason({ ...rejectionReason, [bid.id]: e.target.value })}
                                    placeholder="Rejection reason (required)..."
                                    style={{
                                      width: '100%', padding: '10px', borderRadius: '8px',
                                      border: '1px solid #ddd', fontSize: '13px',
                                      boxSizing: 'border-box', marginBottom: '8px'
                                    }}
                                  />
                                  <button onClick={() => handleRejectBid(bid)} disabled={loading} style={{
                                    padding: '10px 20px', backgroundColor: '#dc2626', color: 'white',
                                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'
                                  }}>
                                    ❌ Reject
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CATALOG ITEMS TABS ── */}
        {activeTab !== 'bids' && (
          <>
            {filteredItems.length === 0 ? (
              <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '60px', textAlign: 'center', color: '#888' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>No {activeTab} items</h3>
                <p>All caught up!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {filteredItems.map((item) => (
                  <div key={item.id} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #e0e0e0' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                          <h3 style={{ fontWeight: 'bold', fontSize: '18px' }}>{item.name}</h3>
                          {getStatusBadge(item.status)}
                          <span style={{ fontSize: '11px', backgroundColor: item.created_by === 'admin' ? '#dbeafe' : '#f0fdf4', color: item.created_by === 'admin' ? '#1e40af' : '#166534', padding: '2px 8px', borderRadius: '20px' }}>
                            {item.created_by === 'admin' ? '👑 Admin range' : '✂️ Tailor range'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#888' }}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '18px' }}>AED {item.price}</div>
                    </div>

                    {/* Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                      {[
                        { label: 'Category', value: item.category },
                        { label: 'Gender', value: item.gender },
                        { label: 'Modesty', value: item.modesty_level },
                        { label: 'Occasion', value: item.occasion },
                        { label: 'Fabrics', value: item.fabrics },
                        { label: 'Colors', value: item.colors },
                        { label: 'Turnaround', value: `${item.turnaround_days} days` },
                        item.created_by === 'tailor' && { label: 'Tailor cut (15%)', value: `AED ${(item.price / 1.05 * 0.85).toFixed(2)}` },
                        item.created_by === 'tailor' && { label: 'TrueForm fee (15%)', value: `AED ${(item.price / 1.05 * 0.15).toFixed(2)}` },
                      ].filter(Boolean).map((field) => field.value && (
                        <div key={field.label} style={{ backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                          <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>{field.label}</div>
                          <div style={{ fontSize: '13px', fontWeight: '500' }}>{field.value}</div>
                        </div>
                      ))}
                    </div>

                    {item.description && (
                      <p style={{ fontSize: '13px', color: '#555', marginBottom: '16px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                        {item.description}
                      </p>
                    )}

                    {item.ai_prompt && (
                      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>🤖 AI Photo Prompt:</div>
                        <div style={{ fontSize: '12px', color: '#fff', lineHeight: '1.5' }}>{item.ai_prompt}</div>
                      </div>
                    )}

                    {/* Photos */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Photos:</div>
                        {item.status === 'approved' && !item.photo_main && (
                          <button onClick={() => generatePhotosForItem(item)}
                            disabled={generatingPhotos[item.id] === 'generating'} style={{
                              padding: '8px 16px', backgroundColor: '#7c3aed', color: 'white',
                              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'
                            }}>
                            {generatingPhotos[item.id] === 'generating' ? '🔄 Generating...' : '🤖 Generate AI Photos'}
                          </button>
                        )}
                        {generatingPhotos[item.id] === 'done' && (
                          <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 'bold' }}>✅ Photos generated!</span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                        {[
                          { key: 'photo_main', label: '⭐ Front View' },
                          { key: 'photo_back', label: 'Back View' },
                          { key: 'photo_detail', label: 'Detail Shot' },
                          { key: 'photo_model', label: 'On Model' },
                        ].map((photo) => (
                          <div key={photo.key} style={{
                            border: photo.key === 'photo_main' ? '2px solid #1a1a1a' : '1px dashed #ddd',
                            borderRadius: '10px', padding: '10px', textAlign: 'center',
                            backgroundColor: photo.key === 'photo_main' ? '#f5f0eb' : 'white'
                          }}>
                            <div style={{ fontSize: '11px', marginBottom: '6px', fontWeight: photo.key === 'photo_main' ? 'bold' : 'normal' }}>
                              {photo.label}
                            </div>
                            {item[photo.key] ? (
                              <img src={item[photo.key]} alt={photo.label}
                                style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px' }} />
                            ) : (
                              <div>
                                <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                                  {generatingPhotos[item.id] === 'generating' ? '🔄' : '📷'}
                                </div>
                                <label style={{ cursor: 'pointer' }}>
                                  <span style={{ fontSize: '10px', backgroundColor: '#1a1a1a', color: 'white', padding: '4px 8px', borderRadius: '4px' }}>Upload</span>
                                  <input type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0], item.id, photo.key)} />
                                </label>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Approve / Reject */}
                    {item.status === 'pending' && (
                      <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <button onClick={() => handleApprove(item.id)} disabled={loading} style={{
                            padding: '10px 24px', backgroundColor: '#16a34a', color: 'white',
                            border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
                          }}>✅ Approve</button>
                          <div style={{ flex: 1 }}>
                            <input
                              value={rejectionReason[item.id] || ''}
                              onChange={(e) => setRejectionReason({ ...rejectionReason, [item.id]: e.target.value })}
                              placeholder="Rejection reason (required to reject)..."
                              style={{
                                width: '100%', padding: '10px', borderRadius: '8px',
                                border: '1px solid #ddd', fontSize: '13px',
                                boxSizing: 'border-box', marginBottom: '8px'
                              }}
                            />
                            <button onClick={() => handleReject(item.id)} disabled={loading} style={{
                              padding: '10px 24px', backgroundColor: '#dc2626', color: 'white',
                              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
                            }}>❌ Reject</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {item.status === 'rejected' && item.rejection_reason && (
                      <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fee2e2', borderRadius: '8px', fontSize: '13px', color: '#991b1b' }}>
                        ❌ Rejection reason: {item.rejection_reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}