import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function AuthPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, signup, login } = useAuth();
  const showToast = useToast();

  const [tab, setTab] = useState(params.get('tab') === 'login' ? 'login' : 'signup');
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  async function handleSignup(e) {
    e.preventDefault();
    if (!name || !email || !password) return showToast('Please fill all fields');
    setBusy(true);
    try {
      await signup(name, email, password);
      showToast('Account created! Welcome to Vuga.');
      navigate('/dashboard');
    } catch (err) {
      showToast(err.message.replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(loginEmail, loginPass);
      showToast('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      showToast(err.message.replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <button className="logo" onClick={() => navigate('/')}>
            <i className="fas fa-video"></i> Vuga
          </button>
          <nav className="nav">
            <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Home</a>
          </nav>
        </div>
      </header>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-tabs">
            <button className={`tab-btn ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>Sign Up</button>
            <button className={`tab-btn ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Log In</button>
          </div>

          {tab === 'signup' ? (
            <form className="auth-form" onSubmit={handleSignup}>
              <h2>Create your host account</h2>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'Creating…' : 'Create Account'}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleLogin}>
              <h2>Welcome back</h2>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="••••••••" required />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'Signing in…' : 'Log In'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
