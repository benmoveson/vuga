import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, signup, login, resetPassword } = useAuth();

  const [tab, setTab] = useState(params.get('tab') === 'login' ? 'login' : 'signup');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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

  function fail(err) {
    const msg = (err?.message || 'Something went wrong').replace('Firebase: ', '');
    setError(msg);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) return setError('Please fill all fields');
    setBusy(true);
    try {
      await signup(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(loginEmail, loginPass);
      navigate('/dashboard');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    const target = loginEmail.trim();
    setError('');
    if (!target) return setError('Enter your email above first');
    setBusy(true);
    try {
      await resetPassword(target);
      setError('');
      setError('Password reset email sent — check your inbox');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <aside className="ag">
        <button className="logo" onClick={() => navigate('/')} style={{ background: 'none', border: 0, padding: 0 }}>
          <i className="fas fa-video" style={{ color: 'var(--blue)' }}></i> Vuga
        </button>
        <div>
          <p className="quote">
            Close more deals from anywhere.
            <small>Create a free account and start hosting private, recorded meetings in seconds.</small>
          </p>
          <ul>
            <li><i className="fas fa-link"></i> Instant private meeting links</li>
            <li><i className="fas fa-desktop"></i> Screen sharing built in</li>
            <li><i className="fas fa-circle-dot"></i> One-click recording to your library</li>
          </ul>
        </div>
        <span className="foot"><i className="fas fa-lock"></i> Private, encrypted, browser-based.</span>
      </aside>

      <main className="af">
        <div style={{ width: '100%', maxWidth: 420 }}>
          {tab === 'signup' ? (
            <form onSubmit={handleSignup}>
              <h3 style={{ fontSize: 24, marginBottom: 6 }}>Create your account</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 20px' }}>
                Start hosting meetings for free.
              </p>

              <div className="fw">
                <label>Full name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="fw">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="fw">
                <label>Password</label>
                <div className="pw">
                  <input
                    type={showSignupPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowSignupPass((v) => !v)} aria-label="Toggle password">
                    <i className={`fas ${showSignupPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              <p className="er">{error}</p>
              <button type="submit" className="btn block" disabled={busy}>
                {busy ? 'Creating…' : 'Create account'}
              </button>
              <p className="alt">
                Already have an account?{' '}
                <button type="button" onClick={() => { setTab('login'); setError(''); }}>Log in</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <h3 style={{ fontSize: 24, marginBottom: 6 }}>Welcome back</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 20px' }}>
                Log in to your Vuga account.
              </p>

              <div className="fw">
                <label>Email</label>
                <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="fw">
                <label>Password</label>
                <div className="pw">
                  <input
                    type={showLoginPass ? 'text' : 'password'}
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowLoginPass((v) => !v)} aria-label="Toggle password">
                    <i className={`fas ${showLoginPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              <button type="button" className="lk" onClick={handleForgotPassword} disabled={busy}>
                Forgot password?
              </button>
              <p className="er">{error}</p>
              <button type="submit" className="btn block" disabled={busy}>
                {busy ? 'Signing in…' : 'Log in'}
              </button>
              <p className="alt">
                New to Vuga?{' '}
                <button type="button" onClick={() => { setTab('signup'); setError(''); }}>Create an account</button>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
