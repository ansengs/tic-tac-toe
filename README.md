# Tic-Tac-Toe Live Website

This package keeps the original multiplayer app behavior as the source of truth and serves it as a full live website with Express + Socket.IO.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000` in two browser windows to test multiplayer.

## Deploy

This project is ready for platforms that run a Node web service, including Render/Railway/Fly/Heroku-style hosts.

- Build command: `npm install`
- Start command: `npm start`
- Health check: `/healthz`

The frontend is served from `public/`, and Socket.IO runs on the same origin, so no separate frontend/backend URL setup is needed.
