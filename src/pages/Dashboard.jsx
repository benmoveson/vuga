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
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { makeMeetingCode } from '../lib/meetingCode.js';
import Wordmark from '../components/Wordmark.jsx';

const SAMPLE_LINKS = [
  { id: 's1', name: 'Acme proposal call', code: 'abc-defg-hij' },
  { id: 's2', name: 'Product demo', code: 'kmn-pqrs-tuv' }
];

const SAMPLE_RECORDINGS = [
  { id: 'r1', name: 'Acme walkthrough', date: 'Oct 15 · 12:41' },
  { id: 'r2', name: 'Product demo', date: 'Oct 12 · 08:03' }
];

const PencilIcon = () => (
  <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" /></svg>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const showToast = useToast();

  const [links, setLinks] = useState(SAMPLE_LINKS);
  const [recordings, setRecordings] = useState(SAMPLE_RECORDINGS);
  const [tab, setTab] = useState('links');
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState('');

  useEffect(() => {
    if (!user) return;
    const mq = query(collection(db, 'users', user.uid, 'meetings'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      mq,
      (snap) => setLinks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('meetings listener:', err)
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const rq = query(collection(db, 'users', user.uid, 'recordings'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      rq,
      (snap) => setRecordings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('recordings listener:', err)
    );
  }, [user]);

  const name = (user?.displayName || user?.email?.split('@')[0] || 'there');
  const initial = name.charAt(0).toUpperCase();
  const isGuest = !user;

  async function createLink() {
    try {
      const code = makeMeetingCode();
      if (user) {
        await addDoc(collection(db, 'users', user.uid, 'meetings'), {
          name: 'New deal room',
          code,
          createdAt: serverTimestamp()
        });
      } else {
        setLinks((l) => [{ id: `local-${Date.now()}`, name: 'New deal room', code }, ...l]);
      }
      setTab('links');
      showToast('Entry link created');
    } catch (err) {
      console.error('create meeting failed:', err);
      showToast('Could not create link');
    }
  }

  async function copyLink(code) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
      showToast('Link copied');
    } catch {
      showToast(`vuga.app/m/${code}`);
    }
  }

  async function deleteLink(id) {
    if (user && !id.startsWith('s') && !id.startsWith('local')) {
      await deleteDoc(doc(db, 'users', user.uid, 'meetings', id));
    } else {
      setLinks((l) => l.filter((x) => x.id !== id));
    }
    showToast('Meeting removed');
  }

  function startRename(link) {
    setRenaming(link.id);
    setRenameVal(link.name);
  }

  async function commitRename(id) {
    const value = renameVal.trim();
    setRenaming(null);
    if (!value) return;
    if (user && !id.startsWith('s') && !id.startsWith('local')) {
      await updateDoc(doc(db, 'users', user.uid, 'meetings', id), { name: value });
    } else {
      setLinks((l) => l.map((x) => (x.id === id ? { ...x, name: value } : x)));
    }
    showToast('Renamed');
  }

  function formatDate(r) {
    if (r.date) return r.date;
    try {
      return r.createdAt?.toDate?.().toLocaleString() || 'just now';
    } catch {
      return 'just now';
    }
  }

  if (loading) return null;

  return (
    <div className="lm-app">
      <header className="lm-top">
        <a className="logo" href="#top" aria-label="Vuga" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <Wordmark />
        </a>
        <div className="lm-grow" />
        <div className="lm-right">
          <button className="btn sm" type="button" onClick={() => navigate('/record')}>🎥 Record</button>
          <div className="lm-avatar" title={name}>{initial}</div>
          <button className="lm-iconbtn" type="button" title="Log out" aria-label="Log out" onClick={() => logout().then(() => navigate('/'))}>
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
          </button>
        </div>
      </header>

      <div className="lm-body">
        <aside className="lm-side">
          <a className={tab === 'links' ? 'on' : ''} onClick={() => setTab('links')}><span className="lm-ic">🔗</span>Meeting links</a>
          <a className={tab === 'recs' ? 'on' : ''} onClick={() => setTab('recs')}><span className="lm-ic">🎬</span>Recordings</a>
        </aside>

        <main className="lm-main">
          <div className="lm-head">
            <h1>{tab === 'links' ? `Hi, ${name}` : 'Recordings'}</h1>
            <div className="lm-grow" />
            {tab === 'links' && (
              <button className="btn" type="button" onClick={createLink}>+ New link</button>
            )}
          </div>

          {isGuest && (
            <div className="gb">You’re exploring Vuga as a guest. The links and recordings below are sample data.</div>
          )}

          {tab === 'links' ? (
            links.length === 0 ? (
              <div className="lm-empty">No meeting links yet. Create your first one.</div>
            ) : (
              <div className="lm-grid">
                {links.map((link) => (
                  <div className="lm-card" key={link.id}>
                    <div className="lm-thumb">🔗</div>
                    <div className="lm-cbody">
                      {renaming === link.id ? (
                        <input
                          className="lm-input"
                          value={renameVal}
                          autoFocus
                          onChange={(e) => setRenameVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename(link.id);
                            else if (e.key === 'Escape') setRenaming(null);
                          }}
                          onBlur={() => commitRename(link.id)}
                        />
                      ) : (
                        <h4 title="Click to rename" style={{ cursor: 'text' }} onClick={() => startRename(link)}>{link.name}</h4>
                      )}
                      <p>vuga.app/m/{link.code}</p>
                    </div>
                    <div className="lm-cfoot">
                      <button className="btn g sm" type="button" onClick={() => copyLink(link.code)}>Copy</button>
                      <button className="btn sm" type="button" onClick={() => navigate(`/join/${link.code}`)}>Join</button>
                      <button className="lm-iconbtn" type="button" title="Rename" aria-label="Rename" onClick={() => startRename(link)}><PencilIcon /></button>
                      <button className="lm-iconbtn" type="button" title="Delete" aria-label="Delete" onClick={() => deleteLink(link.id)}><TrashIcon /></button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : recordings.length === 0 ? (
            <div className="lm-empty">No recordings yet. Record a meeting to see them here.</div>
          ) : (
            <div className="lm-grid">
              {recordings.map((r) => (
                <div className="lm-card" key={r.id}>
                  <div className="lm-thumb">🎬</div>
                  <div className="lm-cbody">
                    <h4>{r.name}</h4>
                    <p>{formatDate(r)} · saved to device</p>
                  </div>
                  <div className="lm-cfoot">
                    {r.url ? (
                      <a className="btn g sm" href={r.url} target="_blank" rel="noreferrer" download>Save</a>
                    ) : (
                      <span className="pill2">.webm</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
