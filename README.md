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
docker compose up -d
```

Docker Hub images + auto updates:
- Image: `lubyduby/tunelink-server:latest`
- `docker compose up -d` uses Watchtower for scheduled updates

## Domain / TLS (WSS)
For production, put the server behind a reverse proxy (Nginx/Caddy) and terminate TLS.
Then set the extension server URL to `wss://your-domain.com`.

## Extension Packaging
- Webstore ZIPs: https://github.com/LUBY11/TuneLink-downloads
- Latest local package: `dist/TuneLink-vX.Y.Z.zip`
