import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Wordmark from '../components/Wordmark.jsx';
import hero from '../assets/hero.jpg';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function genCode() {
  const c = 'abcdefghjkmnpqrstuvwxyz';
  const s = (k) => Array.from({ length: k }, () => c[Math.floor(Math.random() * c.length)]).join('');
  return `${s(3)}-${s(4)}-${s(3)}`;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, signup, login, resetPassword } = useAuth();
  const showToast = useToast();

  const [view, setView] = useState(params.get('tab') === 'login' ? 'fl' : 'fs');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLp, setShowLp] = useState(false);

  const [bad, setBad] = useState({});
  const [welcomeName, setWelcomeName] = useState('');
  const [welcomeLink, setWelcomeLink] = useState('');

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  async function handleSignup(e) {
    e.preventDefault();
    const next = {
      sn: name.trim().length > 1,
      se: emailRe.test(email.trim()),
      sp: password.length >= 8
    };
    setBad(next);
    if (!(next.sn && next.se && next.sp)) return;
    if (!terms) {
      showToast('Please accept the terms to continue');
      return;
    }
    try {
      await signup(name.trim(), email.trim(), password);
      setWelcomeName(name.trim().split(' ')[0]);
      setWelcomeLink(`vuga.app/m/${genCode()}`);
      setView('fok');
    } catch (err) {
      showToast((err?.message || 'Could not create account').replace('Firebase: ', ''));
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail.trim() && !loginPass) {
      navigate('/dashboard');
      return;
    }
    const ok = { le: emailRe.test(loginEmail.trim()), lp: loginPass.length > 0 };
    setBad(ok);
    if (!(ok.le && ok.lp)) return;
    try {
      await login(loginEmail.trim(), loginPass);
      navigate('/dashboard');
    } catch (err) {
      showToast((err?.message || 'Could not sign in').replace('Firebase: ', ''));
    }
  }

  async function handleForgot() {
    const target = loginEmail.trim();
    if (!emailRe.test(target)) {
      setBad((b) => ({ ...b, le: false }));
      showToast('Enter your email above first');
      return;
    }
    try {
      await resetPassword(target);
      showToast('Password reset email sent — check your inbox');
    } catch (err) {
      showToast((err?.message || 'Could not send reset email').replace('Firebase: ', ''));
    }
  }

  function copyWelcome() {
    try {
      navigator.clipboard.writeText(welcomeLink);
    } catch {
      /* clipboard unavailable */
    }
    showToast('Link copied');
  }

  return (
    <div id="auth" className="on" role="dialog" aria-label="Account">
      <div className="ag">
        <div className="af">
          <a className="logo" href="#top" aria-label="Back to Vuga" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
            <Wordmark />
          </a>
          <div className="fw">
            <form id="fs" noValidate style={{ display: view === 'fs' ? 'block' : 'none' }} onSubmit={handleSignup}>
              <h2>Create your account</h2>
              <p className="sub">Start hosting deal rooms in under a minute. No credit card needed.</p>
              <label className={`fi${bad.sn === false ? ' bad' : ''}`}>
                Full name
                <input autoComplete="name" placeholder="Aline Uwase" value={name} onChange={(e) => setName(e.target.value)} />
                <span className="er">Please enter your full name.</span>
              </label>
              <label className={`fi${bad.se === false ? ' bad' : ''}`}>
                Email
                <input type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <span className="er">Enter a valid email address.</span>
              </label>
              <label className={`fi${bad.sp === false ? ' bad' : ''}`}>
                Password
                <span className="pw">
                  <input type={showLp ? 'text' : 'password'} autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" className="tg" onClick={() => setShowLp((v) => !v)}>{showLp ? 'Hide' : 'Show'}</button>
                </span>
                <span className="er">Use at least 8 characters.</span>
              </label>
              <label className="chk">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
                <span>I agree to the Terms of Service and Privacy Policy.</span>
              </label>
              <button className="btn" type="submit">Create account</button>
              <button className="btn g" type="button" style={{ marginTop: 10 }} onClick={() => navigate('/dashboard')}>Explore without an account</button>
              <div className="alt">Already have an account? <a onClick={() => setView('fl')}>Log in</a></div>
            </form>

            <form id="fl" noValidate style={{ display: view === 'fl' ? 'block' : 'none' }} onSubmit={handleLogin}>
              <h2>Welcome back</h2>
              <p className="sub">Log in to manage your deal rooms and links.</p>
              <label className={`fi${bad.le === false ? ' bad' : ''}`}>
                Email
                <input type="email" autoComplete="email" placeholder="you@company.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                <span className="er">Enter a valid email address.</span>
              </label>
              <label className={`fi${bad.lp === false ? ' bad' : ''}`}>
                Password
                <span className="pw">
                  <input type={showLp ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} />
                  <button type="button" className="tg" onClick={() => setShowLp((v) => !v)}>{showLp ? 'Hide' : 'Show'}</button>
                </span>
                <span className="er">Enter your password.</span>
              </label>
              <div className="row2"><span></span><a onClick={handleForgot}>Forgot password?</a></div>
              <button className="btn" type="submit">Log in</button>
              <button className="btn g" type="button" style={{ marginTop: 10 }} onClick={() => navigate('/dashboard')}>Explore without an account</button>
              <div className="alt">New to Vuga? <a onClick={() => setView('fs')}>Create an account</a></div>
            </form>

            <div id="fok" style={{ display: view === 'fok' ? 'block' : 'none' }}>
              <h2 style={{ textAlign: 'center' }}>You’re in, {welcomeName} 🎉</h2>
              <p className="sub" style={{ textAlign: 'center' }}>Here’s your first entry link. Share it and anyone who clicks lands in your room.</p>
              <div className="lk">
                <code>{welcomeLink}</code>
                <button className="btn sm" type="button" onClick={copyWelcome}>Copy</button>
              </div>
              <a className="btn" href="#/app" style={{ display: 'block', textAlign: 'center' }} onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>Go to my dashboard</a>
              <p className="note2" style={{ textAlign: 'center' }}>Prototype: accounts aren’t saved yet.</p>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>© 2026 Vuga</div>
        </div>
        <div className="ai">
          <img src={hero} alt="" />
          <div className="aq">“Clients click the link and we are talking. No installs, no excuses.”<small>Marc T. · Consultant</small></div>
        </div>
      </div>
    </div>
  );
}
