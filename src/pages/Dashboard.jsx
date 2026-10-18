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
import { makeMeetingCode } from '../lib/meetingCode.js';

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
    const unsubM = onSnapshot(mq, (snap) => setMeetings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (err) => console.error('meetings listener:', err));

    const rq = query(collection(db, 'users', user.uid, 'recordings'), orderBy('createdAt', 'desc'));
    const unsubR = onSnapshot(rq, (snap) => setRecordings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (err) => console.error('recordings listener:', err));

    return () => {
      unsubM();
      unsubR();
    };
  }, [user]);

  async function createMeeting() {
    const code = makeMeetingCode();
    const link = `${window.location.origin}/join/${code}`;
    setCreated(link);
    showToast('Meeting link created');
    try {
      await addDoc(collection(db, 'users', user.uid, 'meetings'), {
        code,
        name: `Meeting ${meetings.length + 1}`,
        link,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to save meeting:', err);
      showToast('Link ready, but it could not be saved');
    }
  }

  async function copyLink(link) {
    try {
      await navigator.clipboard.writeText(link);
      showToast('Link copied');
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
    showToast('Recording removed');
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  if (loading || !user) return null;

  const initials = (user.displayName || user.email || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app">
      <header className="ah">
        <button className="logo" onClick={() => navigate('/')} style={{ background: 'none', border: 0, padding: 0 }}>
          <i className="fas fa-video" style={{ color: 'var(--blue)' }}></i> Vuga
        </button>
        <div className="grow" />
        <div className="ua">
          <div style={{ textAlign: 'right' }}>
            <small>Signed in as</small>
            <b>{user.displayName || user.email}</b>
          </div>
          <span className="av">{initials}</span>
          <button className="btn g sm" onClick={handleLogout}>
            <i className="fas fa-right-from-bracket"></i> Log out
          </button>
        </div>
      </header>

      <main className="am">
        <h1>Welcome back, {user.displayName || 'Host'}</h1>
        <p className="lead">Create a room, invite your people, and record the conversation.</p>

        <div className="gb">
          <button className="btn" onClick={createMeeting}>
            <i className="fas fa-plus"></i> Create meeting link
          </button>
          <button className="btn g" onClick={() => navigate('/record')}>
            <i className="fas fa-circle" style={{ color: '#ff4d3d', fontSize: 10 }}></i> New recording
          </button>
        </div>

        <div className="kp">
          <div className="c">
            <i className="fas fa-link"></i>
            <b>{meetings.length}</b>
            <span>Meeting links</span>
          </div>
          <div className="c">
            <i className="fas fa-film"></i>
            <b>{recordings.length}</b>
            <span>Recordings in library</span>
          </div>
          <div className="c">
            <i className="fas fa-users"></i>
            <b>8</b>
            <span>Peers per room</span>
          </div>
        </div>

        {created && (
          <div className="box" style={{ marginBottom: 26 }}>
            <h4>Your meeting link is ready</h4>
            <div className="gb" style={{ margin: '12px 0 0' }}>
              <span className="linkval">{created}</span>
              <button className="btn g sm" onClick={() => copyLink(created)}>
                <i className="fas fa-copy"></i> Copy
              </button>
              <button className="btn sm" onClick={() => navigate(`/join/${created.replace(/.*\//, '')}`)}>
                Enter room
              </button>
            </div>
          </div>
        )}

        <div className="tabs">
          <button className={`tab ${tab === 'meetings' ? 'on' : ''}`} onClick={() => setTab('meetings')}>
            Meetings ({meetings.length})
          </button>
          <button className={`tab ${tab === 'recordings' ? 'on' : ''}`} onClick={() => setTab('recordings')}>
            Recordings ({recordings.length})
          </button>
        </div>

        {tab === 'meetings' && (
          <div className="cd">
            {meetings.length === 0 && (
              <div className="empty">
                <i className="fas fa-link"></i>
                No meetings yet. Create your first link above.
              </div>
            )}
            {meetings.map((m) => (
              <div className="row" key={m.id}>
                <div className="meta">
                  <b>{m.name}</b>
                  <span>{m.link}</span>
                  <span>{m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : 'just now'}</span>
                </div>
                <div className="acts">
                  <button className="btn g sm" onClick={() => copyLink(m.link)}>Copy</button>
                  <button className="btn sm" onClick={() => navigate(`/join/${m.code}`)}>Join</button>
                  <button className="btn g sm" onClick={() => removeMeeting(m.id)} title="Delete">
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'recordings' && (
          <div className="cd">
            {recordings.length === 0 && (
              <div className="empty">
                <i className="fas fa-film"></i>
                No recordings yet. Record a meeting to see it here.
              </div>
            )}
            {recordings.map((r) => (
              <div className="row recording" key={r.id}>
                <div className="meta">
                  <b>{r.name}</b>
                  <span>
                    {r.duration}s · {(r.size / 1024 / 1024).toFixed(1)} MB ·{' '}
                    {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : 'just now'}
                  </span>
                  {r.url && <video src={r.url} controls preload="metadata" />}
                </div>
                <div className="acts">
                  {r.url && (
                    <a className="btn g sm" href={r.url} target="_blank" rel="noreferrer" download>
                      <i className="fas fa-download"></i>
                    </a>
                  )}
                  <button className="btn g sm" onClick={() => removeRecording(r.id)} title="Delete">
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
