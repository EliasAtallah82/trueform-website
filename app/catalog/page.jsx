'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Catalog() {
  const [user, setUser] = useState(null)
  const [items, setItems] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    categories: [],
    occasions: [],
    modesty: [],
    budget: '',
    search: ''
  })

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth/login'
      else {
        setUser(data.user)
        fetchItems()
      }
    }
    init()
  }, [])

  const fetchItems = async () => {
    const { data } = await supabase
      .from('catalog')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'approved')
    setItems(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  useEffect(() => {
    let result = [...items]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(i =>
        i.name?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.fabrics?.toLowerCase().includes(q) ||
        i.colors?.toLowerCase().includes(q)
      )
    }

    if (filters.categories.length > 0) {
      result = result.filter(i => filters.categories.includes(i.category))
    }

    if (filters.occasions.length > 0) {
      result = result.filter(i =>
        filters.occasions.some(o => i.occasion?.toLowerCase().includes(o.toLowerCase()))
      )
    }

    if (filters.modesty.length > 0) {
      result = result.filter(i => filters.modesty.includes(i.modesty_level))
    }

    if (filters.budget) {
      result = result.filter(i => {
        const price = parseFloat(i.price) || 0
        if (filters.budget === 'Under AED 300') return price < 300
        if (filters.budget === 'AED 300 – 700') return price >= 300 && price <= 700
        if (filters.budget === 'AED 700 – 1,500') return price > 700 && price <= 1500
        if (filters.budget === 'AED 1,500+') return price > 1500
        return true
      })
    }

    setFiltered(result)
  }, [filters, items])

  const toggleFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value]
    }))
  }

  const clearFilters = () => {
    setFilters({ categories: [], occasions: [], modesty: [], budget: '', search: '' })
  }

  const activeFilterCount =
    filters.categories.length +
    filters.occasions.length +
    filters.modesty.length +
    (filters.budget ? 1 : 0)

  if (!user) return <div style={{ padding: '40px' }}>Loading...</div>

  const CATEGORIES = [
    'Shirt / Top', 'Trousers / Pants', 'Suit / Blazer', 'Full Outfit',
    'Thobe / Kandura', 'Abaya / Modest Wear', 'Dress / Skirt', 'Accessories'
  ]

  const OCCASIONS = [
    'Work', 'Wedding', 'Casual', 'Formal', 'Daily', 'Eid', 'Travel', 'Social'
  ]

  const MODESTY = [
    'Fully Covered', 'Modest & Elegant', 'Moderate', 'Fashion Forward'
  ]

  const BUDGETS = [
    'Under AED 300', 'AED 300 – 700', 'AED 700 – 1,500', 'AED 1,500+'
  ]

  const FilterSection = ({ title, options, filterKey, type = 'checkbox' }) => (
    <div style={{ marginBottom: '28px' }}>
      <h4 style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px', color: '#1a1a1a' }}>
        {title}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options.map((option) => {
          const isSelected = type === 'radio'
            ? filters[filterKey] === option
            : filters[filterKey].includes(option)
          return (
            <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#555' }}>
              <input
                type={type}
                checked={isSelected}
                onChange={() => {
                  if (type === 'radio') {
                    setFilters(prev => ({ ...prev, [filterKey]: prev[filterKey] === option ? '' : option }))
                  } else {
                    toggleFilter(filterKey, option)
                  }
                }}
                style={{ cursor: 'pointer', accentColor: '#1a1a1a' }}
              />
              <span style={{ fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? '#1a1a1a' : '#555' }}>
                {option}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f0eb' }}>
      <nav style={{
        backgroundColor: '#1a1a1a', padding: '16px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✂️ TrueForm</h1>
        <a href="/dashboard/customer" style={{ color: 'white', fontSize: '14px' }}>← Back to Dashboard</a>
      </nav>

      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>👔 Browse Catalog</h2>
          <p style={{ color: '#888', fontSize: '14px' }}>
            {filtered.length} item{filtered.length !== 1 ? 's' : ''} available — all made to your exact measurements
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '24px' }}>
          <input
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="🔍 Search items, fabrics, colors..."
            style={{
              width: '100%', padding: '14px 20px', borderRadius: '12px',
              border: '1px solid #ddd', fontSize: '15px', backgroundColor: 'white',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>

          {/* ── SIDEBAR FILTERS ── */}
          <div style={{ width: '240px', flexShrink: 0 }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '16px' }}>🔧 Filters</h3>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} style={{
                    fontSize: '12px', color: '#dc2626', background: 'none',
                    border: 'none', cursor: 'pointer', fontWeight: 'bold'
                  }}>Clear all ({activeFilterCount})</button>
                )}
              </div>

              <FilterSection
                title="Garment Type"
                options={CATEGORIES}
                filterKey="categories"
                type="checkbox"
              />

              <div style={{ height: '1px', backgroundColor: '#e0e0e0', marginBottom: '28px' }} />

              <FilterSection
                title="Occasion"
                options={OCCASIONS}
                filterKey="occasions"
                type="checkbox"
              />

              <div style={{ height: '1px', backgroundColor: '#e0e0e0', marginBottom: '28px' }} />

              <FilterSection
                title="Modesty Level"
                options={MODESTY}
                filterKey="modesty"
                type="checkbox"
              />

              <div style={{ height: '1px', backgroundColor: '#e0e0e0', marginBottom: '28px' }} />

              <FilterSection
                title="Budget"
                options={BUDGETS}
                filterKey="budget"
                type="radio"
              />
            </div>
          </div>

          {/* ── ITEMS GRID ── */}
          <div style={{ flex: 1 }}>
            {/* Active filter tags */}
            {activeFilterCount > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {[...filters.categories, ...filters.occasions, ...filters.modesty, ...(filters.budget ? [filters.budget] : [])].map((tag) => (
                  <span key={tag} style={{
                    padding: '4px 12px', backgroundColor: '#1a1a1a', color: 'white',
                    borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    {tag}
                    <button onClick={() => {
                      if (filters.categories.includes(tag)) toggleFilter('categories', tag)
                      else if (filters.occasions.includes(tag)) toggleFilter('occasions', tag)
                      else if (filters.modesty.includes(tag)) toggleFilter('modesty', tag)
                      else if (filters.budget === tag) setFilters(prev => ({ ...prev, budget: '' }))
                    }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>Loading catalog...</div>
            ) : filtered.length === 0 ? (
              <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '60px', textAlign: 'center', color: '#888' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👔</div>
                <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>No items found</h3>
                <p style={{ marginBottom: '16px' }}>Try adjusting your filters</p>
                <button onClick={clearFilters} style={{
                  padding: '10px 24px', backgroundColor: '#1a1a1a', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                }}>Clear Filters</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                {filtered.map((item) => (
                  <a key={item.id} href={`/catalog/${item.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden',
                      border: '1px solid #e0e0e0', cursor: 'pointer'
                    }}>
                      <div style={{ height: '260px', backgroundColor: '#f5f0eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.photo_main ? (
                          <img src={item.photo_main} alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ fontSize: '64px' }}>👔</div>
                        )}
                      </div>
                      <div style={{ padding: '16px' }}>
                        <h3 style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '6px', color: '#1a1a1a' }}>{item.name}</h3>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                          {item.category && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px', color: '#555' }}>{item.category}</span>}
                          {item.modesty_level && <span style={{ fontSize: '11px', backgroundColor: '#f5f0eb', padding: '2px 8px', borderRadius: '20px', color: '#555' }}>{item.modesty_level}</span>}
                        </div>
                        {item.fabrics && (
                          <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>{item.fabrics}</p>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '17px', color: '#1a1a1a' }}>AED {item.price}</div>
                            <div style={{ fontSize: '11px', color: '#888' }}>⏱️ {item.turnaround_days} days</div>
                          </div>
                          <div style={{
                            padding: '8px 14px', backgroundColor: '#1a1a1a', color: 'white',
                            borderRadius: '8px', fontSize: '12px', fontWeight: 'bold'
                          }}>Order Now</div>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}