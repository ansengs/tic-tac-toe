# Tic-Tac-Toe — GitHub Pages Version

This package is built for GitHub Pages, which only serves static files.

## Deploy

1. Upload these files to your GitHub repository.
2. Go to **Settings → Pages**.
3. Set the source to your branch and root folder.
4. Open the generated GitHub Pages URL.

## Important

The original app used an Express/Socket.IO server for real online multiplayer rooms. GitHub Pages cannot run a Node server, so this version keeps the same visual flow and playable tic-tac-toe behavior in a static site.

For true online multiplayer, host the server version on Render/Railway/Fly.io/Vercel serverless-compatible backend and point the frontend to that backend.
