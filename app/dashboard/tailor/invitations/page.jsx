'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function TailorInvitations() {
  const [user, setUser] = useState(null)
  const [invitations, setInvitations] = useState([])
  const [activeTab, setActiveTab] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [priceInputs, setPriceInputs] = useState({})
  const [editingPrice, setEditingPrice] = useState({})

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

  const handleSubmitPrice = async (inv) => {
    const price = parseFloat(priceInputs[inv.id])
    if (!price || price <= 0) {
      alert('Please enter a valid price!')
      return
    }
    setLoading(true)
    await supabase.from('tailor_catalog_items').update({
      tailor_price: price,
      status: 'price_submitted',
      price_updated_at: new Date().toISOString()
    }).eq('id', inv.id)
    setInvitations(invitations.map(i =>
      i.id === inv.id ? { ...i, tailor_price: price, status: 'price_submitted', price_updated_at: new Date().toISOString() } : i
    ))
    setPriceInputs({ ...priceInputs, [inv.id]: '' })
    setLoading(false)
    alert('✅ Your price has been submitted! TrueForm will review and get back to you.')
  }

  const handleUpdatePrice = async (inv) => {
    const price = parseFloat(priceInputs[inv.id])
    if (!price || price <= 0) {
      alert('Please enter a valid price!')
      return
    }
    setLoading(true)
    await supabase.from('tailor_catalog_items').update({
      tailor_price: price,
      price_updated_at: new Date().toISOString()
    }).eq('id', inv.id)
    setInvitations(invitations.map(i =>
      i.id === inv.id ? { ...i, tailor_price: price, price_updated_at: new Date().toISOString() } : i
    ))
    setPriceInputs({ ...priceInputs, [inv.id]: '' })
    setEditingPrice({ ...editingPrice, [inv.id]: false })
    setLoading(false)
    alert('✅ Your price has been updated!')
  }

  const handleDecline = async (id) => {
    if (!confirm('Are you sure you want to decline this invitation?')) return
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

  // Tab counts
  const pendingCount = invitations.filter(i => i.status === 'pending').length
  const submittedCount = invitations.filter(i => i.status === 'price_submitted').length
  const approvedCount = invitations.filter(i => i.status === 'approved').length
  const rejectedCount = invitations.filter(i => i.status === 'rejected' || i.status === 'declined').length

  const filteredInvitations = invitations.filter(inv => {
    if (activeTab === 'pending') return inv.status === 'pending'
    if (activeTab === 'submitted') return inv.status === 'price_submitted'
    if (activeTab === 'approved') return inv.status === 'approved'
    if (activeTab === 'rejected') return inv.status === 'rejected' || inv.status === 'declined'
    return true
  })

  const getStatusBadge = (status) => {
    const map = {
      pending: { bg: '#fef3c7', color: '#92400e', label: '⏳ Awaiting Your Price' },
      price_submitted: { bg: '#eff6ff', color: '#1e40af', label: '📨 Price Submitted' },
      approved: { bg: '#dcfce7', color: '#166534', label: '✅ Approved' },
      rejected: { bg: '#fee2e2', color: '#991b1b', label: '❌ Rejected' },
      declined: { bg: '#fee2e2', color: '#991b1b', label: '❌ Declined' },
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
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>📬 Item Invitations</h2>
          <p style={{ color: '#888', fontSize: '14px' }}>
            TrueForm has invited you to fulfill these items. Submit your price to be considered.
          </p>
        </div>

        {/* Info Banner */}
        <div style={{
          backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '20px',
          marginBottom: '24px', fontSize: '14px', color: 'white'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '15px' }}>💡 How it works</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#ccc' }}>
            <div>1. Review each item and submit the price you'd charge to make it</div>
            <div>2. TrueForm reviews all submitted prices and approves the best fits</div>
            <div>3. Once approved, orders for this item are assigned to you based on your price</div>
            <div>4. You can update your price anytime — lower price = higher chance of getting orders</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { key: 'pending', label: `Awaiting Price (${pendingCount})` },
            { key: 'submitted', label: `Submitted (${submittedCount})` },
            { key: 'approved', label: `Approved (${approvedCount})` },
            { key: 'rejected', label: `Rejected (${rejectedCount})` },
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
              const isEditing = editingPrice[inv.id]

              return (
                <div key={inv.id} style={{
                  backgroundColor: 'white', borderRadius: '16px',
                  overflow: 'hidden', border: '1px solid #e0e0e0'
                }}>
                  <div style={{ display: 'flex' }}>

                    {/* Photo */}
                    <div style={{
                      width: '180px', minHeight: '180px', backgroundColor: '#f5f0eb',
                      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {item.photo_main ? (
                        <img src={item.photo_main} alt={item.name}
                          style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ fontSize: '48px' }}>👔</div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '24px', flex: 1 }}>

                      {/* Header */}
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
                      </div>

                      {/* Item Details */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {item.category && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.category}</span>}
                        {item.gender && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.gender}</span>}
                        {item.modesty_level && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.modesty_level}</span>}
                        {item.fabrics && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.fabrics}</span>}
                        {item.occasion && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '3px 8px', borderRadius: '20px' }}>{item.occasion}</span>}
                      </div>

                      {item.description && (
                        <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>{item.description}</p>
                      )}

                      {/* Turnaround */}
                      <div style={{ fontSize: '13px', color: '#555', marginBottom: '16px' }}>
                        ⏱️ Turnaround required: <strong>{item.turnaround_days} days</strong>
                      </div>

                      {/* PENDING — Submit Price */}
                      {inv.status === 'pending' && (
                        <div>
                          <div style={{
                            backgroundColor: '#fef3c7', border: '1px solid #fde68a',
                            borderRadius: '10px', padding: '16px', marginBottom: '16px'
                          }}>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#92400e', marginBottom: '4px' }}>
                              💰 What price would you charge to make this item?
                            </div>
                            <div style={{ fontSize: '12px', color: '#92400e' }}>
                              This is what TrueForm will pay you per order. Lower price = higher chance of approval and more orders.
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1, maxWidth: '200px' }}>
                              <span style={{
                                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                                fontSize: '14px', color: '#555', fontWeight: 'bold'
                              }}>AED</span>
                              <input
                                type="number"
                                value={priceInputs[inv.id] || ''}
                                onChange={(e) => setPriceInputs({ ...priceInputs, [inv.id]: e.target.value })}
                                placeholder="0"
                                style={{
                                  width: '100%', padding: '12px 12px 12px 52px',
                                  borderRadius: '8px', border: '2px solid #1a1a1a',
                                  fontSize: '16px', fontWeight: 'bold', boxSizing: 'border-box'
                                }}
                              />
                            </div>
                            <button onClick={() => handleSubmitPrice(inv)} disabled={loading} style={{
                              padding: '12px 24px', backgroundColor: '#1a1a1a', color: 'white',
                              border: 'none', borderRadius: '8px', cursor: 'pointer',
                              fontWeight: 'bold', fontSize: '14px'
                            }}>
                              Submit Price
                            </button>
                            <button onClick={() => handleDecline(inv.id)} disabled={loading} style={{
                              padding: '12px 16px', backgroundColor: '#fee2e2', color: '#dc2626',
                              border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px'
                            }}>
                              Decline
                            </button>
                          </div>
                        </div>
                      )}

                      {/* PRICE SUBMITTED — Waiting for admin review */}
                      {inv.status === 'price_submitted' && (
                        <div>
                          <div style={{
                            backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
                            borderRadius: '10px', padding: '16px', marginBottom: '16px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: 'bold', color: '#1e40af', marginBottom: '2px' }}>
                                  📨 Price submitted — awaiting TrueForm review
                                </div>
                                <div style={{ fontSize: '12px', color: '#3b82f6' }}>
                                  Last updated: {inv.price_updated_at ? new Date(inv.price_updated_at).toLocaleDateString() : 'Today'}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e40af' }}>
                                  AED {inv.tailor_price}
                                </div>
                                <div style={{ fontSize: '11px', color: '#3b82f6' }}>your price</div>
                              </div>
                            </div>
                          </div>

                          {/* Update price */}
                          {!isEditing ? (
                            <button onClick={() => setEditingPrice({ ...editingPrice, [inv.id]: true })} style={{
                              padding: '10px 20px', backgroundColor: 'white', color: '#1a1a1a',
                              border: '2px solid #1a1a1a', borderRadius: '8px', cursor: 'pointer',
                              fontSize: '13px', fontWeight: 'bold'
                            }}>
                              ✏️ Update My Price
                            </button>
                          ) : (
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <div style={{ position: 'relative', flex: 1, maxWidth: '200px' }}>
                                <span style={{
                                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                                  fontSize: '14px', color: '#555', fontWeight: 'bold'
                                }}>AED</span>
                                <input
                                  type="number"
                                  value={priceInputs[inv.id] || ''}
                                  onChange={(e) => setPriceInputs({ ...priceInputs, [inv.id]: e.target.value })}
                                  placeholder={inv.tailor_price}
                                  style={{
                                    width: '100%', padding: '12px 12px 12px 52px',
                                    borderRadius: '8px', border: '2px solid #1a1a1a',
                                    fontSize: '16px', fontWeight: 'bold', boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                              <button onClick={() => handleUpdatePrice(inv)} disabled={loading} style={{
                                padding: '12px 20px', backgroundColor: '#1a1a1a', color: 'white',
                                border: 'none', borderRadius: '8px', cursor: 'pointer',
                                fontWeight: 'bold', fontSize: '14px'
                              }}>
                                Update
                              </button>
                              <button onClick={() => setEditingPrice({ ...editingPrice, [inv.id]: false })} style={{
                                padding: '12px 16px', backgroundColor: '#f5f5f5', color: '#555',
                                border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px'
                              }}>
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* APPROVED */}
                      {inv.status === 'approved' && (
                        <div>
                          <div style={{
                            backgroundColor: '#dcfce7', border: '1px solid #bbf7d0',
                            borderRadius: '10px', padding: '16px', marginBottom: '16px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: 'bold', color: '#166534', marginBottom: '2px' }}>
                                  ✅ Approved — you are now receiving orders for this item!
                                </div>
                                <div style={{ fontSize: '12px', color: '#16a34a' }}>
                                  Orders are assigned to you based on your price vs other tailors
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#16a34a' }}>
                                  AED {inv.tailor_price}
                                </div>
                                <div style={{ fontSize: '11px', color: '#16a34a' }}>your price per order</div>
                              </div>
                            </div>
                          </div>

                          {/* Update price even after approval */}
                          {!isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <button onClick={() => setEditingPrice({ ...editingPrice, [inv.id]: true })} style={{
                                padding: '10px 20px', backgroundColor: 'white', color: '#1a1a1a',
                                border: '2px solid #1a1a1a', borderRadius: '8px', cursor: 'pointer',
                                fontSize: '13px', fontWeight: 'bold'
                              }}>
                                ✏️ Update My Price
                              </button>
                              <span style={{ fontSize: '12px', color: '#888' }}>
                                Lower price = priority in order queue
                              </span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <div style={{ position: 'relative', flex: 1, maxWidth: '200px' }}>
                                <span style={{
                                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                                  fontSize: '14px', color: '#555', fontWeight: 'bold'
                                }}>AED</span>
                                <input
                                  type="number"
                                  value={priceInputs[inv.id] || ''}
                                  onChange={(e) => setPriceInputs({ ...priceInputs, [inv.id]: e.target.value })}
                                  placeholder={inv.tailor_price}
                                  style={{
                                    width: '100%', padding: '12px 12px 12px 52px',
                                    borderRadius: '8px', border: '2px solid #1a1a1a',
                                    fontSize: '16px', fontWeight: 'bold', boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                              <button onClick={() => handleUpdatePrice(inv)} disabled={loading} style={{
                                padding: '12px 20px', backgroundColor: '#1a1a1a', color: 'white',
                                border: 'none', borderRadius: '8px', cursor: 'pointer',
                                fontWeight: 'bold', fontSize: '14px'
                              }}>
                                Update
                              </button>
                              <button onClick={() => setEditingPrice({ ...editingPrice, [inv.id]: false })} style={{
                                padding: '12px 16px', backgroundColor: '#f5f5f5', color: '#555',
                                border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px'
                              }}>
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* REJECTED / DECLINED */}
                      {(inv.status === 'rejected' || inv.status === 'declined') && (
                        <div style={{
                          padding: '12px 16px', backgroundColor: '#fee2e2',
                          borderRadius: '8px', fontSize: '13px', color: '#991b1b'
                        }}>
                          {inv.status === 'declined'
                            ? '❌ You declined this invitation.'
                            : '❌ Your price was not accepted for this item.'}
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