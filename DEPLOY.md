# Deployment guide (free)

## 1) Signaling server (WebSocket) — deploy to Render (free, easiest)

1. Push this repo to GitHub/GitLab.
2. Create account at https://render.com and connect repo.
3. New → Web Service → select repo → Use existing Dockerfile (auto-detected). Or create via render.yaml.
4. Env vars: CLIENT_ORIGIN=https://vuga.web.app (and PORT=3001 default). You may also allow your local preview: https://vuga.web.app,http://localhost:5173.
5. Deploy. Render gives a URL like https://vuga-signal.onrender.com.

Notes: Free tier sleeps on inactivity; first connection may be slow. If you want always-on, upgrade. Alternatively Railway/Fly.io.

## 2) Point frontend to signaling server and rebuild+deploy

Update VITE_SERVER_URL in .env (or set in build env):
VITE_SERVER_URL=https://vuga-signal.onrender.com

Then rebuild and deploy frontend:
npm run build
firebase deploy --only hosting --project vuga-464e5

## 3) Firebase rules (if API/Storage not configured)

I couldn't deploy Firestore/Storage rules automatically (APIs may not be enabled). Deploy manually:
- Firestore rules: https://console.firebase.google.com/project/vuga-464e5/firestore/rules → copy firestore.rules.
- Storage rules: https://console.firebase.google.com/project/vuga-464e5/storage/rules → copy storage.rules.

## 4) Test
Open https://vuga.web.app, create meeting, open in second tab/window. If peers don't connect, check VITE_SERVER_URL and signaling server logs.

# Other free options (quick)
- Railway: new service from repo, Dockerfile or node start. Set CLIENT_ORIGIN and PORT.
- Fly.io: fly launch with Dockerfile (free tier). Need flyctl account.
- Render via Blueprint: render.yaml included (create service from blueprint).
