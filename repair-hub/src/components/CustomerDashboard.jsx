import { useState, useEffect, useCallback } from 'react';
import { Wrench, LogOut, Plus, Star } from 'lucide-react';
import addressIcon from '../assets/address.png';
import calendarIcon from '../assets/calendar.png';
import moneyIcon from '../assets/money-bag.png';
import technicianIcon from '../assets/mechanic.png';
import starIcon from '../assets/star.png';
const API = 'http://localhost:8080/api';
const CATEGORIES = ['Plumbing','Electrical','Appliances','Electronics','HVAC','Carpentry'];

// ── Status Timeline Component ─────────────────────────────────────────────
const STEPS = [
  { key: 'pending',     label: 'Pending' },
  { key: 'assigned',    label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed' },
];

function StatusTimeline({ status }) {
  const currentIndex = STEPS.findIndex(s => s.key === status);

  return (
    <div style={{ display: 'flex', alignItems: 'center', margin: '0.75rem 0 0.25rem' }}>
      {STEPS.map((step, i) => {
        const done    = i < currentIndex;
        const current = i === currentIndex;
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            {/* Circle */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                background: done ? '#2563eb' : current ? '#2563eb' : '#e5e7eb',
                border: current ? '3px solid #93c5fd' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {done && <span style={{ color: 'white', fontSize: '11px', fontWeight: 700 }}>✓</span>}
                {current && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
              </div>
              <span style={{
                fontSize: '0.65rem', whiteSpace: 'nowrap',
                color: done || current ? '#2563eb' : '#9ca3af',
                fontWeight: current ? 600 : 400
              }}>
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: '2px', margin: '0 4px', marginBottom: '18px',
                background: i < currentIndex ? '#2563eb' : '#e5e7eb'
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────
export function CustomerDashboard({ user, onLogout }) {
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [showRate,   setShowRate]   = useState(null);
  const [form, setForm] = useState({
    category: '', description: '', addressLine1: '', city: '',
    state: '', postalCode: '', scheduledDate: '', estimatedCost: ''
  });
  const [rateForm,   setRateForm]   = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const fetchRequests = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/customer/${user.id}/requests`);
      const data = await res.json();
      setRequests(data);
    } catch {
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ── Create Request ────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res  = await fetch(`${API}/customer/${user.id}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create request'); return; }
      setShowForm(false);
      setForm({ category: '', description: '', addressLine1: '', city: '', state: '', postalCode: '', scheduledDate: '', estimatedCost: '' });
      fetchRequests();
    } catch {
      setError('Cannot connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cancel Request ────────────────────────────────────────────────────
  const handleCancel = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;
    try {
      const res  = await fetch(`${API}/customer/${user.id}/requests/${requestId}/cancel`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      fetchRequests();
    } catch {
      setError('Cannot connect to server');
    }
  };

  // ── Submit Review ─────────────────────────────────────────────────────
  const handleRate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res  = await fetch(`${API}/customer/${user.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId:    showRate.request_id,
          technicianId: showRate.technician_id,
          rating:       rateForm.rating,
          comment:      rateForm.comment
        })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to submit review'); return; }
      setShowRate(null);
      fetchRequests();
    } catch {
      setError('Cannot connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  const active    = requests.filter(r => r.status !== 'completed' && r.status !== 'cancelled');
  const completed = requests.filter(r => r.status === 'completed');
  const cancelled = requests.filter(r => r.status === 'cancelled');

  if (loading) return <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <div>
      {/* Navbar */}
      <div className="navbar">
        <div className="container">
          <div className="flex items-center gap-2">
            <Wrench size={22} color="#2563eb" />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#2563eb' }}>RepairHub</span>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '0.9rem' }}>{user.name}</span>
            <button onClick={onLogout} className="btn btn-outline btn-sm">
              <LogOut size={14} style={{ marginRight: '0.25rem' }} /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h2>My Repair Requests</h2>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus size={15} style={{ marginRight: '0.25rem' }} /> New Request
          </button>
        </div>

        {/* ── Active ── */}
        <h3 style={{ marginBottom: '0.75rem' }}>Active ({active.length})</h3>
        {active.length === 0 && <p className="text-muted" style={{ marginBottom: '1.5rem' }}>No active requests</p>}
        {active.map(req => (
          <div key={req.request_id} className="request-item">
            <div className="request-header">
              <span className="request-title">{req.category}</span>
            </div>
            <p style={{ margin: '0.25rem 0', color: '#374151' }}>{req.description}</p>

            {/* Timeline */}
            <StatusTimeline status={req.status} />

            
            <div className="request-details" style={{ marginTop: '0.5rem' }}>
              <span><img src={addressIcon} alt="address" style={{ width: '25px', height: '25px', marginRight: '0.25rem', verticalAlign: 'middle' }} /> {req.address_line1}, {req.city}</span>
              {req.scheduled_date && <span><img src={calendarIcon} alt="address" style={{ width: '25px', height: '25px', marginRight: '0.25rem', verticalAlign: 'middle' }} />  {req.scheduled_date}</span>}
              {req.estimated_cost  && <span><img src={moneyIcon} alt="money" style={{ width: '25px', height: '25px', marginRight: '0.25rem', verticalAlign: 'middle' }} /> R{req.estimated_cost}</span>}
              {req.technician_name && <span><img src={technicianIcon} alt="technician" style={{ width: '25px', height: '25px', marginRight: '0.25rem', verticalAlign: 'middle' }} /> {req.technician_name}{req.technician_rating && <><img src={starIcon} alt="star" style={{ width: '20px', height: '20px', marginLeft: '0.5rem', marginRight: '0.25rem', verticalAlign: 'middle' }} /> {req.technician_rating}</>}</span>}
            </div>

            {/* Cancel — only when pending */}
            {req.status === 'pending' && (
              <button
                onClick={() => handleCancel(req.request_id)}
                className="btn btn-outline btn-sm"
                style={{ marginTop: '0.75rem', color: '#dc2626', borderColor: '#dc2626' }}>
                Cancel Request
              </button>
            )}
          </div>
        ))}

        {/* ── Completed ── */}
        <h3 style={{ margin: '2rem 0 0.75rem' }}>Completed ({completed.length})</h3>
        {completed.length === 0 && <p className="text-muted">No completed requests</p>}
        {completed.map(req => (
          <div key={req.request_id} className="request-item">
            <div className="request-header">
              <span className="request-title">{req.category}</span>
              <span className="badge badge-success">Completed</span>
            </div>
            <p style={{ margin: '0.25rem 0', color: '#374151' }}>{req.description}</p>
            <div className="request-details">
              {req.final_amount   && <span> <img src={moneyIcon} alt="money" style={{ width: '25px', height: '25px', marginRight: '0.25rem', verticalAlign: 'middle' }} />Final: R{req.final_amount}</span>}
              {req.technician_name && <span> <img src={technicianIcon} alt="technician" style={{ width: '25px', height: '25px', marginRight: '0.25rem', verticalAlign: 'middle' }} /> {req.technician_name}</span>}
            </div>
            {req.status === 'completed' && req.technician_id && (
              <button
                onClick={() => { setShowRate(req); setRateForm({ rating: 5, comment: '' }); }}
                className="btn btn-outline btn-sm"
                style={{ marginTop: '0.5rem' }}>
                <Star size={13} style={{ marginRight: '0.25rem' }} /> Rate Service
              </button>
            )}
          </div>
        ))}

        {/* ── Cancelled ── */}
        {cancelled.length > 0 && (
          <>
            <h3 style={{ margin: '2rem 0 0.75rem', color: '#6b7280' }}>Cancelled ({cancelled.length})</h3>
            {cancelled.map(req => (
              <div key={req.request_id} className="request-item" style={{ opacity: 0.6 }}>
                <div className="request-header">
                  <span className="request-title">{req.category}</span>
                  <span className="badge" style={{ background: '#f3f4f6', color: '#6b7280' }}>Cancelled</span>
                </div>
                <p style={{ margin: '0.25rem 0', color: '#6b7280', fontSize: '0.9rem' }}>{req.description}</p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── New Request Modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New Repair Request</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Service Category</label>
                <select value={form.category} onChange={set('category')} required>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Problem Description</label>
                <textarea value={form.description} onChange={set('description')}
                  rows={3} placeholder="Describe the issue..." required />
              </div>
              <div className="form-group">
                <label>Street Address</label>
                <input type="text" value={form.addressLine1} onChange={set('addressLine1')}
                  placeholder="e.g. 123 Main Street" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>City</label>
                  <input type="text" value={form.city} onChange={set('city')} required />
                </div>
                <div className="form-group">
                  <label>Province</label>
                  <input type="text" value={form.state} onChange={set('state')} required />
                </div>
              </div>
              <div className="form-group">
                <label>Postal Code</label>
                <input type="text" value={form.postalCode} onChange={set('postalCode')} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Preferred Date</label>
                  <input type="date" value={form.scheduledDate} onChange={set('scheduledDate')}
                    min={new Date().toISOString().split('T')[0]} required />
                </div>
                <div className="form-group">
                  <label>Estimated Cost (R)</label>
                  <input type="number" value={form.estimatedCost} onChange={set('estimatedCost')} min={0} />
                </div>
              </div>
              <div className="flex justify-end gap-2" style={{ marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Rate Service Modal ── */}
      {showRate && (
        <div className="modal-overlay" onClick={() => setShowRate(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Rate Service</h3>
              <button className="modal-close" onClick={() => setShowRate(null)}>&times;</button>
            </div>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              How was your experience with <strong>{showRate.technician_name}</strong>?
            </p>
            <form onSubmit={handleRate}>
              <div className="form-group">
                <label>Rating</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button"
                      onClick={() => setRateForm(f => ({ ...f, rating: n }))}
                      style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer',
                               color: n <= rateForm.rating ? '#f59e0b' : '#d1d5db' }}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Comment (optional)</label>
                <textarea value={rateForm.comment}
                  onChange={e => setRateForm(f => ({ ...f, comment: e.target.value }))}
                  rows={3} placeholder="Tell us about your experience..." />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowRate(null)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}