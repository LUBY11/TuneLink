# TuneLink

Sync YouTube Music playback with rooms + chat.

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
