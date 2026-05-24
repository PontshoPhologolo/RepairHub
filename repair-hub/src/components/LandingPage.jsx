import { Wrench, Zap, Shield, Star } from 'lucide-react';

export function LandingPage({ onLoginClick }) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 60%)' }}>

      {/* Header */}
      <header style={{ borderBottom: '1px solid #e5e7eb', background: 'white', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wrench size={22} color="#2563eb" />
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2563eb' }}>RepairHub</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline" onClick={() => onLoginClick('customer')}>Sign In</button>
            <button className="btn btn-primary" onClick={() => onLoginClick('technician')}>Join as Technician</button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <h1 style={{ fontSize: '2.75rem', fontWeight: 800, color: '#1e40af', marginBottom: '1rem', lineHeight: 1.2 }}>
          Small Fixes, Big Impact
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#4b5563', maxWidth: '38rem', margin: '0 auto 2.5rem' }}>
          Connect with verified local technicians for fast, reliable home and device repairs.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }} onClick={() => onLoginClick('customer')}>
            Request a Repair
          </button>
          <button className="btn btn-outline" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }} onClick={() => onLoginClick('technician')}>
            Become a Technician
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="container" style={{ padding: '2rem 1rem 5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, textAlign: 'center', marginBottom: '2.5rem', color: '#111827' }}>
          Why Choose RepairHub?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {[
            { Icon: Zap,    title: 'Fast Response',        desc: 'Get matched with nearby technicians quickly.' },
            { Icon: Shield, title: 'Verified Technicians', desc: 'Every technician is reviewed and approved by our team.' },
            { Icon: Star,   title: 'Quality Guaranteed',   desc: 'Rate every service — we ensure excellent work.' }
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <Icon size={40} color="#2563eb" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{title}</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#1f2937', color: 'white', textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: '#9ca3af', marginBottom: '0.5rem' }}>© 2025 RepairHub. All rights reserved.</p>
        <button
          onClick={() => onLoginClick('admin')}
          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Admin Login
        </button>
      </footer>
    </div>
  );
}
