# TuneLink

Sync YouTube Music playback with rooms + chat.

## Quick Start (Local)
1) Start server
```
cd server
npm install
npm start
```
Server runs on `ws://localhost:50080`.

2) Load extension (Chrome/Edge)
- `chrome://extensions` -> Developer mode -> Load unpacked
- Select `extension/`
- Open https://music.youtube.com and open the panel

3) (Optional) change server URL
- Panel -> Server -> `ws://localhost:50080` -> Save

## Docker (Server)
Build and run the WebSocket server:
```
docker build -t tunelink-server ./server
docker run --rm -p 50080:50080 -e PORT=50080 tunelink-server
```

Or with docker-compose:
```
docker compose up --build
```

## Domain / TLS (WSS)
For production, put the server behind a reverse proxy (Nginx/Caddy) and terminate TLS.
Then set the extension server URL to `wss://your-domain.com`.

## Extension Packaging
If you need a separate export folder, use `extension-export/extension/` for the latest code.
