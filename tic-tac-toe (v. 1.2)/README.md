# Tic-Tac-Toe Online Multiplayer

Real-time two-player tic-tac-toe built on **Express 5** and **Socket.IO 4**.

## Installation

### 1. Install Node.js

You need Node.js **18 or newer** (LTS recommended). npm ships with Node, so installing Node installs both.

- **Windows / macOS:** download the LTS installer from <https://nodejs.org/> and run it.
- **macOS (Homebrew):** `brew install node`
- **Ubuntu / Debian:** `sudo apt install nodejs npm` (or use [nvm](https://github.com/nvm-sh/nvm) for a newer version)
- **Fedora / RHEL:** `sudo dnf install nodejs`
- **Arch:** `sudo pacman -S nodejs npm`

Verify both are installed and recent enough:

```bash
node -v   # should print v18.x.x or higher
npm -v    # should print 9.x.x or higher
```

### 2. Get the project

Either clone the repo or unzip the release archive, then `cd` into the project root (the directory that contains `package.json`):

```bash
cd tic-tac-toe
```

### 3. Install dependencies

From the project root:

```bash
npm install
```

This reads `package.json`, downloads every package listed under `dependencies` and `devDependencies`, and writes a `node_modules/` folder plus a `package-lock.json`. Expect ~110 packages and a few seconds of download.

If `npm install` reports vulnerabilities on a fresh install, run:

```bash
npm audit fix
```

### 4. Run the server

Production mode:

```bash
npm start
```

Development mode (auto-restart on file changes via nodemon):

```bash
npm run dev
```

You should see:

```
Tic-Tac-Toe server listening on http://localhost:3000
```

Open **<http://localhost:3000>** in your browser. Open a second tab, another browser, or another device on the same LAN to play a second player.

### Changing the port

The server reads `PORT` from the environment. The default is `3000`.

```bash
PORT=8080 npm start
```

On Windows PowerShell:

```powershell
$env:PORT=8080; npm start
```

## Modules & Dependencies

All third-party packages are declared in `package.json`. Running `npm install` pulls them into `node_modules/`.

### Runtime dependencies

| Package | Version | Purpose |
|---|---|---|
| [`express`](https://expressjs.com/) | `^5.2.1` | HTTP server framework. Serves `index.html`, the static assets under `public/`, and the `/healthz` endpoint. |
| [`socket.io`](https://socket.io/) | `^4.8.3` | Real-time bidirectional messaging between the server and connected browsers. Backs every game-state event: `host`, `join-room`, `data-update`, `player-joined`, `disconnected`, etc. The matching client library is auto-served by the server at `/socket.io/socket.io.js`, so there is no separate `socket.io-client` entry. |

### Dev dependencies

| Package | Version | Purpose |
|---|---|---|
| [`nodemon`](https://nodemon.io/) | `^3.1.14` | Watches the project for file changes and restarts `server.js` automatically. Used only by `npm run dev`. |

### Built-in Node modules used (no install needed)

| Module | Used in | Why |
|---|---|---|
| `node:http` | `server.js` | Wraps the Express app so Socket.IO can attach to the same HTTP server. |
| `node:path` | `server.js` | Cross-platform path joining (`join(__dirname, 'public')`). |

### Browser-side libraries (loaded via CDN, not `npm`)

| Library | Version | Purpose |
|---|---|---|
| [jQuery](https://jquery.com/) | 3.7.1 | DOM manipulation and event handling in `public/js/tic_tac_toe.js`. Loaded from `code.jquery.com` with an SRI integrity hash. |
| Socket.IO client | matches server | Served by the Node server itself at `/socket.io/socket.io.js`, so it's always version-locked to the `socket.io` package you installed. |

## Project structure

```
.
├── package.json
├── server.js              # Express + Socket.IO server
└── public/                # Everything below is served statically
    ├── index.html
    ├── css/tic_tac_toe.css
    ├── js/tic_tac_toe.js  # Client-side game logic
    └── img/               # Board and piece SVGs
```

## How to play

- **Random Match** — queues you into any public room that has one player waiting, or hosts a new public room if none are open.
- **Host** — creates a new room with a 5-character id. Choose *Public* (matchable) or *Private* (joinable only by id).
- **Join Player** — enter a room id to join a specific host.

The room id appears in the top-right once you're in a room; share it to invite someone.

## Notes on this update

- Upgraded Express 4 → 5 and nodemon 2 → 3; refreshed `socket.io` to the current 4.x.
- Removed unused `dotenv` and `ejs` dependencies.
- Default port changed from 80 (which requires root on Linux/macOS) to 3000.
- Client now connects via same-origin (`io()`), so the app works unchanged whether you
  run it locally or deploy it.
- Fixed the server-side room-enumeration bug (`for..in` over an array + stale
  `adapter.rooms[room].length`) that silently broke the Random Match search.
- Added graceful `SIGINT`/`SIGTERM` shutdown and a `/healthz` endpoint.
