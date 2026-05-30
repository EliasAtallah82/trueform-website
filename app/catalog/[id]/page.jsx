'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function ItemDetail() {
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [item, setItem] = useState(null)
  const [selectedPhoto, setSelectedPhoto] = useState('photo_main')
  const [selectedColor, setSelectedColor] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        const { data: itemData } = await supabase
          .from('catalog')
          .select('*')
          .eq('id', id)
          .single()
        setItem(itemData)
        setLoading(false)
      }
    }
    init()
  }, [id])

  if (!user || loading) return <div style={{ padding: '40px' }}>Loading...</div>
  if (!item) return <div style={{ padding: '40px' }}>Item not found</div>

  const photos = [
    { key: 'photo_main', label: '⭐ Front' },
    { key: 'photo_back', label: 'Back' },
    { key: 'photo_detail', label: 'Detail' },
    { key: 'photo_model', label: 'On Model' },
  ].filter(p => item[p.key])

  const colors = item.colors ? item.colors.split(',').map(c => c.trim()).filter(Boolean) : []

  const handleOrderNow = () => {
  if (colors.length > 1 && !selectedColor) {
    alert('Please select a color!')
    return
  }
  const color = selectedColor || (colors.length === 1 ? colors[0] : '')
  const params = new URLSearchParams({
    item: item.id,
    color: color
  })
  window.location.href = `/order?${params.toString()}`
}

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f0eb' }}>
      <nav style={{
        backgroundColor: '#1a1a1a', padding: '16px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm</h1>
        <a href="/catalog" style={{ color: 'white', fontSize: '14px' }}>← Back to Catalog</a>
      </nav>

      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>

          {/* Photos */}
<div>
  <div style={{
    backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden',
    marginBottom: '12px', height: '420px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', position: 'relative'
  }}>
    {item[selectedPhoto] ? (
      <img src={item[selectedPhoto]} alt={item.name}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    ) : (
      <div style={{ fontSize: '80px' }}>👔</div>
    )}
    {selectedColor && (
      <div style={{
        position: 'absolute', bottom: '12px', left: '12px',
        backgroundColor: 'rgba(0,0,0,0.75)', color: 'white',
        padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold',
        display: 'flex', alignItems: 'center', gap: '6px'
      }}>
        🎨 {selectedColor}
      </div>
    )}
  </div>
            {photos.length > 1 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {photos.map((photo) => (
                  <button key={photo.key} onClick={() => setSelectedPhoto(photo.key)} style={{
                    flex: 1, height: '80px', borderRadius: '8px', overflow: 'hidden',
                    border: selectedPhoto === photo.key ? '3px solid #1a1a1a' : '2px solid #e0e0e0',
                    cursor: 'pointer', padding: 0, backgroundColor: '#f5f0eb'
                  }}>
                    {item[photo.key] ? (
                      <img src={item[photo.key]} alt={photo.label}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '20px' }}>👔</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '8px' }}>{item.name}</h1>

            {/* Tags */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {item.category && <span style={{ fontSize: '12px', backgroundColor: '#f5f0eb', padding: '4px 10px', borderRadius: '20px' }}>{item.category}</span>}
              {item.gender && <span style={{ fontSize: '12px', backgroundColor: '#f5f0eb', padding: '4px 10px', borderRadius: '20px' }}>{item.gender}</span>}
              {item.modesty_level && <span style={{ fontSize: '12px', backgroundColor: '#f5f0eb', padding: '4px 10px', borderRadius: '20px' }}>{item.modesty_level}</span>}
              {item.fabrics && <span style={{ fontSize: '12px', backgroundColor: '#eff6ff', color: '#1e40af', padding: '4px 10px', borderRadius: '20px' }}>🧵 {item.fabrics}</span>}
            </div>

            {/* Price */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1a1a1a' }}>AED {item.price}</div>
              <div style={{ fontSize: '13px', color: '#888' }}>VAT inclusive · ⏱️ {item.turnaround_days} days turnaround</div>
            </div>

            {/* Description */}
            {item.description && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>{item.description}</p>
              </div>
            )}

            {/* Color Selector */}
{colors.length > 1 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '15px' }}>
                  Select Color <span style={{ color: '#dc2626' }}>*</span>
                  {selectedColor && <span style={{ fontSize: '13px', color: '#888', fontWeight: 'normal', marginLeft: '8px' }}>— {selectedColor}</span>}
                </h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {colors.map((color) => (
                    <button key={color} onClick={() => setSelectedColor(color)} style={{
                      padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                      border: selectedColor === color ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                      backgroundColor: selectedColor === color ? '#1a1a1a' : 'white',
                      color: selectedColor === color ? 'white' : '#555',
                      fontWeight: selectedColor === color ? 'bold' : 'normal'
                    }}>{color}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Occasion */}
            {item.occasion && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '15px' }}>Perfect For</h3>
                <p style={{ fontSize: '14px', color: '#555' }}>{item.occasion}</p>
              </div>
            )}

            {/* Made to measure note */}
            <div style={{
              backgroundColor: '#f5f0eb', borderRadius: '12px', padding: '16px', marginBottom: '24px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>📏 Made to Your Exact Measurements</div>
              <div style={{ fontSize: '13px', color: '#555' }}>
                Custom made for you. We'll use your saved measurements or you can update them during checkout.
              </div>
            </div>

            {/* Order Button */}
            <button onClick={handleOrderNow} style={{
              width: '100%', padding: '16px', backgroundColor: '#1a1a1a', color: 'white',
              border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold',
              cursor: 'pointer'
            }}>
              Order Now — AED {item.price}
            </button>

            <p style={{ textAlign: 'center', fontSize: '12px', color: '#888', marginTop: '12px' }}>
              Free delivery on orders over AED 500 · Secure checkout
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}