'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Orders() {
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        fetchOrders(data.user.id)
      }
    }
    init()
  }, [])

  const fetchOrders = async (userId) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, catalog(*)')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      // Try without join
      const { data: simple } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
      setOrders(simple || [])
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status))
  const completedOrders = orders.filter(o => ['completed', 'cancelled'].includes(o.status))
  const filteredOrders = activeTab === 'active' ? activeOrders : completedOrders

  const getStatusBadge = (status) => {
    const map = {
      pending: { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending' },
      confirmed: { bg: '#eff6ff', color: '#1e40af', label: '✅ Confirmed' },
      in_progress: { bg: '#f0fdf4', color: '#166534', label: '🧵 In Progress' },
      ready: { bg: '#f5f3ff', color: '#6d28d9', label: '📦 Ready' },
      out_for_delivery: { bg: '#fff7ed', color: '#c2410c', label: '🚚 Out for Delivery' },
      completed: { bg: '#dcfce7', color: '#166534', label: '✅ Completed' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', label: '❌ Cancelled' },
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
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm</h1>
        <a href="/dashboard/customer" style={{ color: 'white', fontSize: '14px' }}>← Back to Dashboard</a>
      </nav>

      <div style={{ padding: '40px', maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>📋 My Orders</h2>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>
          {activeOrders.length} active · {completedOrders.length} completed
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { key: 'active', label: `Active (${activeOrders.length})` },
            { key: 'completed', label: `Completed (${completedOrders.length})` },
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
            <p style={{ marginBottom: '20px' }}>
              {activeTab === 'active' ? 'Browse the catalog to place your first order!' : 'Your completed orders will appear here'}
            </p>
            {activeTab === 'active' && (
              <a href="/catalog" style={{
                padding: '10px 24px', backgroundColor: '#1a1a1a', color: 'white',
                borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold'
              }}>Browse Catalog →</a>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredOrders.map((order) => {
              const catalogItem = order.catalog
              return (
                <div key={order.id} style={{
                  backgroundColor: 'white', borderRadius: '16px',
                  border: '1px solid #e0e0e0', overflow: 'hidden'
                }}>
                  <div style={{ display: 'flex' }}>
                    {/* Photo */}
                    <div style={{ width: '100px', minHeight: '100px', backgroundColor: '#f5f0eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {catalogItem?.photo_main
                        ? <img src={catalogItem.photo_main} alt="" style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                        : <div style={{ fontSize: '32px' }}>👔</div>
                      }
                    </div>

                    {/* Content */}
                    <div style={{ padding: '16px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                            {catalogItem?.name || order.garment_type || 'Custom Order'}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            {getStatusBadge(order.status)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>AED {order.total_price}</div>
                        </div>
                      </div>

                      <div style={{ fontSize: '13px', color: '#555', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {order.color && <span>🎨 {order.color}</span>}
                        {order.fit && <span>📐 {order.fit}</span>}
                        {order.deadline && <span>📅 Due: {new Date(order.deadline).toLocaleDateString()}</span>}
                      </div>

                      {order.delivery_address && (
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
                          📍 {order.delivery_address}
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