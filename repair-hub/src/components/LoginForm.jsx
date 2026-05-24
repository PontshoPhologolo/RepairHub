import { useState } from 'react';
import { ArrowLeft, Wrench } from 'lucide-react';

const API = 'http://localhost:8080/api';

export function LoginForm({ role, onLogin, onBack }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', phone: '',
    bio: '', specialization: ''
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const res  = await fetch(`${API}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:          form.email,
            password:       form.password,
            fullName:       form.fullName,
            phone:          form.phone,
            role:           role,           // 'customer' or 'technician'
            bio:            form.bio,
            specialization: form.specialization
          })
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Registration failed'); return; }

        // Technicians must wait for approval — show message instead of logging in
        if (role === 'technician') {
          setError(''); // clear
          alert(data.message || 'Application submitted! Please wait for admin approval before logging in.');
          onBack();
          return;
        }
        onLogin({ id: data.userId, name: data.fullName, email: data.email, role: data.role,  status: data.status });

      } else {
        const res  = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password })
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Invalid credentials'); return; }
        onLogin({ id: data.userId, name: data.fullName, email: data.email, role: data.role, phone: data.phone , status: data.status });
      }
    } catch (_) {
      setError('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = role === 'admin' ? 'Admin' : role === 'technician' ? 'Technician' : 'Customer';
  const canRegister = role !== 'admin';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Wrench size={36} color="#2563eb" style={{ marginBottom: '0.75rem' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{roleLabel} Portal</h1>
          {canRegister && (
            <p style={{ color: '#6b7280', marginTop: '0.25rem', fontSize: '0.9rem' }}>
              {isRegister ? 'Create your account' : 'Sign in to continue'}
            </p>
          )}
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={form.fullName} onChange={set('fullName')} required />
              </div>
              <div className="form-group">
                <label>Phone (optional)</label>
                <input type="tel" value={form.phone} onChange={set('phone')} />
              </div>
              {role === 'technician' && (
                <>
                  <div className="form-group">
                    <label>Specialization</label>
                    <select value={form.specialization} onChange={set('specialization')} required>
                      <option value="">Select your specialty</option>
                      {['Plumbing','Electrical','Appliances','Electronics','HVAC','Carpentry'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Bio / Experience (optional)</label>
                    <textarea value={form.bio} onChange={set('bio')} rows={3}
                      placeholder="Tell customers about your experience..." />
                  </div>
                </>
              )}
            </>
          )}

          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} onChange={set('password')} required />
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Please wait...' : (isRegister ? (role === 'technician' ? 'Apply as Technician' : 'Create Account') : 'Sign In')}
          </button>
        </form>

        {canRegister && (
          <p style={{ textAlign: 'center', marginTop: '1.25rem', color: '#6b7280', fontSize: '0.9rem' }}>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => { setIsRegister(r => !r); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </p>
        )}

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button onClick={onBack} className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
            <ArrowLeft size={14} style={{ marginRight: '0.25rem' }} /> Back
          </button>
        </div>
      </div>
    </div>
  );
}
