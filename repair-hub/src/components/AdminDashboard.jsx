import { useState, useEffect, useCallback } from 'react';
import { Wrench, LogOut, Users, ClipboardList, DollarSign, Clock } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API = 'http://localhost:8080/api';
const CATEGORIES = ['Plumbing', 'Electrical', 'Appliances', 'Electronics', 'HVAC', 'Carpentry'];
const STATUSES = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'];

export function AdminDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [byMonth, setByMonth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Request filters (client-side)
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, requestsRes, techRes, reviewsRes, appealsRes, byCatRes, byMonthRes] =
        await Promise.all([
          fetch(`${API}/admin/stats`),
          fetch(`${API}/admin/users`),
          fetch(`${API}/admin/requests`),
          fetch(`${API}/admin/users?role=technician&status=active`),
          fetch(`${API}/admin/reviews`),
          fetch(`${API}/admin/appeals`),
          fetch(`${API}/admin/stats/requests-by-category`),
          fetch(`${API}/admin/stats/requests-by-month`),
        ]);
      
      const [statsData, usersData, requestsData, techData, reviewsData, appealsData, byCatData, byMonthData] =
        await Promise.all([
          statsRes.json(), usersRes.json(), requestsRes.json(), techRes.json(),
          reviewsRes.json(), appealsRes.json(), byCatRes.json(), byMonthRes.json()
        ]);
      
      setStats(statsData);
      setUsers(usersData);
      setRequests(requestsData);
      setTechnicians(techData);
      setReviews(reviewsData);
      setAppeals(appealsData);
      setByCategory(byCatData.map(r => ({ name: r.category, total: Number(r.total) })));
      setByMonth(byMonthData.map(r => ({ name: r.month, total: Number(r.total) })));
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateUserStatus = async (userId, status) => {
    try {
      await fetch(`${API}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchAll();
    } catch {
      setError('Failed to update user');
    }
  };

  const assignTechnician = async (requestId, technicianId) => {
    if (!technicianId) return;
    try {
      const res = await fetch(`${API}/admin/requests/${requestId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      fetchAll();
    } catch {
      setError('Failed to assign technician');
    }
  };

  const resolveAppeal = async (appealId, decision) => {
    try {
      const res = await fetch(`${API}/admin/appeals/${appealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      fetchAll();
    } catch {
      setError('Failed to resolve appeal');
    }
  };

  // Client-side filtering
  const filteredRequests = requests.filter(r => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterCategory && r.category !== filterCategory) return false;
    if (filterFrom && new Date(r.created_at) < new Date(filterFrom)) return false;
    if (filterTo && new Date(r.created_at) > new Date(filterTo + 'T23:59:59')) return false;
    return true;
  });

  const clearFilters = () => {
    setFilterStatus('');
    setFilterCategory('');
    setFilterFrom('');
    setFilterTo('');
  };

  const pendingApprovals = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status !== 'pending');
  const pendingAppeals = appeals.filter(a => a.status === 'pending');
  const hasFilters = filterStatus || filterCategory || filterFrom || filterTo;

  const userBadge = (s) => {
    const map = { active: 'badge-success', pending: 'badge-warning', suspended: 'badge-danger' };
    return <span className={`badge ${map[s] || 'badge-info'}`}>{s}</span>;
  };

  const reqBadge = (s) => {
    const map = { pending: 'badge-info', assigned: 'badge-warning', in_progress: 'badge-warning', completed: 'badge-success', cancelled: 'badge-danger' };
    return <span className={`badge ${map[s] || 'badge-info'}`}>{s?.replace('_', ' ')}</span>;
  };

  const appealBadge = (s) => {
    const map = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };
    return <span className={`badge ${map[s] || 'badge-info'}`}>{s}</span>;
  };

  if (loading) return <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>Loading...</div>;

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'approvals', label: `Approvals${pendingApprovals.length > 0 ? ` (${pendingApprovals.length})` : ''}` },
    { key: 'appeals', label: `Appeals${pendingAppeals.length > 0 ? ` (${pendingAppeals.length})` : ''}` },
    { key: 'users', label: 'Users' },
    { key: 'requests', label: 'Requests' },
    { key: 'reviews', label: 'Reviews' },
  ];

  return (
    <div>
      {/* Navbar */}
      <div className="navbar">
        <div className="container">
          <div className="flex items-center gap-2">
            <Wrench size={22} color="#2563eb" />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#2563eb' }}>RepairHub Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '0.9rem' }}>{user.name}</span>
            <button onClick={onLogout} className="btn btn-outline btn-sm">
              <LogOut size={14} style={{ marginRight: '0.25rem' }} /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
        <div className="container" style={{ display: 'flex', overflowX: 'auto' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '0.875rem 1.25rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? '#2563eb' : '#6b7280',
                borderBottom: tab === t.key ? '2px solid #2563eb' : '2px solid transparent',
                whiteSpace: 'nowrap',
                fontSize: '0.9rem'
              }}
            >
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

        {/* Overview Tab */}
        {tab === 'overview' && (
          <>
            <h2 style={{ marginBottom: '1.5rem' }}>Platform Overview</h2>

            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { icon: Users, color: '#2563eb', value: stats.totalCustomers, label: 'Customers' },
                { icon: Users, color: '#7c3aed', value: stats.totalTechnicians, label: 'Technicians' },
                { icon: Clock, color: '#ea580c', value: stats.pendingApprovals, label: 'Pending Approval' },
                { icon: Clock, color: '#d97706', value: stats.pendingAppeals, label: 'Pending Appeals' },
                { icon: ClipboardList, color: '#dc2626', value: stats.pendingRequests, label: 'Unassigned' },
                { icon: ClipboardList, color: '#d97706', value: stats.activeJobs, label: 'Active Jobs' },
                { icon: ClipboardList, color: '#16a34a', value: stats.completedJobs, label: 'Completed Jobs' },
                { icon: DollarSign, color: '#16a34a', value: `R${parseFloat(stats.totalRevenue || 0).toFixed(0)}`, label: 'Total Revenue' },
              ].map(({ icon: Icon, color, value, label }) => (
                <div key={label} className="card">
                  <div className="card-content flex justify-between items-center">
                    <Icon size={28} color={color} />
                    <div style={{ textAlign: 'right' }}>
                      <div className="stat-value">{value}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Requests by Category */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Requests by Category</h3>
                {byCategory.length === 0 ? (
                  <p className="text-muted">No data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byCategory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Requests by Month */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Requests — Last 6 Months</h3>
                {byMonth.length === 0 ? (
                  <p className="text-muted">No data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={byMonth} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}

        {/* Approvals Tab */}
        {tab === 'approvals' && (
          <>
            <h2 style={{ marginBottom: '1.5rem' }}>Technician Applications</h2>
            {pendingApprovals.length === 0 && <p className="text-muted">No pending approvals</p>}
            {pendingApprovals.map(u => (
              <div key={u.user_id} className="request-item">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="request-title">{u.full_name}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0' }}>
                      {u.email}{u.phone ? ` • ${u.phone}` : ''}
                    </div>
                    {u.specialization && <div style={{ fontSize: '0.875rem' }}>Specialization: {u.specialization}</div>}
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                      Applied {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2" style={{ flexShrink: 0 }}>
                    <button onClick={() => updateUserStatus(u.user_id, 'active')} className="btn btn-primary btn-sm">Approve</button>
                    <button onClick={() => updateUserStatus(u.user_id, 'suspended')} className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#dc2626' }}>Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Appeals Tab */}
        {tab === 'appeals' && (
          <>
            <h2 style={{ marginBottom: '1.5rem' }}>Suspension Appeals</h2>
            {appeals.length === 0 && <p className="text-muted">No appeals submitted</p>}
            {appeals.map(a => (
              <div key={a.appeal_id} className="request-item">
                <div className="flex justify-between items-start">
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: '0.25rem' }}>
                      <span className="request-title">{a.full_name}</span>
                      {appealBadge(a.status)}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      {a.email}{a.specialization ? ` • ${a.specialization}` : ''}
                      {a.rating ? ` • ⭐ ${parseFloat(a.rating).toFixed(1)}` : ''}
                      {a.jobs_completed ? ` • ${a.jobs_completed} jobs` : ''}
                    </div>
                    <div style={{ background: '#f9fafb', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.9rem', color: '#374151' }}>
                      <strong>Appeal reason:</strong> {a.reason}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                      Submitted {new Date(a.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {a.status === 'pending' && (
                    <div className="flex gap-2" style={{ flexShrink: 0, marginLeft: '1rem' }}>
                      <button onClick={() => resolveAppeal(a.appeal_id, 'approved')} className="btn btn-primary btn-sm">Approve</button>
                      <button onClick={() => resolveAppeal(a.appeal_id, 'rejected')} className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#dc2626' }}>Reject</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <>
            <h2 style={{ marginBottom: '1.5rem' }}>All Users</h2>
            <div className="card">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Stats</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeUsers.map(u => (
                      <tr key={u.user_id}>
                        <td data-label="Name">{u.full_name}</td>
                        <td data-label="Email" style={{ fontSize: '0.875rem' }}>{u.email}</td>
                        <td data-label="Role" style={{ textTransform: 'capitalize' }}>{u.role}</td>
                        <td data-label="Status">{userBadge(u.status)}</td>
                        <td data-label="Stats" style={{ fontSize: '0.875rem' }}>
                          {u.role === 'technician' ? `⭐ ${u.rating || '–'} • ${u.jobs_completed || 0} jobs` : '–'}
                        </td>
                        <td data-label="Actions">
                          {u.status === 'active' && (
                            <button onClick={() => updateUserStatus(u.user_id, 'suspended')} className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#dc2626' }}>
                              Suspend
                            </button>
                          )}
                          {u.status === 'suspended' && (
                            <button onClick={() => updateUserStatus(u.user_id, 'active')} className="btn btn-outline btn-sm">
                              Reactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Requests Tab with Filters */}
        {tab === 'requests' && (
          <>
            <h2 style={{ marginBottom: '1.25rem' }}>All Repair Requests</h2>

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                >
                  <option value="">All statuses</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Category</label>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>From</label>
                <input
                  type="date"
                  value={filterFrom}
                  onChange={e => setFilterFrom(e.target.value)}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>To</label>
                <input
                  type="date"
                  value={filterTo}
                  onChange={e => setFilterTo(e.target.value)}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                />
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="btn btn-outline btn-sm" style={{ marginBottom: '0.1rem' }}>
                  Clear filters
                </button>
              )}
              <span style={{ fontSize: '0.8rem', color: '#6b7280', alignSelf: 'flex-end', marginBottom: '0.25rem' }}>
                {filteredRequests.length} of {requests.length} requests
              </span>
            </div>

            <div className="card">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Customer</th>
                      <th>Category</th>
                      <th>Location</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Technician</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No requests match the filters</td>
                      </tr>
                    )}
                    {filteredRequests.map(r => (
                      <tr key={r.request_id}>
                        <td data-label="ID">#{r.request_id}</td>
                        <td data-label="Customer">{r.customer_name}</td>
                        <td data-label="Category">{r.category}</td>
                        <td data-label="Location" style={{ fontSize: '0.8rem' }}>{r.city}, {r.state}</td>
                        <td data-label="Date" style={{ fontSize: '0.8rem' }}>
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : '–'}
                        </td>
                        <td data-label="Status">{reqBadge(r.status)}</td>
                        <td data-label="Technician">
                          {r.status === 'pending' ? (
                            <select
                              defaultValue=""
                              onChange={e => assignTechnician(r.request_id, e.target.value)}
                              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                            >
                              <option value="">Assign...</option>
                              {technicians.map(t => (
                                <option key={t.user_id} value={t.user_id}>{t.full_name}</option>
                              ))}
                            </select>
                          ) : (r.technician_name || '–')}
                        </td>
                        <td data-label="Amount">
                          {r.final_amount ? `R${r.final_amount}` : r.estimated_cost ? `R${r.estimated_cost}` : '–'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Reviews Tab */}
        {tab === 'reviews' && (
          <>
            <h2 style={{ marginBottom: '1.5rem' }}>All Reviews</h2>
            {reviews.length === 0 && <p className="text-muted">No reviews yet</p>}
            {reviews.map(rv => (
              <div key={rv.review_id} className="request-item">
                <div className="flex justify-between items-start">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span className="request-title">{rv.technician_name}</span>
                      <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>• {rv.category}</span>
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>by {rv.customer_name}</div>
                    <div style={{ marginBottom: '0.25rem' }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <span key={n} style={{ color: n <= rv.rating ? '#f59e0b' : '#d1d5db' }}>★</span>
                      ))}
                    </div>
                    {rv.comment && <p style={{ color: '#374151', fontSize: '0.9rem', margin: 0 }}>{rv.comment}</p>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af', flexShrink: 0, marginLeft: '1rem' }}>
                    {new Date(rv.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}