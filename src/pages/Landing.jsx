import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Wordmark from '../components/Wordmark.jsx';
import hero from '../assets/hero.jpg';
import feat1 from '../assets/feat1.jpg';
import feat2 from '../assets/feat2.jpg';
import feat3 from '../assets/feat3.jpg';
import cta from '../assets/cta.jpg';

const T = [
  ['Amina K.', 'Freelance Designer', '#6b4bd8', 'I closed a client the same afternoon. Sharing my screen made the walkthrough easy.'],
  ['Daniel R.', 'Sales Lead', '#0ca678', 'Vuga let me walk my team through the new pitch while we were all in different cities.'],
  ['Sofia L.', 'Course Creator', '#d6336c', 'The recording feature saved my tutorial straight to my device. I posted it the same day.'],
  ['Marc T.', 'Consultant', '#e8590c', 'Clients just click the link and we are talking. No installs, no excuses.'],
  ['Grace N.', 'Agency Owner', '#1c7ed6', 'Sending the proposal during the call cut my follow-up emails in half.'],
  ['Ian P.', 'Startup Founder', '#f59f00', 'Simple, fast and it feels professional on the first call.']
];

const Q = [
  ['Is Vuga free to use?', 'Yes. You can sign up and start hosting meetings without a credit card. Your entry link works immediately after you create your account.'],
  ['How does screen recording work?', 'When you record your screen during a call, the video saves directly to your local storage. You can use the file however you want, no cloud uploads required.'],
  ['Do guests need an account?', 'No. Anyone who clicks your entry link finds you right away. They join the video call without downloads or signups.'],
  ['Can I share my screen?', 'Yes. Screen sharing is built into every Vuga call. Walk through a demo, explain your site, or present a deal in real time.'],
  ['Where do my recordings go?', 'Recordings save straight to your device’s local storage. You keep full control over your videos and can use them for tutorials, pitches, or content.']
];

export default function Landing() {
  const navigate = useNavigate();

  const [items, setItems] = useState([
    { label: 'Website redesign', price: 1200, checked: true },
    { label: 'Monthly support', price: 600, checked: true },
    { label: 'SEO setup', price: 450, checked: false }
  ]);
  const [tab, setTab] = useState('p1');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [shrOn, setShrOn] = useState(false);
  const [recOn, setRecOn] = useState(false);
  const [sec, setSec] = useState(0);

  const railRef = useRef(null);
  const [dot, setDot] = useState(0);

  useEffect(() => {
    if (!recOn) return;
    const id = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recOn]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onScroll = () => {
      const w = rail.firstChild.offsetWidth + 18;
      setDot(Math.round(rail.scrollLeft / w));
    };
    rail.addEventListener('scroll', onScroll);
    return () => rail.removeEventListener('scroll', onScroll);
  }, []);

  function toggleRecord() {
    setRecOn((v) => {
      if (!v) setSec(0);
      return !v;
    });
  }

  function sendProposal() {
    if (sending || sent) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 2200);
  }

  function scrollRail(dir) {
    const rail = railRef.current;
    if (!rail || !rail.firstChild) return;
    rail.scrollBy({ left: dir * (rail.firstChild.offsetWidth + 18), behavior: 'smooth' });
  }

  const stages = sent ? ['done', 'done', 'done', 'done'] : ['done', 'done', 'on', ''];
  const totalLabel = `$${items
    .filter((i) => i.checked)
    .reduce((s, i) => s + i.price, 0)
    .toLocaleString('en-US')}`;
  const fmtTime = (s) => `${('0' + Math.floor(s / 60)).slice(-2)}:${('0' + (s % 60)).slice(-2)}`;

  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <symbol id="cube" viewBox="0 0 24 24">
          <path d="M12 2l9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10" />
        </symbol>
      </svg>

      <nav>
        <div className="w">
          <a className="logo" href="#top" aria-label="Vuga home">
            <Wordmark />
          </a>
          <a className="l" href="#features">Features</a>
          <a className="l" href="#how">How it works</a>
          <a className="l" href="#faq">FAQs</a>
          <button className="btn g sm" onClick={() => navigate('/auth?tab=login')}>Log in</button>
          <button className="btn sm" onClick={() => navigate('/auth?tab=signup')}>Sign up</button>
        </div>
      </nav>

      <header className="hero" id="top">
        <div className="w">
          <div className="hg">
            <div>
              <h1>Close deals from anywhere with Vuga</h1>
              <p>
                Host online meetings with instant entry links, HD video calls, and screen sharing.
                Walk clients through your proposal and get it signed in the same room.
              </p>
              <div className="cta">
                <button className="btn" onClick={() => navigate('/auth?tab=signup')}>Sign Up</button>
                <a className="btn g" href="#features">Learn More</a>
              </div>
            </div>
            <img src={hero} alt="Client on a video call" />
          </div>

          <div className="demo" id="demo">
            <div className="dtop">
              <i></i>
              <i></i>
              <i></i>
              <span>
                <b className={`rec${recOn ? ' on' : ''}`} id="rec">
                  REC <span id="tm">{fmtTime(sec)}</span>
                </b>{' '}
                vuga.app/m/acme-deal
              </span>
            </div>
            <div className="dg">
              <div>
                <div className="stages" id="stages">
                  {['Intro', 'Demo', 'Proposal', 'Signed'].map((label, i) => (
                    <span key={label} className={`st ${stages[i]}`}>{label}</span>
                  ))}
                </div>
                <div className="vids">
                  <div className="t sp">
                    <div className="av" style={{ background: '#e8590c' }}>Y</div>
                    <small>You</small>
                  </div>
                  <div className={`t${sent ? ' sp' : ''}`}>
                    <div className="av" style={{ background: '#6b4bd8' }}>DM</div>
                    <small>Daniel M. · Acme Ltd</small>
                  </div>
                </div>
                <div className="ctl">
                  <button id="mic" className={micOn ? 'on' : ''} onClick={() => { setMicOn((v) => !v); }}>
                    {micOn ? '🔇 Unmute' : '🎤 Mute'}
                  </button>
                  <button id="shr" className={shrOn ? 'on' : ''} onClick={() => { setShrOn((v) => !v); }}>
                    {shrOn ? '🛑 Stop sharing' : '🖥️ Share screen'}
                  </button>
                  <button id="rc" className={recOn ? 'on' : ''} onClick={toggleRecord}>
                    {recOn ? '⏹️ Stop' : '⏺️ Record'}
                  </button>
                  <button className="btn x" id="lv" onClick={() => navigate('/')}>Leave</button>
                </div>
              </div>
              <div className="pan">
                <div className="tabs">
                  <button className={tab === 'p1' ? 'on' : ''} onClick={() => setTab('p1')}>Proposal</button>
                  <button className={tab === 'p2' ? 'on' : ''} onClick={() => setTab('p2')}>Notes</button>
                  <button className={tab === 'p3' ? 'on' : ''} onClick={() => setTab('p3')}>Next steps</button>
                </div>
                <div className={`tp${tab === 'p1' ? ' on' : ''}`} id="p1">
                  {items.map((it, i) => (
                    <label className="li" key={it.label}>
                      <input
                        type="checkbox"
                        checked={it.checked}
                        onChange={() => setItems((arr) => arr.map((x, k) => (k === i ? { ...x, checked: !x.checked } : x)))}
                      />
                      {' '}{it.label} <b>${it.price.toLocaleString('en-US')}</b>
                    </label>
                  ))}
                  <div className="tot"><span>Total</span><span id="tot">{totalLabel}</span></div>
                  <div style={{ marginTop: 'auto' }}>
                    {sent ? (
                      <div className="sg">✓ Signed by Daniel M. · {totalLabel}</div>
                    ) : (
                      <button className="btn" id="send" onClick={sendProposal} disabled={sending}>
                        {sending ? 'Waiting for Daniel to sign…' : 'Send for signature'}
                      </button>
                    )}
                  </div>
                </div>
                <div className={`tp${tab === 'p2' ? ' on' : ''}`} id="p2">
                  <div className="note">Daniel wants to launch before March.</div>
                  <div className="note">Budget approved by his director.</div>
                  <div className="note">Asked about payment in two parts.</div>
                </div>
                <div className={`tp${tab === 'p3' ? ' on' : ''}`} id="p3">
                  <label className="ck"><input type="checkbox" /> Send signed contract copy</label>
                  <label className="ck"><input type="checkbox" /> Book kickoff call</label>
                  <label className="ck"><input type="checkbox" /> Share onboarding form</label>
                </div>
              </div>
            </div>
          </div>
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, margin: '14px 0 0' }}>↑ Live demo: toggle items, hit record, send the proposal.</p>
        </div>
      </header>

      <section id="features">
        <div className="w">
          <span className="lab">Features</span>
          <h2>Built for winners</h2>
          <p className="sub">Everything you need to host and close online</p>
          <div className="fg">
            <div className="fc">
              <img src={feat1} alt="" />
              <div>
                <small>Instant Links</small>
                <h3>Create an entry link in seconds</h3>
                <p>Generate a unique link and share it. Anyone who clicks it finds you immediately, no downloads required.</p>
                <a className="more" href="#demo">Learn more ›</a>
              </div>
            </div>
            <div className="fc">
              <img src={feat2} alt="" style={{ objectPosition: 'center bottom' }} />
              <div>
                <small>Video Calls</small>
                <h3>HD video calls with screen sharing</h3>
                <p>Talk face to face in crisp HD and share your screen to walk through any deal or demo.</p>
                <a className="more" href="#demo">Learn more ›</a>
              </div>
            </div>
            <div className="fc">
              <img src={feat3} alt="" style={{ objectPosition: 'center bottom' }} />
              <div>
                <small>Recording</small>
                <h3>Record screens directly to your device</h3>
                <p>Explain how your site works and the recording saves straight to your local storage. Use it however you want.</p>
                <a className="more" href="#demo">Learn more ›</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" style={{ paddingTop: 20 }}>
        <div className="w">
          <span className="lab">How It Works</span>
          <h2>Start in four moves</h2>
          <p className="sub">From signup to closing deals in minutes</p>
          <div className="sg2">
            <div className="sc s1">
              <small>Step 1</small>
              <h3>Sign up for your Vuga account</h3>
              <p>Create your free account in under a minute. No credit card required to start hosting meetings.</p>
              <div className="bt">
                <button className="pill" onClick={() => navigate('/auth?tab=signup')}>Sign Up</button>
                <a className="more" href="#demo">Learn more ›</a>
              </div>
            </div>
            <div className="sc s2">
              <svg><use href="#cube" /></svg>
              <h3>Create your entry link</h3>
              <p>Generate a unique link for your meeting room.</p>
              <div className="bt"><a className="more" href="#demo">Learn more ›</a></div>
            </div>
            <div className="sc s3">
              <svg><use href="#cube" /></svg>
              <h3>Share the link</h3>
              <p>Send it to anyone you want to meet.</p>
              <div className="bt"><a className="more" href="#demo">Learn more ›</a></div>
            </div>
            <div className="sc s4">
              <svg><use href="#cube" /></svg>
              <h3>Start talking</h3>
              <p>They click the link and find you there. Begin your video call and share your screen to close the deal.</p>
              <div className="bt">
                <a className="pill" href="#demo">Try the demo</a>
                <a className="more" href="#faq">Learn more ›</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="stats">
        <div className="w">
          <h3>Vuga is where the best in the game close their deals</h3>
          <div className="sn">
            <div><b>50K+</b><span>Meetings hosted monthly</span></div>
            <div><b>2M+</b><span>Minutes recorded</span></div>
            <div><b>10K+</b><span>Active users</span></div>
          </div>
          <p className="note2">Sample figures — replace with your real numbers.</p>
        </div>
      </div>

      <section>
        <div className="w">
          <div className="car">
            <button className="ar" onClick={() => scrollRail(-1)} aria-label="Previous">←</button>
            <div className="rail" ref={railRef}>
              {T.map(([name, role, color, text]) => (
                <div className="tc" key={name}>
                  <div className="stars">★★★★★</div>
                  {text}
                  <div className="who">
                    <i style={{ background: color }}>{name.slice(0, 1)}</i>
                    <div><b>{name}</b><span>{role}</span></div>
                  </div>
                </div>
              ))}
            </div>
            <button className="ar" onClick={() => scrollRail(1)} aria-label="Next">→</button>
          </div>
          <div className="dots">
            {T.map(([name], i) => <i key={name} className={dot === i ? 'on' : ''} />)}
          </div>
        </div>
      </section>

      <div className="cta2">
        <div className="w">
          <h2>Start closing deals today</h2>
          <p>Sign up free and host your first meeting with an instant entry link in minutes.</p>
          <div className="cta" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => navigate('/auth?tab=signup')}>Sign Up</button>
            <a className="btn g" href="#features">Learn More</a>
          </div>
          <img src={cta} alt="" />
        </div>
      </div>

      <section id="faq">
        <div className="w faq">
          <div>
            <h2>FAQs</h2>
            <p>Everything you need to know about hosting meetings, recording screens, and closing deals with Vuga.</p>
            <a className="btn g sm" href="mailto:benmoveson@gmail.com">Contact</a>
          </div>
          <div id="qs">
            {Q.map(([q, a]) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="w">
          <div className="fr">
            <div>
              <a className="logo" href="#top" aria-label="Vuga home" style={{ marginBottom: 6 }}>
                <Wordmark style={{ height: 32 }} />
              </a>
              <p><b>Contact:</b><br /><a href="mailto:benmoveson@gmail.com">benmoveson@gmail.com</a></p>
            </div>
            <div className="fl">
              <a href="#top">Home</a>
              <a className="su" href="#" onClick={(e) => { e.preventDefault(); navigate('/auth?tab=login'); }}>Log In</a>
              <a href="#features">Features</a>
              <a href="#demo">Live demo</a>
              <a href="#how">How it works</a>
              <a className="su" href="#" onClick={(e) => { e.preventDefault(); navigate('/auth?tab=signup'); }}>Sign Up</a>
              <a href="#faq">FAQs</a>
              <a href="#top">Back to top</a>
            </div>
          </div>
          <div className="bot">
            <span>© 2026 Vuga. All rights reserved.</span>
            <span>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookie Settings</a>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}

function FaqItem({ q, a }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`q${collapsed ? ' c' : ''}`} onClick={() => setCollapsed((v) => !v)}>
      <b>{q}</b>
      <p>{a}</p>
    </div>
  );
}
