import { useState } from 'react';
import { LandingPage }          from './components/LandingPage.jsx';
import { LoginForm }            from './components/LoginForm.jsx';
import { CustomerDashboard }    from './components/CustomerDashboard.jsx';
import { TechnicianDashboard }  from './components/TechnicianDashboard.jsx';
import { AdminDashboard }       from './components/AdminDashboard.jsx';

export default function App() {
  const [page, setPage]       = useState('landing');
  const [loginRole, setLoginRole] = useState('customer');
  const [user, setUser]       = useState(null);

  const goLogin = (role) => { setLoginRole(role); setPage('login'); };
  const goBack  = ()     => setPage('landing');

  const handleLogin = (userData) => {
    setUser(userData);
    setPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setPage('landing');
  };

  if (page === 'landing') return <LandingPage onLoginClick={goLogin} />;
  if (page === 'login')   return <LoginForm role={loginRole} onLogin={handleLogin} onBack={goBack} />;

  if (page === 'dashboard' && user) {
    if (user.role === 'admin')      return <AdminDashboard      user={user} onLogout={handleLogout} />;
    if (user.role === 'technician') return <TechnicianDashboard user={user} onLogout={handleLogout} />;
    return                                 <CustomerDashboard   user={user} onLogout={handleLogout} />;
  }

  return null;
}