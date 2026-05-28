'use client'

export default function Home() {
  return (
    <main>
      {/* Navigation Bar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 40px',
        backgroundColor: '#1a1a1a',
        color: 'white'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>✂️ TrueForm</h1>
        <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
          <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Home</a>
          <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Services</a>
          <a href="#" style={{ color: 'white', textDecoration: 'none' }}>How It Works</a>
          <a href="/auth/login" style={{ color: 'white', textDecoration: 'none' }}>Login</a>
          <a href="/auth/signup" style={{
            backgroundColor: 'white',
            color: '#1a1a1a',
            padding: '8px 20px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}>Sign Up</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        backgroundColor: '#f5f0eb',
        padding: '100px 40px',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '52px',
          fontWeight: 'bold',
          color: '#1a1a1a',
          marginBottom: '20px'
        }}>
          Custom Tailoring,<br />Perfectly Fitted For You
        </h2>
        <p style={{
          fontSize: '20px',
          color: '#555',
          maxWidth: '600px',
          margin: '0 auto 40px auto'
        }}>
          Get measured from home using your phone camera.
          Our expert tailors craft your perfect outfit delivered to your door.
        </p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '24px' }}>
          <a href="/auth/signup" style={{
            backgroundColor: '#1a1a1a',
            color: 'white',
            padding: '15px 35px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '18px'
          }}>Get Started</a>
          <a href="/auth/login" style={{
            backgroundColor: 'transparent',
            color: '#1a1a1a',
            padding: '15px 35px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '18px',
            border: '2px solid #1a1a1a'
          }}>Login</a>
        </div>
        {/* AI Advisor Hint */}
        <p style={{
          fontSize: '15px',
          color: '#888',
          marginTop: '8px'
        }}>
          ✨ Get AI-powered outfit recommendations tailored to your body and style
        </p>
      </section>

      {/* How It Works Section */}
      <section style={{
        padding: '80px 40px',
        backgroundColor: 'white',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '36px',
          fontWeight: 'bold',
          marginBottom: '60px',
          color: '#1a1a1a'
        }}>How It Works</h2>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          flexWrap: 'wrap'
        }}>
          {[
            { icon: '📱', title: '1. Get Measured', desc: 'Scan your body using your phone camera in seconds' },
            { icon: '👔', title: '2. Choose Style', desc: 'Browse our fabrics and styles to find your perfect look' },
            { icon: '✂️', title: '3. We Tailor', desc: 'Expert tailors craft your outfit to your exact measurements' },
            { icon: '🚚', title: '4. Delivered', desc: 'Your perfectly fitted clothes delivered to your door' }
          ].map((item) => (
            <div key={item.title} style={{
              backgroundColor: '#f5f0eb',
              borderRadius: '12px',
              padding: '40px 30px',
              width: '220px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>{item.icon}</div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>{item.title}</h3>
              <p style={{ color: '#555', fontSize: '15px' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}