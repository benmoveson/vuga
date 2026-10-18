import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { sanitizeMeetingCode } from '../lib/meetingCode.js';

const art = (inner) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'>${inner}</svg>`
  )}`;

const HERO_IMG = art(`
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='rgb(46,36,26)'/>
      <stop offset='1' stop-color='rgb(11,18,14)'/>
    </linearGradient>
  </defs>
  <rect width='600' height='600' fill='url(#g)'/>
  <rect x='70' y='90' width='460' height='300' rx='22' fill='rgb(15,26,20)' stroke='rgb(46,55,49)'/>
  <circle cx='300' cy='215' r='62' fill='rgb(46,59,52)'/>
  <rect x='250' y='300' width='100' height='10' rx='5' fill='rgb(60,74,66)'/>
  <rect x='90' y='360' width='140' height='100' rx='14' fill='rgb(20,32,25)' stroke='rgb(46,55,49)'/>
  <circle cx='160' cy='400' r='22' fill='rgb(232,89,12)'/>
  <rect x='100' y='430' width='120' height='8' rx='4' fill='rgb(60,74,66)'/>
  <rect x='370' y='360' width='140' height='100' rx='14' fill='rgb(20,32,25)' stroke='rgb(46,55,49)'/>
  <circle cx='440' cy='400' r='22' fill='rgb(46,59,52)'/>
  <rect x='380' y='430' width='120' height='8' rx='4' fill='rgb(60,74,66)'/>
  <rect x='70' y='480' width='460' height='60' rx='16' fill='rgb(16,26,21)' stroke='rgb(46,55,49)'/>
  <circle cx='230' cy='510' r='15' fill='rgb(232,89,12)'/>
  <circle cx='285' cy='510' r='15' fill='rgb(60,74,66)'/>
  <circle cx='340' cy='510' r='15' fill='rgb(60,74,66)'/>
  <circle cx='395' cy='510' r='15' fill='rgb(192,57,43)'/>
`);

const FEATURE_IMGS = [
  art(`
    <rect width='600' height='600' fill='rgb(15,26,20)'/>
    <rect x='60' y='90' width='480' height='420' rx='22' fill='rgb(20,32,25)' stroke='rgb(46,55,49)'/>
    <rect x='90' y='130' width='420' height='12' rx='6' fill='rgb(232,89,12)'/>
    <rect x='90' y='180' width='220' height='10' rx='5' fill='rgb(60,74,66)'/>
    <rect x='90' y='215' width='320' height='10' rx='5' fill='rgb(60,74,66)'/>
    <rect x='90' y='250' width='180' height='10' rx='5' fill='rgb(60,74,66)'/>
    <rect x='90' y='320' width='150' height='150' rx='14' fill='rgb(232,89,12)'/>
    <rect x='260' y='320' width='250' height='150' rx='14' fill='rgb(35,49,41)'/>
  `),
  art(`
    <rect width='600' height='600' fill='rgb(15,26,20)'/>
    <rect x='60' y='120' width='300' height='240' rx='18' fill='rgb(20,32,25)' stroke='rgb(46,55,49)'/>
    <circle cx='210' cy='240' r='52' fill='rgb(46,59,52)'/>
    <rect x='390' y='120' width='150' height='110' rx='14' fill='rgb(35,49,41)'/>
    <rect x='390' y='250' width='150' height='110' rx='14' fill='rgb(35,49,41)'/>
    <rect x='60' y='390' width='480' height='70' rx='16' fill='rgb(16,26,21)' stroke='rgb(46,55,49)'/>
    <circle cx='150' cy='425' r='14' fill='rgb(232,89,12)'/>
    <circle cx='210' cy='425' r='14' fill='rgb(60,74,66)'/>
    <circle cx='270' cy='425' r='14' fill='rgb(60,74,66)'/>
  `),
  art(`
    <rect width='600' height='600' fill='rgb(15,26,20)'/>
    <circle cx='300' cy='250' r='120' fill='none' stroke='rgb(232,89,12)' stroke-width='14'/>
    <path d='M270 200 L370 250 L270 300 Z' fill='rgb(232,89,12)'/>
    <rect x='120' y='430' width='360' height='14' rx='7' fill='rgb(60,74,66)'/>
    <rect x='120' y='460' width='240' height='14' rx='7' fill='rgb(60,74,66)'/>
  `)
];

const FEATURES = [
  {
    kicker: 'Instant rooms',
    title: 'Create an entry link in seconds',
    body: 'Spin up a private, browser-based room with a secure code. No installs, no downloads — for you or your guests.',
    points: ['Crypto-random room codes', 'Guests join by name in one click', 'Nothing to configure']
  },
  {
    kicker: 'HD calls',
    title: 'HD video calls with screen sharing',
    body: 'Crystal-clear peer-to-peer audio and video, plus instant screen share to demo websites and walk through proposals.',
    points: ['True peer-to-peer WebRTC', 'Share a screen, window or tab', 'Live chat alongside the call']
  },
  {
    kicker: 'Recordings',
    title: 'Record screens directly to your device',
    body: 'Capture the call and screen with a camera bubble, then save the file straight to your device and private library.',
    points: ['One-click recording', 'Camera bubble compositing', 'Saved to your library']
  }
];

const STEPS = [
  { title: 'Sign up for your Vuga account', body: 'Create a free account in seconds. No credit card, no setup.' },
  { title: 'Create your entry link', body: 'Generate a secure meeting link with a unique room code.' },
  { title: 'Share the link', body: 'Send it anywhere. Guests open it and join by name — no install.' },
  { title: 'Meet immediately', body: 'Talk, share your screen, chat, and record — all in one room.' }
];

const STATS = [
  { value: '8', label: 'peers per room' },
  { value: '1-click', label: 'to start a call' },
  { value: 'HD', label: 'WebRTC video' },
  { value: '100%', label: 'browser based' }
];

const REVIEWS = [
  {
    quote: 'We replaced two tools with Vuga. Reps drop a link in the thread and close on the call — recordings land in our library automatically.',
    name: 'Amara Okafor',
    role: 'Head of Sales, Northwind',
    initials: 'AO'
  },
  {
    quote: 'The screen share plus recording combo is our onboarding engine. I record a walkthrough once and share the link forever.',
    name: 'Diego Marín',
    role: 'Founder, Loop Studio',
    initials: 'DM'
  },
  {
    quote: 'Guests join by name in two seconds. No downloads, no confusion, and the video quality has been rock solid.',
    name: 'Priya Nair',
    role: 'Ops Lead, Brightcart',
    initials: 'PN'
  },
  {
    quote: 'Recording straight to my device changed how I follow up. I send the clip the same day and deals move faster.',
    name: 'Sam Whitfield',
    role: 'Account Exec, Fieldset',
    initials: 'SW'
  }
];

const FAQS = [
  {
    q: 'Is Vuga free to use?',
    a: 'Yes. You can create an account, host rooms, share your screen and record — all for free.'
  },
  {
    q: 'Do my guests need to install anything?',
    a: 'No. Vuga runs entirely in the browser. Guests open your meeting link, type a name, and they are in the room.'
  },
  {
    q: 'How many people can join a room?',
    a: 'Rooms support up to 8 participants over peer-to-peer WebRTC, with screen sharing and chat available to everyone.'
  },
  {
    q: 'Where are recordings stored?',
    a: 'Recordings are saved to your device instantly. When you are signed in they are also uploaded to your private library so you can revisit them later.'
  },
  {
    q: 'Is it secure?',
    a: 'Connections are encrypted and every room uses a crypto-random code. Your media flows directly between participants wherever possible.'
  }
];

const STAGES = ['Discovery', 'Demo', 'Proposal', 'Closed'];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [openFaq, setOpenFaq] = useState(0);
  const [stage, setStage] = useState(1);
  const [tab, setTab] = useState('proposal');
  const [items, setItems] = useState([
    { label: 'Vuga Pro plan', price: 240, on: true },
    { label: 'Onboarding session', price: 150, on: true },
    { label: 'Priority support', price: 90, on: false }
  ]);

  const goAuth = (login) => navigate(`/auth${login ? '?tab=login' : ''}`);

  const total = items.filter((i) => i.on).reduce((sum, i) => sum + i.price, 0);

  function toggleItem(label) {
    setItems((prev) => prev.map((i) => (i.label === label ? { ...i, on: !i.on } : i)));
  }

  function join() {
    const code = sanitizeMeetingCode(joinCode.trim().replace(/.*\//, ''));
    if (code) navigate(`/join/${code}`);
  }

  return (
    <>
      <nav>
        <div className="w">
          <a className="logo" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
            <svg viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="0" y="0" width="16" height="16" rx="4" fill="#e8590c" />
              <path d="M17 6.5 L22 4 V12 L17 9.5 Z" fill="#e8590c" />
            </svg>
            Vuga
          </a>
          <div className="links">
            <a className="l" href="#features">Features</a>
            <a className="l" href="#how">How it works</a>
            <a className="l" href="#reviews">Reviews</a>
            <a className="l" href="#faq">FAQ</a>
          </div>
          {user ? (
            <button className="btn sm" onClick={() => navigate('/dashboard')}>Dashboard</button>
          ) : (
            <>
              <button className="btn g sm" onClick={() => goAuth(true)}>Log in</button>
              <button className="btn sm" onClick={() => goAuth(false)}>Start free</button>
            </>
          )}
          <button className="menu-toggle" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            <i className={`fas ${menuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
          </button>
        </div>
        {menuOpen && (
          <div className="w" style={{ flexDirection: 'column', alignItems: 'flex-start', paddingBottom: 16 }}>
            <a className="l" href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            <a className="l" href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
            <a className="l" href="#reviews" onClick={() => setMenuOpen(false)}>Reviews</a>
            <a className="l" href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
          </div>
        )}
      </nav>

      <header className="hero">
        <div className="w">
          <div className="hg">
            <div>
              <h1>Close deals from anywhere with Vuga</h1>
              <p>
                Spin up a private room, invite anyone with a link, share your screen, and record the
                whole conversation — all in the browser, no downloads to join.
              </p>
              <div className="cta">
                <button className="btn" onClick={() => goAuth(false)}>Start free</button>
                <button className="btn g" onClick={() => setJoinOpen(true)}>Join a meeting</button>
              </div>
            </div>
            <img src={HERO_IMG} alt="Vuga video meeting" />
          </div>
        </div>
      </header>

      <section id="demo">
        <div className="w">
          <span className="lab">Built for sales calls, demos, and follow-ups</span>
          <div className="demo">
            <div className="dtop">
              <i></i><i></i><i></i>
              <span>
                vuga — weekly pipeline review
                <span className="rec on">REC 02:14</span>
              </span>
            </div>

            <div className="stages">
              {STAGES.map((s, i) => (
                <button
                  key={s}
                  className={`st ${stage === i ? 'on' : stage > i ? 'done' : ''}`}
                  onClick={() => setStage(i)}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="dg">
              <div className="vids">
                <div className="t screen">
                  <div className="screen-inner">
                    <div className="bar s"></div>
                    <div className="bar m"></div>
                    <div className="chart">
                      <span style={{ height: '40%' }}></span>
                      <span style={{ height: '70%' }}></span>
                      <span style={{ height: '55%' }}></span>
                      <span style={{ height: '90%' }}></span>
                      <span style={{ height: '65%' }}></span>
                    </div>
                  </div>
                  <span className="nm">Screen share · Q3 proposal</span>
                </div>
                <div className="t">
                  <div className="av">D</div>
                  <span className="nm">Diego</span>
                </div>
                <div className="t">
                  <div className="av">P</div>
                  <span className="nm">Priya</span>
                </div>
              </div>

              <div className="box">
                <h4>Proposal builder</h4>
                {items.map((i) => (
                  <label className="li" key={i.label}>
                    <input
                      className="ck"
                      type="checkbox"
                      checked={i.on}
                      onChange={() => toggleItem(i.label)}
                    />
                    <span>
                      <b>{i.label}</b>
                      <br />
                      ${i.price}/mo
                    </span>
                  </label>
                ))}
                <p className="tot">${total}<span className="note">/mo</span></p>
              </div>
            </div>

            <div className="pan">
              <div className="box">
                <div className="tabs">
                  {[
                    ['proposal', 'Proposal'],
                    ['notes', 'Notes'],
                    ['next', 'Next steps']
                  ].map(([id, label]) => (
                    <button key={id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
                      {label}
                    </button>
                  ))}
                </div>
                {tab === 'proposal' && (
                  <p className="tp">
                    Recommended plan: <b>Vuga Pro</b> at ${total}/mo, billed monthly. Includes HD rooms,
                    screen sharing, recording and the private library for your whole team.
                  </p>
                )}
                {tab === 'notes' && (
                  <p className="tp">
                    Champion: Diego. Needs sign-off from ops. Asking for a security one-pager and a
                    trial with the support team before the end of the quarter.
                  </p>
                )}
                {tab === 'next' && (
                  <p className="tp">
                    Send the proposal today. Book a 30-minute follow-up for Thursday. Share the recorded
                    walkthrough so the wider team can review asynchronously.
                  </p>
                )}
              </div>
              <div className="box">
                <h4>Live room</h4>
                <div className="sg">
                  <span className="st on">4 in room</span>
                  <span className="st">Chat open</span>
                </div>
                <p className="tp" style={{ marginTop: 12 }}>
                  Recording is on. When you stop, the file saves to your device and your library.
                </p>
              </div>
            </div>

            <div className="ctl">
              <button title="Microphone"><i className="fas fa-microphone"></i></button>
              <button title="Camera"><i className="fas fa-video"></i></button>
              <button title="Screen share"><i className="fas fa-desktop"></i></button>
              <button className="red" title="Record"><i className="fas fa-circle"></i></button>
              <button title="Chat"><i className="fas fa-comment"></i></button>
            </div>
          </div>
        </div>
      </section>

      <section id="features">
        <div className="w">
          <span className="lab">Built for winners</span>
          <h2>Everything you need to close on the call</h2>
          <p className="sub">Video, screen share, chat and recording — bundled into one clean, focused room.</p>
          <div style={{ display: 'grid', gap: 48 }}>
            {FEATURES.map((f, i) => (
              <div className={`fg ${i % 2 ? 'rev' : ''}`} key={f.title}>
                <div className="fimg">
                  <img src={FEATURE_IMGS[i]} alt={f.title} />
                </div>
                <div className="fc">
                  <span className="kick">{f.kicker}</span>
                  <h2>{f.title}</h2>
                  <p>{f.body}</p>
                  <ul>
                    {f.points.map((p) => (
                      <li key={p}><i className="fas fa-check"></i> {p}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how">
        <div className="w">
          <h2>Start in four moves</h2>
          <p className="sub">From link to closed deal in minutes.</p>
          <div className="sg2">
            {STEPS.map((s, i) => (
              <div className="sc" key={s.title}>
                <span className="n">Step {i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="w">
          <div className="sn">
            {STATS.map((s) => (
              <div key={s.label}>
                <b>{s.value}</b>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="reviews">
        <div className="w">
          <h2>Teams close faster on Vuga</h2>
          <p className="sub">Loved by founders and reps who live on calls.</p>
          <div className="car">
            <div className="rail">
              {REVIEWS.map((r) => (
                <div className="tc" key={r.name}>
                  <div className="stars">★★★★★</div>
                  <p>{r.quote}</p>
                  <div className="who">
                    <span className="av">{r.initials}</span>
                    <div>
                      <b>{r.name}</b>
                      <span>{r.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="w">
          <div className="cta2">
            <h2>Your next meeting starts with one link</h2>
            <p>Create a room in seconds and bring your customers, teammates, and demos together.</p>
            <div className="cta">
              <button className="btn" onClick={() => goAuth(false)}>Start free</button>
              <button className="btn g" onClick={() => setJoinOpen(true)}>Join a meeting</button>
            </div>
          </div>
        </div>
      </section>

      <section id="faq">
        <div className="w">
          <h2>Questions, answered</h2>
          <p className="sub">Everything you need to know about Vuga.</p>
          <div className="faq">
            {FAQS.map((f, i) => (
              <div className={`q ${openFaq === i ? 'open' : ''}`} key={f.q}>
                <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                  <span>{f.q}</span>
                  <i className="fas fa-plus"></i>
                </button>
                <div className="a"><p>{f.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="w">
          <div className="fr">
            <div>
              <span className="brand">
                <i className="fas fa-video" style={{ color: 'var(--blue)' }}></i> Vuga
              </span>
              <p>Private, browser-based video meetings with instant recording. Woven conversations, everywhere.</p>
            </div>
            <div>
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how">How it works</a>
              <a href="#reviews">Reviews</a>
            </div>
            <div>
              <h4>Get started</h4>
              <a href="#" onClick={(e) => { e.preventDefault(); goAuth(false); }}>Create account</a>
              <a href="#" onClick={(e) => { e.preventDefault(); goAuth(true); }}>Log in</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setJoinOpen(true); }}>Join a room</a>
            </div>
            <div>
              <h4>Support</h4>
              <a href="#faq">FAQ</a>
              <a href="#faq">Help centre</a>
              <a href="#faq">Contact</a>
            </div>
          </div>
          <div className="bot">
            <span>© {new Date().getFullYear()} Vuga. All rights reserved.</span>
            <span>Built with WebRTC · Firefox, Chrome &amp; Safari</span>
          </div>
        </div>
      </footer>

      {joinOpen && (
        <div className="modal" onClick={() => setJoinOpen(false)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <h3>Join a meeting</h3>
            <p>Paste a meeting link or type the room code.</p>
            <input
              autoFocus
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && join()}
              placeholder="e.g. Meeting code"
            />
            <div className="acts">
              <button className="btn g sm" onClick={() => setJoinOpen(false)}>Cancel</button>
              <button className="btn sm" onClick={join}>Join</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
