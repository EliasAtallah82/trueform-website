'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function AdminDesigns() {
  const [user, setUser] = useState(null)
  const [designs, setDesigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [selectedDesign, setSelectedDesign] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        fetchDesigns()
      }
    }
    init()
  }, [])

  const fetchDesigns = async () => {
    const { data: designsData } = await supabase
      .from('designs')
      .select('*')
      .order('created_at', { ascending: false })

    if (!designsData) { setDesigns([]); setLoading(false); return }

    // Fetch designer profiles
    const designerIds = [...new Set(designsData.map(d => d.designer_id))]
    const { data: designerData } = await supabase
      .from('designer_profiles')
      .select('id, display_name, royalty_percent, storefront_slug')
      .in('id', designerIds)

    // Fetch fabrics and accessories
    const designIds = designsData.map(d => d.id)
    const { data: fabricsData } = await supabase
      .from('design_fabrics').select('*').in('design_id', designIds)
    const { data: accessoriesData } = await supabase
      .from('design_accessories').select('*').in('design_id', designIds)

    const merged = designsData.map(d => ({
      ...d,
      designer: designerData?.find(dp => dp.id === d.designer_id) || null,
      fabrics: fabricsData?.filter(f => f.design_id === d.id) || [],
      accessories: accessoriesData?.filter(a => a.design_id === d.id) || []
    }))

    setDesigns(merged)
    setLoading(false)
  }

  const approveDesign = async (design) => {
    // If design_and_produce, go live directly
    // If open_to_tailors, send to tailors first
    const newStatus = design.production_mode === 'design_and_produce'
      ? 'live' : 'sent_to_tailors'

    await supabase.from('designs').update({ status: newStatus }).eq('id', design.id)

    // If open_to_tailors, create tailor_design_pricing rows for all approved tailors
    if (design.production_mode === 'open_to_tailors') {
      const { data: tailors } = await supabase
        .from('tailor_profiles')
        .select('user_id')
        .eq('is_approved', true)

      if (tailors && tailors.length > 0) {
        await supabase.from('tailor_design_pricing').insert(
          tailors.map(t => ({
            tailor_id: t.user_id,
            design_id: design.id,
            base_cost: 0,
            status: 'pending'
          }))
        )
      }
    }

    setDesigns(designs.map(d => d.id === design.id ? { ...d, status: newStatus } : d))
    setSelectedDesign(null)
    alert(design.production_mode === 'design_and_produce'
      ? '✅ Design approved and now LIVE!'
      : '✅ Design approved and sent to tailors for pricing!')
  }

  const rejectDesign = async (designId) => {
    if (!rejectionReason) { alert('Please provide a rejection reason!'); return }
    await supabase.from('designs').update({
      status: 'rejected',
      construction_notes: rejectionReason
    }).eq('id', designId)
    setDesigns(designs.map(d => d.id === designId ? { ...d, status: 'rejected' } : d))
    setShowRejectModal(null)
    setRejectionReason('')
    setSelectedDesign(null)
    alert('❌ Design rejected. Designer will be notified.')
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const pendingDesigns = designs.filter(d => d.status === 'pending_review')
  const sentDesigns = designs.filter(d => d.status === 'sent_to_tailors')
  const liveDesigns = designs.filter(d => d.status === 'live')
  const rejectedDesigns = designs.filter(d => d.status === 'rejected')

  const filteredDesigns = activeTab === 'pending' ? pendingDesigns
    : activeTab === 'sent' ? sentDesigns
    : activeTab === 'live' ? liveDesigns
    : rejectedDesigns

  const getStatusBadge = (status) => {
    const map = {
      pending_review: { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending Review' },
      sent_to_tailors: { bg: '#eff6ff', color: '#1e40af', label: '📬 Sent to Tailors' },
      live: { bg: '#dcfce7', color: '#166534', label: '🟢 Live' },
      rejected: { bg: '#fee2e2', color: '#991b1b', label: '❌ Rejected' },
    }
    const s = map[status] || map.pending_review
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
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm — Admin</h1>
        <a href="/dashboard/admin" style={{ color: 'white', fontSize: '14px' }}>← Back to Dashboard</a>
      </nav>

      <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>🎨 Design Reviews</h2>
          <p style={{ color: '#888', fontSize: '14px' }}>
            {pendingDesigns.length} pending · {sentDesigns.length} sent to tailors · {liveDesigns.length} live · {rejectedDesigns.length} rejected
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { key: 'pending', label: `⏳ Pending (${pendingDesigns.length})`, highlight: pendingDesigns.length > 0 },
            { key: 'sent', label: `📬 Sent to Tailors (${sentDesigns.length})` },
            { key: 'live', label: `🟢 Live (${liveDesigns.length})` },
            { key: 'rejected', label: `❌ Rejected (${rejectedDesigns.length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
              backgroundColor: activeTab === tab.key ? '#1a1a1a' : tab.highlight ? '#fef3c7' : 'white',
              color: activeTab === tab.key ? 'white' : tab.highlight ? '#92400e' : '#555',
              border: activeTab === tab.key ? 'none' : tab.highlight ? '2px solid #f59e0b' : '1px solid #ddd',
              fontWeight: activeTab === tab.key || tab.highlight ? 'bold' : 'normal'
            }}>{tab.label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>Loading designs...</div>
        ) : filteredDesigns.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '60px', textAlign: 'center', color: '#888' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>No designs here</h3>
            <p>Designs submitted by designers will appear here for review.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredDesigns.map(design => (
              <div key={design.id} style={{
                backgroundColor: 'white', borderRadius: '16px',
                border: design.status === 'pending_review' ? '2px solid #f59e0b' : '1px solid #e0e0e0',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex' }}>
                  {/* Photo */}
                  <div style={{ width: '160px', minHeight: '160px', backgroundColor: '#f5f0eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {design.photo_main
                      ? <img src={design.photo_main} alt={design.name} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                      : <div style={{ fontSize: '48px' }}>🎨</div>
                    }
                  </div>

                  {/* Content */}
                  <div style={{ padding: '20px', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h3 style={{ fontWeight: 'bold', fontSize: '18px' }}>{design.name}</h3>
                          {getStatusBadge(design.status)}
                        </div>
                        <div style={{ fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                          by <strong>{design.designer?.display_name || 'Unknown'}</strong> · Royalty: {design.royalty_percent}%
                          {design.production_mode === 'design_and_produce' && <span style={{ marginLeft: '8px', color: '#1e40af' }}>✂️ Design + Produce</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {design.category && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px' }}>{design.category}</span>}
                          {design.gender && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px' }}>{design.gender}</span>}
                          {design.modesty_level && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px' }}>{design.modesty_level}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '18px' }}>AED {design.base_price}</div>
                        <div style={{ fontSize: '12px', color: '#16a34a' }}>
                          Designer royalty: AED {(design.base_price / 1.05 * design.royalty_percent / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {design.description && (
                      <p style={{ fontSize: '13px', color: '#555', marginBottom: '10px' }}>{design.description}</p>
                    )}

                    {/* Fabrics */}
                    {design.fabrics?.length > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#888' }}>Fabrics: </span>
                        {design.fabrics.map(f => (
                          <span key={f.id} style={{ fontSize: '11px', backgroundColor: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: '20px', marginRight: '4px' }}>
                            {f.fabric_name}{f.price_delta > 0 ? ` +AED ${f.price_delta}` : ''}
                            {f.fabric_composition ? ` (${f.fabric_composition})` : ''}
                            {f.fabric_gsm ? ` ${f.fabric_gsm}GSM` : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Accessories */}
                    {design.accessories?.length > 0 && (
                      <div style={{ marginBottom: '10px' }}>
                        <span style={{ fontSize: '12px', color: '#888' }}>Accessories: </span>
                        {design.accessories.map(a => (
                          <span key={a.id} style={{ fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '20px', marginRight: '4px' }}>
                            {a.accessory_name}{a.price_delta > 0 ? ` +AED ${a.price_delta}` : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Tech assets */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      {design.tech_sketch_front && (
                        <a href={design.tech_sketch_front} target="_blank" rel="noreferrer" style={{
                          fontSize: '12px', padding: '4px 10px', backgroundColor: '#eff6ff', color: '#1e40af',
                          borderRadius: '6px', textDecoration: 'none'
                        }}>📐 Front Reference</a>
                      )}
                      {design.tech_sketch_back && (
                        <a href={design.tech_sketch_back} target="_blank" rel="noreferrer" style={{
                          fontSize: '12px', padding: '4px 10px', backgroundColor: '#eff6ff', color: '#1e40af',
                          borderRadius: '6px', textDecoration: 'none'
                        }}>📐 Back Reference</a>
                      )}
                      {design.tech_pack_pdf && (
                        <a href={design.tech_pack_pdf} target="_blank" rel="noreferrer" style={{
                          fontSize: '12px', padding: '4px 10px', backgroundColor: '#f0fdf4', color: '#166534',
                          borderRadius: '6px', textDecoration: 'none'
                        }}>📄 Spec Document</a>
                      )}
                      {design.photo_back && (
                        <a href={design.photo_back} target="_blank" rel="noreferrer" style={{
                          fontSize: '12px', padding: '4px 10px', backgroundColor: '#f5f0eb', color: '#1a1a1a',
                          borderRadius: '6px', textDecoration: 'none'
                        }}>📷 Back Photo</a>
                      )}
                    </div>

                    {design.construction_notes && design.status !== 'rejected' && (
                      <div style={{ fontSize: '12px', color: '#555', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginBottom: '12px' }}>
                        🔧 <strong>Construction Notes:</strong> {design.construction_notes}
                      </div>
                    )}

                    {design.status === 'rejected' && design.construction_notes && (
                      <div style={{ fontSize: '12px', color: '#991b1b', padding: '10px', backgroundColor: '#fee2e2', borderRadius: '8px', marginBottom: '12px' }}>
                        ❌ <strong>Rejection Reason:</strong> {design.construction_notes}
                      </div>
                    )}

                    {/* Actions */}
                    {design.status === 'pending_review' && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => approveDesign(design)} style={{
                          padding: '10px 20px', backgroundColor: '#16a34a', color: 'white',
                          border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
                        }}>
                          {design.production_mode === 'design_and_produce' ? '✅ Approve & Go Live' : '✅ Approve & Send to Tailors'}
                        </button>
                        <button onClick={() => setShowRejectModal(design.id)} style={{
                          padding: '10px 20px', backgroundColor: '#fee2e2', color: '#dc2626',
                          border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
                        }}>❌ Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '90%' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>❌ Reject Design</h3>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>
              Please provide a reason. The designer will see this and can resubmit after making changes.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {[
                'Photos not clear enough — please upload better quality photos',
                'Price too low — does not cover production costs',
                'Price too high — not competitive for this category',
                'Design too similar to existing catalog item',
                'Missing reference images — please upload front and back views',
                'Construction notes insufficient — please add more detail',
                'Design not suitable for the UAE market',
              ].map(reason => (
                <button key={reason} onClick={() => setRejectionReason(reason)} style={{
                  padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '13px',
                  border: rejectionReason === reason ? '2px solid #dc2626' : '2px solid #e0e0e0',
                  backgroundColor: rejectionReason === reason ? '#fee2e2' : 'white',
                  color: rejectionReason === reason ? '#dc2626' : '#555'
                }}>{reason}</button>
              ))}
            </div>
            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Or type a custom reason..." rows={3}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', marginBottom: '16px', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowRejectModal(null); setRejectionReason('') }} style={{
                flex: 1, padding: '12px', backgroundColor: 'transparent', color: '#888',
                border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer'
              }}>Cancel</button>
              <button onClick={() => rejectDesign(showRejectModal)} style={{
                flex: 2, padding: '12px', backgroundColor: '#dc2626', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
              }}>Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}