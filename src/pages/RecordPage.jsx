import { useNavigate } from 'react-router-dom';
import ScreenRecorder from '../components/ScreenRecorder.jsx';

export default function RecordPage() {
  const navigate = useNavigate();

  return (
    <section className="record-page">
      <div className="record-card">
        <h1>New recording</h1>
        <p>
          Capture your screen with a camera bubble in the corner, exactly like Loom.
          Your video is saved straight to your device.
        </p>
        <ScreenRecorder big />
        <div style={{ marginTop: 20 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>
    </section>
  );
}
