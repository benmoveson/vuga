# Vuga — Host Online Meetings Instantly

Real-time video meetings in the browser with WebRTC, screen sharing, chat, and recording.
Ported from the `vuga-ui-single.html` mock into React + a Node.js signaling server, with
Firebase (Auth, Firestore, Storage) for accounts, meeting metadata, chat, and recordings.
The landing page renders an interactive 3D hero with React Three Fiber.

## Stack

- **Frontend:** Vite + React 18 + React Router, React Three Fiber / drei (3D hero), PWA (vite-plugin-pwa)
- **Realtime video:** WebRTC mesh, signaled over **Node.js + Socket.io** (`server/index.js`)
- **Backend services:** Firebase Auth (email/password), Firestore (meetings, chat, recording metadata), Storage (recorded video)

## Project layout

```
src/
  firebase.js              Firebase init (env-driven, has fallback to vuga-464e5 project)
  context/                 Auth + Toast providers
  hooks/
    useWebRTC.js           Mesh peer connections + signaling
    useRecording.js        Canvas composite capture + Storage upload
  components/HeroScene.jsx React Three Fiber 3D scene
  pages/                   Landing, AuthPage, Dashboard, MeetingRoom
  styles/app.css           Ported Vuga styles
server/index.js            Express + Socket.io signaling server
firestore.rules            Firestore security rules
storage.rules              Storage security rules
```

## Setup

```bash
npm install
```

### 1. Firebase

1. In the Firebase console (project **vuga-464e5**), enable **Authentication → Email/Password**.
2. Create a **Firestore** database and a **Storage** bucket.
3. Deploy the included rules (needs `npm i -g firebase-tools`):

```bash
firebase deploy --only firestore:rules,storage:rules
```

4. Config is already wired to the `vuga-464e5` web app. To override, copy the values from
   your Firebase project into `.env`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_SERVER_URL=http://localhost:3001
```

> Note: Firebase Storage's Spark (free) plan may require enabling billing (Blaze) for new
> buckets. Usage still falls within the free quota. If you'd rather avoid Storage entirely,
> recordings can be switched to direct browser downloads.

### 2. Dev

```bash
npm run dev        # runs Vite (5173) + signaling server (3001) together
```

Open http://localhost:5173, sign up, create a meeting link, and open it in a second tab
(or another device on your network) to test a real peer-to-peer call.

### 3. Production build

```bash
npm run build      # outputs dist/
```

Host `dist/` (Firebase Hosting works — a `vuga` site is already linked) and run the
signaling server (`npm start`, PORT configurable) on any Node host (Render, Fly, Railway…).
Point `VITE_SERVER_URL` at that server before building.

## Testing a call

1. Host: sign up → **Create Meeting Link** → **Enter Meeting Room**.
2. Guest: open the link. Logged-out guests are asked for a display name.
3. Use the controls to mute, toggle camera, **share screen**, open **chat**, and **record**.
4. Stop & Save uploads the WebM (camera PiP composited over screen share) to Firebase Storage
   and lists it under **Dashboard → Recordings**.

## Notes

- Media requires a secure context: `localhost` is fine; use HTTPS in production.
- WebRTC uses public Google STUN. For restrictive networks, add a TURN server in
  `src/hooks/useWebRTC.js` (`ICE` array).
- The mesh topology suits small meetings; larger calls would want an SFU (e.g. mediasoup/LiveKit).
