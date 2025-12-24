Local testing (no container)

Server
- Requirements: Node.js 18+ recommended.
- Install: `cd server && npm install`
- Run: `npm start`
- Default WebSocket URL: `ws://localhost:50080` (override with `PORT=1234`)

Extension (manual load)
- Use the lightweight test extension in `extension-export/` (it speaks the same WS protocol as `server/index.js`).
- Chrome/Edge: Extensions -> Developer mode -> Load unpacked -> select `extension-export/`
- Open https://music.youtube.com and click "Music Together".
- If you changed the server port, update the server URL in the panel.

Notes
- The `extension/` code talks to a hosted service (`music.eraycan.com`) and is not wired to this local WS server.
