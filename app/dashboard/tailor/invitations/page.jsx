'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function TailorInvitations() {
  const [user, setUser] = useState(null)
  const [invitations, setInvitations] = useState([])
  const [activeTab, setActiveTab] = useState('pending')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        fetchInvitations(data.user.id)
      }
    }
    init()
  }, [])

  const fetchInvitations = async (userId) => {
    const { data } = await supabase
      .from('tailor_catalog_items')
      .select('*, catalog(*)')
      .eq('tailor_id', userId)
      .order('created_at', { ascending: false })
    setInvitations(data || [])
  }

  const handleAccept = async (id, catalogId) => {
    setLoading(true)
    await supabase.from('tailor_catalog_items')
      .update({ status: 'accepted' })
      .eq('id', id)
    setInvitations(invitations.map(inv =>
      inv.id === id ? { ...inv, status: 'accepted' } : inv
    ))
    setLoading(false)
    alert('✅ You have accepted this item! It is now in your active catalog.')
  }

  const handleDecline = async (id) => {
    setLoading(true)
    await supabase.from('tailor_catalog_items')
      .update({ status: 'declined' })
      .eq('id', id)
    setInvitations(invitations.map(inv =>
      inv.id === id ? { ...inv, status: 'declined' } : inv
    ))
    setLoading(false)
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const filteredInvitations = invitations.filter(inv => inv.status === activeTab)

  const calcPricing = (price) => {
    const selling = parseFloat(price) || 0
    const tailorCut = (selling / 1.05 * 0.85).toFixed(2)
    return tailorCut
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: { backgroundColor: '#fef3c7', color: '#92400e' },
      accepted: { backgroundColor: '#dcfce7', color: '#166534' },
      declined: { backgroundColor: '#fee2e2', color: '#991b1b' }
    }
    const labels = {
      pending: '⏳ Pending',
      accepted: '✅ Accepted',
      declined: '❌ Declined'
    }
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
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>📬 Item Invitations</h2>
          <p style={{ color: '#888', fontSize: '14px' }}>
            TrueForm has invited you to fulfill these items based on your skills
          </p>
        </div>

        {/* Info Banner */}
        <div style={{
          backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: '12px', padding: '16px', marginBottom: '24px',
          fontSize: '14px', color: '#1e40af'
        }}>
          💡 Accept items to add them to your catalog and start receiving orders!
          The more items you accept, the more orders you can receive.
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { key: 'pending', label: `Pending (${invitations.filter(i => i.status === 'pending').length})` },
            { key: 'accepted', label: `Accepted (${invitations.filter(i => i.status === 'accepted').length})` },
            { key: 'declined', label: `Declined (${invitations.filter(i => i.status === 'declined').length})` },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
              backgroundColor: activeTab === tab.key ? '#1a1a1a' : 'white',
              color: activeTab === tab.key ? 'white' : '#555',
              border: activeTab === tab.key ? 'none' : '1px solid #ddd'
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Invitations List */}
        {filteredInvitations.length === 0 ? (
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', padding: '60px',
            textAlign: 'center', color: '#888'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>No {activeTab} invitations</h3>
            <p>{activeTab === 'pending' ? 'Check back later for new invitations!' : `No ${activeTab} invitations yet`}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredInvitations.map((inv) => {
              const item = inv.catalog
              if (!item) return null
              return (
                <div key={inv.id} style={{
                  backgroundColor: 'white', borderRadius: '16px',
                  overflow: 'hidden', border: '1px solid #e0e0e0'
                }}>
                  <div style={{ display: 'flex', gap: '0' }}>
                    {/* Photo */}
                    <div style={{ width: '180px', minHeight: '180px', backgroundColor: '#f5f0eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.photo_main ? (
                        <img src={item.photo_main} alt={item.name}
                          style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ fontSize: '48px' }}>👔</div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '24px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <h3 style={{ fontWeight: 'bold', fontSize: '18px' }}>{item.name}</h3>
                            {getStatusBadge(inv.status)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#888' }}>
                            Invited {new Date(inv.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>AED {item.price}</div>
                          <div style={{ fontSize: '12px', color: '#888' }}>selling price</div>
                        </div>
                      </div>

                      {/* Item Details */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {item.category && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.category}</span>}
                        {item.gender && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.gender}</span>}
                        {item.modesty_level && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.modesty_level}</span>}
                        {item.fabrics && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.fabrics}</span>}
                      </div>

                      {item.description && (
                        <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>{item.description}</p>
                      )}

                      {/* Earnings */}
                      <div style={{
                        backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
                        borderRadius: '10px', padding: '12px', marginBottom: '16px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#555' }}>Your earnings per item:</span>
                          <span style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '16px' }}>
                            AED {calcPricing(item.price)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                          <span style={{ color: '#888' }}>Turnaround required:</span>
                          <span style={{ color: '#555' }}>{item.turnaround_days} days</span>
                        </div>
                      </div>

                      {/* Actions */}
                      {inv.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button onClick={() => handleAccept(inv.id, inv.catalog_id)}
                            disabled={loading} style={{
                              flex: 1, padding: '12px', backgroundColor: '#16a34a', color: 'white',
                              border: 'none', borderRadius: '8px', cursor: 'pointer',
                              fontWeight: 'bold', fontSize: '14px'
                            }}>
                            ✅ Accept & Add to My Catalog
                          </button>
                          <button onClick={() => handleDecline(inv.id)}
                            disabled={loading} style={{
                              padding: '12px 20px', backgroundColor: '#fee2e2', color: '#dc2626',
                              border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px'
                            }}>
                            Decline
                          </button>
                        </div>
                      )}

                      {inv.status === 'accepted' && (
                        <div style={{
                          padding: '12px', backgroundColor: '#dcfce7',
                          borderRadius: '8px', fontSize: '13px', color: '#166534'
                        }}>
                          ✅ You accepted this item — you may receive orders for it!
                        </div>
                      )}

                      {inv.status === 'declined' && (
                        <div style={{
                          padding: '12px', backgroundColor: '#fee2e2',
                          borderRadius: '8px', fontSize: '13px', color: '#991b1b'
                        }}>
                          ❌ You declined this item.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}