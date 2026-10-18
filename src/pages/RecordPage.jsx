import { useNavigate } from 'react-router-dom';
import ScreenRecorder from '../components/ScreenRecorder.jsx';

export default function RecordPage() {
  const navigate = useNavigate();
  return (
    <div className="record">
      <div className="card">
        <span className="logo" style={{ color: '#fff', marginRight: 0 }}>
          <i className="fas fa-video" style={{ color: 'var(--blue)' }}></i> Vuga
        </span>
        <h1>New recording</h1>
        <p>
          Capture your screen with a camera bubble in the corner. Your video is saved straight to
          your device — and to your library when you&apos;re signed in.
        </p>
        <ScreenRecorder big />
        <div style={{ marginTop: 22 }}>
          <button className="btn g sm" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left"></i> Back
          </button>
        </div>
      </div>
    </div>
  );
}
