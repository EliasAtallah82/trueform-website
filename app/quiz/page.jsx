'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const questions = [
  {
    id: 'style_vibe',
    question: 'What is your style vibe?',
    subtitle: 'Pick up to 2',
    type: 'multi',
    max: 2,
    options: [
      { label: 'Classic & Formal', icon: '👔' },
      { label: 'Modern & Trendy', icon: '✨' },
      { label: 'Traditional & Cultural', icon: '🌙' },
      { label: 'Casual & Relaxed', icon: '😎' },
      { label: 'Smart Casual', icon: '🎯' },
      { label: 'Streetwear & Bold', icon: '🔥' },
    ]
  },
  {
    id: 'occasion',
    question: 'What occasions do you dress for?',
    subtitle: 'Pick all that apply',
    type: 'multi',
    max: 12,
    options: [
      { label: 'Daily Work & Office', icon: '💼' },
      { label: 'Business Meetings', icon: '🤝' },
      { label: 'Wedding (Guest)', icon: '💒' },
      { label: 'Wedding (Groom)', icon: '🤵' },
      { label: 'Graduation', icon: '🎓' },
      { label: 'Eid & Religious Events', icon: '🌙' },
      { label: 'Formal Dinner & Gala', icon: '🥂' },
      { label: 'Casual Everyday', icon: '☀️' },
      { label: 'Beach & Holiday', icon: '🏖️' },
      { label: 'Sports & Active', icon: '⚽' },
      { label: 'Family Gathering', icon: '👨‍👩‍👧' },
      { label: 'Date Night', icon: '❤️' },
    ]
  },
  {
    id: 'modesty',
    question: 'What is your modesty preference?',
    subtitle: 'Pick one',
    type: 'single',
    options: [
      { label: 'Fully Covered', icon: '🧕', desc: 'Full sleeves, high neck, long length' },
      { label: 'Modest', icon: '👗', desc: 'Covered but fitted and elegant' },
      { label: 'Moderate', icon: '👚', desc: 'Some skin, tasteful and stylish' },
      { label: 'Fashion Forward', icon: '💃', desc: 'Trendy, fitted and expressive' },
    ]
  },
  {
    id: 'skin_tone',
    question: 'What is your skin tone?',
    subtitle: 'Pick one — helps us recommend the best colors for you',
    type: 'single',
    options: [
      { label: 'Very Fair', icon: '🤍' },
      { label: 'Fair', icon: '🍑' },
      { label: 'Medium / Olive', icon: '🌿' },
      { label: 'Tan / Brown', icon: '🤎' },
      { label: 'Deep Brown', icon: '🍫' },
      { label: 'Dark', icon: '🖤' },
    ]
  },
  {
    id: 'budget',
    question: 'What is your budget per item?',
    subtitle: 'Pick one',
    type: 'single',
    options: [
      { label: 'Budget', icon: '💚', desc: 'Under AED 200' },
      { label: 'Mid Range', icon: '💛', desc: 'AED 200 – 500' },
      { label: 'Premium', icon: '🧡', desc: 'AED 500 – 1,000' },
      { label: 'Luxury', icon: '💜', desc: 'AED 1,000+' },
    ]
  },
  {
    id: 'garment_type',
    question: 'What would you like to order?',
    subtitle: 'Pick all that apply',
    type: 'multi',
    max: 8,
    options: [
      { label: 'Suits & Blazers', icon: '🤵' },
      { label: 'Shirts & Tops', icon: '👕' },
      { label: 'Trousers & Pants', icon: '👖' },
      { label: 'Thobes & Kanduras', icon: '🌙' },
      { label: 'Abayas & Modest Wear', icon: '🕌' },
      { label: 'Dresses & Skirts', icon: '👗' },
      { label: 'Casual Outfits', icon: '😊' },
      { label: 'Full Sets & Combinations', icon: '✨' },
    ]
  }
]

export default function StyleQuiz() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)

  const question = questions[currentStep]
  const isLastStep = currentStep === questions.length - 1

  const handleSelect = (label) => {
    if (question.type === 'single') {
      setSelected([label])
    } else {
      if (selected.includes(label)) {
        setSelected(selected.filter(s => s !== label))
      } else {
        if (selected.length < question.max) {
          setSelected([...selected, label])
        }
      }
    }
  }

  const handleNext = async () => {
    const newAnswers = { ...answers, [question.id]: selected }
    setAnswers(newAnswers)

    if (isLastStep) {
      setSaving(true)
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        await supabase.from('style_profiles').upsert({
          user_id: data.user.id,
          ...newAnswers
        })
      }
      window.location.href = '/recommendations'
    } else {
      setCurrentStep(currentStep + 1)
      setSelected([])
    }
  }

  const progress = ((currentStep + 1) / questions.length) * 100

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#f5f0eb',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px'
    }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: '600px', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
          ✂️ TrueForm Style Quiz
        </h1>

        {/* Progress Bar */}
        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', color: '#888' }}>
            Question {currentStep + 1} of {questions.length}
          </span>
          <span style={{ fontSize: '14px', color: '#888' }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div style={{
          height: '6px',
          backgroundColor: '#e0e0e0',
          borderRadius: '3px'
        }}>
          <div style={{
            height: '6px',
            backgroundColor: '#1a1a1a',
            borderRadius: '3px',
            width: `${progress}%`,
            transition: 'width 0.4s ease'
          }}/>
        </div>
      </div>

      {/* Question Card */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '600px'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
          {question.question}
        </h2>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>
          {question.subtitle}
        </p>

        {/* Options */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: question.options.length > 4 ? '1fr 1fr' : '1fr',
          gap: '12px',
          marginBottom: '32px'
        }}>
          {question.options.map((option) => (
            <button
              key={option.label}
              onClick={() => handleSelect(option.label)}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: selected.includes(option.label)
                  ? '2px solid #1a1a1a'
                  : '2px solid #e0e0e0',
                backgroundColor: selected.includes(option.label)
                  ? '#f5f0eb'
                  : 'white',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '24px' }}>{option.icon}</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '15px' }}>{option.label}</div>
                {option.desc && (
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                    {option.desc}
                  </div>
                )}
              </div>
              {selected.includes(option.label) && (
                <span style={{ marginLeft: 'auto', fontSize: '18px' }}>✅</span>
              )}
            </button>
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={selected.length === 0 || saving}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: selected.length === 0 ? '#ccc' : '#1a1a1a',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {saving ? 'Saving your profile...' :
            isLastStep ? 'See My Recommendations →' : 'Next →'}
        </button>

        {/* Back Button */}
        {currentStep > 0 && (
          <button
            onClick={() => {
              setCurrentStep(currentStep - 1)
              setSelected(answers[questions[currentStep - 1].id] || [])
            }}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'transparent',
              color: '#888',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            ← Back
          </button>
        )}
      </div>
    </main>
  )
}