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

  const name = ((user?.displayName || user?.email || 'Guest')).split('@')[0].split(' ')[0];
  const initial = (name[0] || 'G').toUpperCase();
  const isGuest = !user;

  async function createLink() {
    const code = makeMeetingCode();
    if (user) {
      try {
        await addDoc(collection(db, 'users', user.uid, 'meetings'), {
          code,
          name: 'New deal room',
          link: `${window.location.origin}/join/${code}`,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error('create meeting failed:', err);
        showToast('Link ready, but it could not be saved');
        return;
      }
    } else {
      setLinks((l) => [{ id: `local-${Date.now()}`, name: 'New deal room', code }, ...l]);
    }
    showToast('Entry link created');
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
    <div id="app" className="on">
      <header className="ah">
        <a className="logo" href="#top" aria-label="Vuga" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <Wordmark />
        </a>
        <div className="ar2">
          <span>Hi, <b>{name}</b></span>
          <div className="ua">{initial}</div>
          <a className="btn g sm" href="#top" onClick={(e) => { e.preventDefault(); logout().then(() => navigate('/')); }}>Log out</a>
        </div>
      </header>

      <main className="am on" id="dash">
        <div className="dh">
          <div>
            <h2>Hello, <span>{name}</span> 👋</h2>
            <p>Here’s what’s happening in your deal rooms.</p>
          </div>
          <div>
            <button className="btn" id="nl" type="button" onClick={createLink}>+ Create entry link</button>
            <button className="btn g" id="rsb" type="button" onClick={() => navigate('/record')}>🎥 Record screen</button>
          </div>
        </div>

        {isGuest && (
          <div className="gb">You’re exploring Vuga as a guest. The links, recordings and numbers below are sample data.</div>
        )}

        <div className="kp">
          <div><b>{links.length}</b><span>Meetings this month</span></div>
          <div><b>2</b><span>Deals closed</span></div>
        </div>

        <div className="d2">
          <div className="cd">
            <h3>Your meeting links</h3>
            <div id="ll">
              {links.length === 0 ? (
                <div className="lr"><span>No meeting links yet. Create your first one.</span></div>
              ) : (
                links.map((link) => (
                  <div className="lr" key={link.id}>
                    <div>
                      {renaming === link.id ? (
                        <input
                          className="ri"
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
                        <b className="nm" title="Click to rename" onClick={() => startRename(link)}>{link.name}</b>
                      )}
                      <a className="jl" onClick={() => navigate(`/join/${link.code}`)}>vuga.app/m/{link.code}</a>
                    </div>
                    <div className="bs">
                      <button className="btn g sm" type="button" onClick={() => copyLink(link.code)}>Copy</button>
                      <button className="btn sm" type="button" onClick={() => navigate(`/join/${link.code}`)}>Join</button>
                      <button className="btn g sm ib" type="button" title="Rename" aria-label="Rename" onClick={() => startRename(link)}><PencilIcon /></button>
                      <button className="btn g sm ib" type="button" title="Delete" aria-label="Delete" onClick={() => deleteLink(link.id)}><TrashIcon /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="cd">
            <h3>Recordings</h3>
            <div id="rl">
              {recordings.length === 0 && (
                <div className="lr"><span>No recordings yet. Record a meeting to see them here.</span></div>
              )}
              {recordings.map((r) => (
                <div className="lr" key={r.id}>
                  <div>
                    <b>{r.name}</b>
                    <span>{formatDate(r)} · saved to device</span>
                  </div>
                  {r.url ? (
                    <a className="btn g sm" href={r.url} target="_blank" rel="noreferrer" download>Save</a>
                  ) : (
                    <span className="pill2">.webm</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
