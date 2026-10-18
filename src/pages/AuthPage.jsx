import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function AuthPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, signup, login, resetPassword } = useAuth();
  const showToast = useToast();

  const [tab, setTab] = useState(params.get('tab') === 'login' ? 'login' : 'signup');
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [showSignupPass, setShowSignupPass] = useState(false);
  const [showLoginPass, setShowLoginPass] = useState(false);

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

  async function handleForgotPassword() {
    const email = loginEmail.trim();
    if (!email) return showToast('Enter your email above first');
    setBusy(true);
    try {
      await resetPassword(email);
      showToast('Password reset email sent — check your inbox');
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
                <div className="password-wrap">
                  <input type={showSignupPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                  <button type="button" className="password-toggle" onClick={() => setShowSignupPass((v) => !v)} aria-label={showSignupPass ? 'Hide password' : 'Show password'}>
                    <i className={`fas ${showSignupPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
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
                <div className="password-wrap">
                  <input type={showLoginPass ? 'text' : 'password'} value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="••••••••" required />
                  <button type="button" className="password-toggle" onClick={() => setShowLoginPass((v) => !v)} aria-label={showLoginPass ? 'Hide password' : 'Show password'}>
                    <i className={`fas ${showLoginPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                <button type="button" className="forgot-link" onClick={handleForgotPassword} disabled={busy}>
                  Forgot password?
                </button>
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
