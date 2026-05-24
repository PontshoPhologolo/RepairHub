import { useState, useEffect, useCallback } from 'react';
import { Wrench, LogOut } from 'lucide-react';
import phoneIcon    from '../assets/call.png';
import clientIcon   from '../assets/client.png';
import calendarIcon from '../assets/calendar.png';
import addressIcon  from '../assets/address.png';

const API = 'http://localhost:8080/api';

export function TechnicianDashboard({ user, onLogout }) {
  const [tab,          setTab]          = useState('jobs'); // 'jobs' | 'reviews'
  const [myJobs,       setMyJobs]       = useState([]);
  const [reviewData,   setReviewData]   = useState(null);  // { rating, jobsCompleted, reviews[] }
  const [loading,      setLoading]      = useState(true);
  const [reviewLoading,setReviewLoading]= useState(false);
  const [error,        setError]        = useState('');
  const [showComplete, setShowComplete] = useState(null);
  const [completeForm, setCompleteForm] = useState({ finalAmount: '', notes: '' });
  const [submitting,   setSubmitting]   = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/technician/${user.id}/jobs`);
      const data = await res.json();
      setMyJobs(data);
    } catch {
      setError('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  const fetchReviews = useCallback(async () => {
    setReviewLoading(true);
    try {
      const res  = await fetch(`${API}/technician/${user.id}/reviews`);
      const data = await res.json();
      setReviewData(data);
    } catch {
      setError('Failed to load reviews');
    } finally {
      setReviewLoading(false);
    }
  }, [user.id]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Fetch reviews only when tab is opened
  useEffect(() => {
    if (tab === 'reviews' && !reviewData) fetchReviews();
  }, [tab, reviewData, fetchReviews]);

  // ── Start Job ─────────────────────────────────────────────────────────
  const handleStart = async (assignmentId) => {
    try {
      const res  = await fetch(`${API}/technician/${user.id}/start/${assignmentId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      fetchJobs();
    } catch {
      setError('Cannot connect to server');
    }
  };

  // ── Complete Job ──────────────────────────────────────────────────────
  const handleComplete = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res  = await fetch(`${API}/technician/${user.id}/complete/${showComplete.assignment_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completeForm)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setShowComplete(null);
      fetchJobs();
    } catch {
      setError('Cannot connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  const assigned   = myJobs.filter(j => j.status === 'assigned');
  const inProgress = myJobs.filter(j => j.status === 'in_progress');
  const completed  = myJobs.filter(j => j.status === 'completed');
  const earnings   = completed.reduce((sum, j) => sum + (parseFloat(j.final_amount) || 0), 0);

  const iconStyle = { width: '18px', height: '18px', marginRight: '0.25rem', verticalAlign: 'middle' };

  if (loading) return <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <div>
      {/* Navbar */}
      <div className="navbar">
        <div className="container">
          <div className="flex items-center gap-2">
            <Wrench size={22} color="#2563eb" />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#2563eb' }}>RepairHub Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <div style={{ fontSize: '0.9rem' }}>{user.name}</div>
            <button onClick={onLogout} className="btn btn-outline btn-sm">
              <LogOut size={14} style={{ marginRight: '0.25rem' }} /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="container">
          <div className="stats-grid">
            <div><div className="stat-value">{assigned.length + inProgress.length}</div><div className="stat-label">Active</div></div>
            <div><div className="stat-value">{completed.length}</div><div className="stat-label">Completed</div></div>
            <div><div className="stat-value">R{earnings.toFixed(0)}</div><div className="stat-label">Earnings</div></div>
            <div>
              <div className="stat-value">
                {reviewData?.rating ? parseFloat(reviewData.rating).toFixed(1) : '–'}
                <span style={{ fontSize: '0.9rem', color: '#f59e0b', marginLeft: '0.2rem' }}>★</span>
              </div>
              <div className="stat-label">Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
        <div className="container" style={{ display: 'flex' }}>
          {[{ key: 'jobs', label: 'My Jobs' }, { key: 'reviews', label: 'Reviews' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '0.875rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
                fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? '#2563eb' : '#6b7280',
                borderBottom: tab === t.key ? '2px solid #2563eb' : '2px solid transparent',
                fontSize: '0.9rem'
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* ── Jobs Tab ── */}
        {tab === 'jobs' && (
          <>
            {/* Assigned */}
            <h3 style={{ marginBottom: '0.75rem' }}>Assigned to Me ({assigned.length})</h3>
            {assigned.length === 0 && <p className="text-muted" style={{ marginBottom: '1.5rem' }}>No assigned jobs yet</p>}
            {assigned.map(job => (
              <div key={job.assignment_id} className="request-item">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="request-title">{job.category}</div>
                    <p style={{ margin: '0.25rem 0', color: '#374151' }}>{job.description}</p>
                    <div className="request-details">
                      <span><img src={clientIcon}   alt="client"   style={iconStyle} />{job.customer_name}</span>
                      <span><img src={addressIcon}  alt="address"  style={iconStyle} />{job.address_line1}, {job.city}</span>
                      {job.scheduled_date && <span><img src={calendarIcon} alt="date" style={iconStyle} />{job.scheduled_date}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#059669' }}>R{job.estimated_cost || '–'}</div>
                    <button onClick={() => handleStart(job.assignment_id)}
                      className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
                      Start Job
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* In Progress */}
            <h3 style={{ margin: '2rem 0 0.75rem' }}>In Progress ({inProgress.length})</h3>
            {inProgress.length === 0 && <p className="text-muted" style={{ marginBottom: '1.5rem' }}>No jobs in progress</p>}
            {inProgress.map(job => (
              <div key={job.assignment_id} className="request-item">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="request-title">{job.category}</div>
                    <p style={{ margin: '0.25rem 0', color: '#374151' }}>{job.description}</p>
                    <div className="request-details">
                      <span><img src={clientIcon} alt="client" style={iconStyle} />{job.customer_name}</span>
                      <span><img src={phoneIcon}  alt="phone"  style={iconStyle} />{job.customer_phone}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className="badge badge-warning" style={{ marginBottom: '0.5rem', display: 'block' }}>In Progress</span>
                    <button onClick={() => { setShowComplete(job); setCompleteForm({ finalAmount: job.estimated_cost || '', notes: '' }); }}
                      className="btn btn-primary btn-sm">
                      Mark Complete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Completed */}
            <h3 style={{ margin: '2rem 0 0.75rem' }}>Completed ({completed.length})</h3>
            {completed.length === 0 && <p className="text-muted">No completed jobs yet</p>}
            {completed.map(job => (
              <div key={job.assignment_id} className="request-item">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="request-title">{job.category}</div>
                    <p style={{ margin: '0.25rem 0', color: '#374151' }}>{job.description}</p>
                    <div className="request-details">
                      <span><img src={clientIcon} alt="client" style={iconStyle} />{job.customer_name}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#059669' }}>R{job.final_amount}</div>
                    <span className="badge badge-success" style={{ marginTop: '0.25rem' }}>Done</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Reviews Tab ── */}
        {tab === 'reviews' && (
          <>
            {reviewLoading && <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading reviews...</p>}

            {reviewData && (
              <>
                {/* Summary card */}
                <div className="card" style={{ textAlign: 'center', padding: '2rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '3rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                    {reviewData.rating ? parseFloat(reviewData.rating).toFixed(1) : '–'}
                  </div>
                  <div style={{ fontSize: '1.5rem', color: '#f59e0b', margin: '0.25rem 0' }}>
                    {[1,2,3,4,5].map(n => (
                      <span key={n} style={{ color: n <= Math.round(reviewData.rating) ? '#f59e0b' : '#d1d5db' }}>★</span>
                    ))}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                    Based on {reviewData.jobsCompleted || 0} review{reviewData.jobsCompleted !== 1 ? 's' : ''}
                  </div>
                  {reviewData.specialization && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#2563eb', fontWeight: 500 }}>
                      {reviewData.specialization}
                    </div>
                  )}
                </div>

                {/* Individual reviews */}
                {reviewData.reviews.length === 0 && (
                  <p className="text-muted" style={{ textAlign: 'center' }}>No reviews yet</p>
                )}
                {reviewData.reviews.map((rv, i) => (
                  <div key={i} className="request-item">
                    <div className="flex justify-between items-start">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{rv.customer_name}</div>
                        <div style={{ color: '#f59e0b', margin: '0.25rem 0', fontSize: '1rem' }}>
                          {[1,2,3,4,5].map(n => (
                            <span key={n} style={{ color: n <= rv.rating ? '#f59e0b' : '#d1d5db' }}>★</span>
                          ))}
                        </div>
                        {rv.comment && (
                          <p style={{ color: '#374151', margin: '0.25rem 0', fontSize: '0.9rem' }}>{rv.comment}</p>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af', flexShrink: 0, marginLeft: '1rem' }}>
                        {new Date(rv.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Complete Job Modal ── */}
      {showComplete && (
        <div className="modal-overlay" onClick={() => setShowComplete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Complete Job</h3>
              <button className="modal-close" onClick={() => setShowComplete(null)}>&times;</button>
            </div>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              Enter the final details for <strong>{showComplete.category}</strong> — {showComplete.customer_name}
            </p>
            <form onSubmit={handleComplete}>
              <div className="form-group">
                <label>Final Amount (R)</label>
                <input type="number" min={0} step="0.01"
                  value={completeForm.finalAmount}
                  onChange={e => setCompleteForm(f => ({ ...f, finalAmount: e.target.value }))}
                  required />
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea value={completeForm.notes}
                  onChange={e => setCompleteForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3} placeholder="What was done, parts used, etc." />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowComplete(null)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Confirm Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
