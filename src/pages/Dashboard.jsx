import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

function makeCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const showToast = useToast();

  const [meetings, setMeetings] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [created, setCreated] = useState(null);
  const [tab, setTab] = useState('meetings');

  useEffect(() => {
    if (!loading && !user) navigate('/auth?tab=login', { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const mq = query(collection(db, 'users', user.uid, 'meetings'), orderBy('createdAt', 'desc'));
    const unsubM = onSnapshot(mq, (snap) => {
      setMeetings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const rq = query(collection(db, 'users', user.uid, 'recordings'), orderBy('createdAt', 'desc'));
    const unsubR = onSnapshot(rq, (snap) => {
      setRecordings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubM();
      unsubR();
    };
  }, [user]);

  async function createMeeting() {
    const code = makeCode();
    await addDoc(collection(db, 'users', user.uid, 'meetings'), {
      code,
      name: `Meeting ${meetings.length + 1}`,
      link: `${window.location.origin}/join/${code}`,
      createdAt: serverTimestamp()
    });
    setCreated(`${window.location.origin}/join/${code}`);
    showToast('Meeting link created!');
  }

  async function copyLink(link) {
    try {
      await navigator.clipboard.writeText(link);
      showToast('Link copied to clipboard!');
    } catch {
      showToast(link);
    }
  }

  async function removeMeeting(id) {
    await deleteDoc(doc(db, 'users', user.uid, 'meetings', id));
    showToast('Meeting removed');
  }

  async function removeRecording(id) {
    await deleteDoc(doc(db, 'users', user.uid, 'recordings', id));
    showToast('Recording removed from library');
  }

  if (loading || !user) return null;

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <button className="logo" onClick={() => navigate('/')}>
            <i className="fas fa-video"></i> Vuga
          </button>
          <nav className="nav">
            <button className="btn btn-secondary btn-sm" onClick={() => { logout(); navigate('/'); }}>
              <i className="fas fa-right-from-bracket"></i> Log out
            </button>
          </nav>
        </div>
      </header>

      <section className="page">
        <div className="container">
          <div className="dash-header">
            <h1>Welcome back, <span>{user.displayName || 'Host'}</span></h1>
            <button className="btn btn-primary" onClick={createMeeting}>
              <i className="fas fa-plus"></i> Create Meeting Link
            </button>
          </div>

          {created && (
            <div className="link-box">
              <p>Your meeting entry link:</p>
              <div className="link-display">
                <span>{created}</span>
                <button className="btn btn-sm btn-secondary" onClick={() => copyLink(created)}>Copy</button>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/join/${created.replace(/.*\//, '')}`)}
              >
                Enter Meeting Room
              </button>
            </div>
          )}

          <div className="dash-tabs">
            <button className={`dash-tab ${tab === 'meetings' ? 'active' : ''}`} onClick={() => setTab('meetings')}>
              Meetings ({meetings.length})
            </button>
            <button className={`dash-tab ${tab === 'recordings' ? 'active' : ''}`} onClick={() => setTab('recordings')}>
              Recordings ({recordings.length})
            </button>
          </div>

          {tab === 'meetings' && (
            <div className="recent">
              <div className="meetings-list">
                {meetings.length === 0 && (
                  <p className="empty">No meetings yet. Create your first link above.</p>
                )}
                {meetings.map((m) => (
                  <div className="meeting-item" key={m.id}>
                    <div>
                      <strong>{m.name}</strong>
                      <div style={{ fontSize: '0.85rem', color: '#5A6478', marginTop: 4 }}>{m.link}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                        {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : 'just now'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => copyLink(m.link)}>Copy</button>
                      <button className="btn btn-sm btn-primary" onClick={() => navigate(`/join/${m.code}`)}>Join</button>
                      <button className="btn btn-sm btn-danger" onClick={() => removeMeeting(m.id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'recordings' && (
            <div className="recent">
              <div className="meetings-list">
                {recordings.length === 0 && (
                  <p className="empty">No recordings yet. Record a meeting to see it here.</p>
                )}
                {recordings.map((r) => (
                  <div className="meeting-item" key={r.id} style={{ alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{r.name}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: 4 }}>
                        {r.duration}s · {(r.size / 1024 / 1024).toFixed(1)} MB ·{' '}
                        {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : 'just now'}
                      </div>
                      {r.url && <video className="recording-video" src={r.url} controls preload="metadata" />}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {r.url && (
                        <a className="btn btn-sm btn-secondary" href={r.url} target="_blank" rel="noreferrer" download>
                          <i className="fas fa-download"></i>
                        </a>
                      )}
                      <button className="btn btn-sm btn-danger" onClick={() => removeRecording(r.id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
