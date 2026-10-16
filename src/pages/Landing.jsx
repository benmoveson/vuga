import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import HeroScene from '../components/HeroScene.jsx';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  function goAuth(tab) {
    navigate(`/auth${tab ? `?tab=${tab}` : ''}`);
  }

  function join() {
    const code = joinCode.trim().replace(/.*\//, '').toUpperCase();
    if (code) navigate(`/join/${code}`);
  }

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <button className="logo" onClick={() => navigate('/')}>
            <i className="fas fa-video"></i> Vuga
          </button>
          <nav className={`nav ${menuOpen ? 'open' : ''}`}>
            <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            {user ? (
              <>
                <a href="/dashboard" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>Dashboard</a>
              </>
            ) : (
              <>
                <a href="#" onClick={(e) => { e.preventDefault(); goAuth(); }}>Sign Up</a>
                <a href="#" onClick={(e) => { e.preventDefault(); goAuth('login'); }}>Log In</a>
              </>
            )}
          </nav>
          <button className="menu-toggle" onClick={() => setMenuOpen((v) => !v)}>
            <i className="fas fa-bars"></i>
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <HeroScene />
          <div className="container hero-content">
            <span className="hero-badge">
              <i className="fas fa-shield-halved"></i> Private links · peer-to-peer video
            </span>
            <h1>Host meetings. Share your screen. Record instantly.</h1>
            <p>
              Create a private entry link, invite anyone, start a video call, share your screen, and save
              recordings straight to your device — no cloud clutter, no downloads to join.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => goAuth()}>
                <i className="fas fa-rocket"></i> Start Hosting Free
              </button>
              <button className="btn btn-secondary" onClick={() => setJoinOpen(true)}>
                <i className="fas fa-right-to-bracket"></i> Join a Meeting
              </button>
            </div>
          </div>
        </section>

        <div className="features" id="features">
          <div className="container">
            <h2>Everything you need to meet online</h2>
            <div className="feature-grid">
              <div className="feature-card">
                <div className="icon"><i className="fas fa-link"></i></div>
                <h3>Create an Entry Link</h3>
                <p>Generate a unique link in one click. Share it with anyone — they click and join your room instantly.</p>
              </div>
              <div className="feature-card">
                <div className="icon"><i className="fas fa-video"></i></div>
                <h3>Video Call</h3>
                <p>Real-time peer-to-peer video and audio, streamed directly between participants.</p>
              </div>
              <div className="feature-card">
                <div className="icon"><i className="fas fa-desktop"></i></div>
                <h3>Screen Share</h3>
                <p>Share your entire screen, a window, or a tab to explain websites, demos, or tutorials.</p>
              </div>
              <div className="feature-card">
                <div className="icon"><i className="fas fa-record-vinyl"></i></div>
                <h3>Recording</h3>
                <p>Record your call with a camera picture-in-picture overlay and keep it in your library.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="how-it-works">
          <div className="container">
            <h2>How Vuga works</h2>
            <div className="steps">
              <div className="step">
                <span className="step-num">1</span>
                <h3>Sign up & create link</h3>
                <p>Create your free host account and generate a meeting entry link.</p>
              </div>
              <div className="step">
                <span className="step-num">2</span>
                <h3>Share & join</h3>
                <p>Send the link. Anyone who clicks it enters your meeting room.</p>
              </div>
              <div className="step">
                <span className="step-num">3</span>
                <h3>Talk, share, record</h3>
                <p>Video call, share screen, chat, and record — all in the browser.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p><i className="fas fa-video"></i> Vuga — woven conversations, everywhere. © {new Date().getFullYear()}</p>
        </div>
      </footer>

      {joinOpen && (
        <div className="modal" onClick={() => setJoinOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Join a Meeting</h3>
            <input
              type="text"
              placeholder="Enter meeting code or paste link"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && join()}
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setJoinOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={join}>Join</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
