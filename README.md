# Tic-Tac-Toe Live Multiplayer Website

A full live multiplayer Tic-Tac-Toe website built with React, Vite, Express, and Socket.IO. The site preserves the original app flow: random match, join player by room ID, host public/private rooms, leave, and start a new game.

## Local development

```bash
npm install
npm run server
```

In a second terminal, run:

```bash
npm run dev
```

Vite proxies Socket.IO traffic to the local server, so the dev site at `http://localhost:5173` still uses live multiplayer.

For a production-style local test:

```bash
npm install
npm run build
npm start
```

Then open `http://localhost:3000` in two browser windows to test multiplayer.

## Deploy as a live website

This project is ready for a single full-stack host because the Express server serves the built React frontend and Socket.IO multiplayer from the same origin.

### Render

1. Upload this folder to GitHub.
2. In Render, create a new **Web Service** from the repo.
3. Render can use the included `render.yaml`, or use:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
4. Open the Render URL in two browsers and use Random Match or Host/Join.

### Railway / Fly.io / Heroku-style hosts

Use:

```bash
npm install && npm run build
npm start
```

The app listens on `process.env.PORT`, so it works on platforms that assign a dynamic port.

## Notes

- Do not deploy only the `dist` folder; multiplayer needs the Node/Socket.IO server.
- Static-only hosts such as basic GitHub Pages or Netlify static hosting will not support live multiplayer unless you also deploy the server separately.
