'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function TailorOrders() {
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('new')
  const [decliningOrder, setDecliningOrder] = useState(null)
  const [declineReason, setDeclineReason] = useState('')
  const [otherReason, setOtherReason] = useState('')

  const fetchOrders = async (userId) => {
    // Get active orders assigned to this tailor
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('tailor_id', userId)

    // Get declined orders from tailor_declines table
    const { data: declineRecords } = await supabase
      .from('tailor_declines')
      .select('order_id, reason, created_at')
      .eq('tailor_id', userId)

    let declinedOrders = []
    if (declineRecords && declineRecords.length > 0) {
      const declinedOrderIds = declineRecords.map(d => d.order_id)
      const { data: declinedOrderData } = await supabase
        .from('orders')
        .select('*')
        .in('id', declinedOrderIds)

      declinedOrders = (declinedOrderData || []).map(o => {
        const decline = declineRecords.find(d => d.order_id === o.id)
        return { ...o, status: 'declined', decline_reason: decline?.reason }
      })
    }

    const ordersData = [...(activeOrders || []), ...declinedOrders]

    if (!ordersData || ordersData.length === 0) {
      setOrders([])
      setLoading(false)
      return
    }

    const catalogIds = [...new Set(ordersData.map(o => o.catalog_id).filter(Boolean))]
    const { data: catalogItems } = await supabase
      .from('catalog')
      .select('id, name, photo_main, category, turnaround_days')
      .in('id', catalogIds)

    const merged = ordersData.map(o => ({
      ...o,
      catalog: catalogItems?.find(c => c.id === o.catalog_id) || null
    }))

    setOrders(merged)
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        await fetchOrders(data.user.id)
      }
    }
    init()
  }, [])

  const updateOrderStatus = async (orderId, newStatus, reason = '') => {
    if (newStatus === 'declined') {
      const order = orders.find(o => o.id === orderId)

      // Save decline record
      await supabase.from('tailor_declines').insert({
        order_id: orderId,
        tailor_id: user.id,
        reason: reason
      })

      // Get all approved tailors sorted by price
      const { data: tailorBids } = await supabase
        .from('tailor_catalog_items')
        .select('tailor_id, tailor_price')
        .eq('catalog_id', order.catalog_id)
        .eq('status', 'approved')
        .order('tailor_price', { ascending: true })

      // Get attempted tailors
      const attemptedTailors = order.attempted_tailors
        ? order.attempted_tailors.split(',').filter(Boolean)
        : []

      // Add current tailor to attempted list
      const updatedAttempted = [...attemptedTailors, user.id]

      // Find next tailor
      const nextTailor = tailorBids?.find(t => !updatedAttempted.includes(t.tailor_id))

      if (nextTailor) {
        const newDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        await supabase.from('orders').update({
          tailor_id: nextTailor.tailor_id,
          status: 'new',
          assignment_deadline: newDeadline,
          attempted_tailors: updatedAttempted.join(','),
          assignment_attempt: (order.assignment_attempt || 1) + 1,
          decline_reason: reason
        }).eq('id', orderId)
      } else {
  // No more tailors available — cancel the order
  await supabase.from('orders').update({
    tailor_id: null,
    status: 'cancelled',
    attempted_tailors: updatedAttempted.join(','),
    decline_reason: reason
  }).eq('id', orderId)
  // TODO: notify customer + refund when payments are built
}

      // Update local state
      setOrders(orders.map(o => o.id === orderId
        ? { ...o, status: 'declined', decline_reason: reason }
        : o
      ))
      return
    }

    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const newOrders = orders.filter(o => o.status === 'new')
  const inProgress = orders.filter(o => ['accepted', 'in_progress'].includes(o.status))
  const completed = orders.filter(o => ['completed_by_tailor', 'completed'].includes(o.status))
  const declined = orders.filter(o => o.status === 'declined')

  const filteredOrders = activeTab === 'new' ? newOrders
    : activeTab === 'progress' ? inProgress
    : activeTab === 'completed' ? completed
    : declined

  const getStatusBadge = (status) => {
    const map = {
      new: { bg: '#fef3c7', color: '#92400e', label: '🆕 New Order' },
      accepted: { bg: '#eff6ff', color: '#1e40af', label: '✅ Accepted' },
      in_progress: { bg: '#dbeafe', color: '#1e40af', label: '🧵 In Progress' },
      completed_by_tailor: { bg: '#dcfce7', color: '#166534', label: '✅ Completed' },
      completed: { bg: '#dcfce7', color: '#166534', label: '✅ Completed' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', label: '❌ Cancelled' },
      declined: { bg: '#fee2e2', color: '#991b1b', label: '❌ Declined' },
    }
    const s = map[status] || map.new
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

      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>📋 My Orders</h2>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>
          {newOrders.length} new · {inProgress.length} in progress · {completed.length} completed · {declined.length} declined
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { key: 'new', label: `New (${newOrders.length})` },
            { key: 'progress', label: `In Progress (${inProgress.length})` },
            { key: 'completed', label: `Completed (${completed.length})` },
            { key: 'declined', label: `Declined (${declined.length})` },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
              backgroundColor: activeTab === tab.key ? '#1a1a1a' : 'white',
              color: activeTab === tab.key ? 'white' : '#555',
              border: activeTab === tab.key ? 'none' : '1px solid #ddd',
              fontWeight: activeTab === tab.key ? 'bold' : 'normal'
            }}>{tab.label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '60px', textAlign: 'center', color: '#888' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>No {activeTab} orders</h3>
            <p>Check back later for new orders!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredOrders.map((order) => {
              const catalogItem = order.catalog
              const minutesLeft = order.assignment_deadline
                ? Math.max(0, Math.round((new Date(order.assignment_deadline) - new Date()) / 60000))
                : null

              return (
                <div key={order.id} style={{
                  backgroundColor: 'white', borderRadius: '16px',
                  border: order.status === 'new' ? '2px solid #fbbf24' : '1px solid #e0e0e0',
                  overflow: 'hidden'
                }}>
                  <div style={{ display: 'flex' }}>
                    <div style={{ width: '100px', minHeight: '120px', backgroundColor: '#f5f0eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {catalogItem?.photo_main
                        ? <img src={catalogItem.photo_main} alt="" style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                        : <div style={{ fontSize: '32px' }}>👔</div>
                      }
                    </div>

                    <div style={{ padding: '16px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                            {catalogItem?.name || order.garment_type || 'Custom Order'}
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>AED {order.total_price}</div>
                          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 'bold' }}>
                            Your cut: AED {(order.total_price / 1.05 * 0.60).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '13px', color: '#555', display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {order.color && <span>🎨 {order.color}</span>}
                        {order.fit && <span>📐 {order.fit}</span>}
                        {catalogItem?.turnaround_days && <span>⏱️ {catalogItem.turnaround_days} days</span>}
                        {order.created_at && <span>📅 {new Date(order.created_at).toLocaleDateString()}</span>}
                      </div>

                      {order.notes && (
                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                          📝 {order.notes}
                        </div>
                      )}

                      {order.status === 'declined' && order.decline_reason && (
                        <div style={{ fontSize: '12px', color: '#991b1b', marginBottom: '12px', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '6px' }}>
                          ❌ Decline reason: {order.decline_reason}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {order.status === 'new' && (
                          <>
                            <button onClick={() => updateOrderStatus(order.id, 'accepted')} style={{
                              padding: '8px 16px', backgroundColor: '#16a34a', color: 'white',
                              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'
                            }}>✅ Accept Order</button>
                            <button onClick={() => setDecliningOrder(order.id)} style={{
                              padding: '8px 16px', backgroundColor: '#fee2e2', color: '#dc2626',
                              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'
                            }}>❌ Decline</button>
                            {minutesLeft !== null && (
                              <span style={{
                                fontSize: '12px',
                                color: minutesLeft < 30 ? '#dc2626' : '#92400e',
                                backgroundColor: minutesLeft < 30 ? '#fee2e2' : '#fef3c7',
                                padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold'
                              }}>
                                ⏰ {minutesLeft > 60
                                  ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m left`
                                  : `${minutesLeft}m left`}
                              </span>
                            )}
                          </>
                        )}
                        {order.status === 'accepted' && (
                          <button onClick={() => updateOrderStatus(order.id, 'in_progress')} style={{
                            padding: '8px 16px', backgroundColor: '#1a1a1a', color: 'white',
                            border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'
                          }}>🧵 Start Making</button>
                        )}
                        {order.status === 'in_progress' && (
                          <button onClick={() => updateOrderStatus(order.id, 'completed_by_tailor')} style={{
                            padding: '8px 16px', backgroundColor: '#7c3aed', color: 'white',
                            border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'
                          }}>✅ Mark as Completed</button>
                        )}
                        {order.status === 'completed_by_tailor' && (
                          <div style={{
                            fontSize: '13px', color: '#16a34a', fontWeight: 'bold',
                            padding: '8px 12px', backgroundColor: '#dcfce7', borderRadius: '8px'
                          }}>
                            ✅ Completed — Waiting for courier pickup
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Decline Modal */}
      {decliningOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', padding: '32px',
            maxWidth: '440px', width: '90%'
          }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>❌ Decline Order</h3>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>
              Please select a reason. This helps TrueForm improve order assignments.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {[
                'Too busy — at full capacity',
                'Material not available',
                'Skills not matching this item',
                'Cannot meet the deadline',
                'Other'
              ].map((reason) => (
                <button key={reason} onClick={() => { setDeclineReason(reason); setOtherReason('') }} style={{
                  padding: '12px 16px', borderRadius: '8px', cursor: 'pointer',
                  textAlign: 'left', fontSize: '14px',
                  border: declineReason === reason ? '2px solid #dc2626' : '2px solid #e0e0e0',
                  backgroundColor: declineReason === reason ? '#fee2e2' : 'white',
                  color: declineReason === reason ? '#dc2626' : '#555',
                  fontWeight: declineReason === reason ? 'bold' : 'normal'
                }}>{reason}</button>
              ))}
            </div>

            {declineReason === 'Other' && (
              <textarea
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Please explain..."
                rows={3}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  border: '1px solid #ddd', fontSize: '14px',
                  boxSizing: 'border-box', marginBottom: '16px', resize: 'vertical'
                }}
              />
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => {
                setDecliningOrder(null)
                setDeclineReason('')
                setOtherReason('')
              }} style={{
                flex: 1, padding: '12px', backgroundColor: 'transparent', color: '#888',
                border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer'
              }}>Cancel</button>
              <button
                onClick={() => {
                  const finalReason = declineReason === 'Other'
                    ? `Other: ${otherReason}`
                    : declineReason
                  if (!finalReason || finalReason === 'Other: ') {
                    alert('Please select or enter a reason!')
                    return
                  }
                  updateOrderStatus(decliningOrder, 'declined', finalReason)
                  setDecliningOrder(null)
                  setDeclineReason('')
                  setOtherReason('')
                }}
                disabled={!declineReason}
                style={{
                  flex: 2, padding: '12px',
                  backgroundColor: declineReason ? '#dc2626' : '#ccc',
                  color: 'white', border: 'none', borderRadius: '8px',
                  cursor: declineReason ? 'pointer' : 'not-allowed', fontWeight: 'bold'
                }}>Confirm Decline</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}