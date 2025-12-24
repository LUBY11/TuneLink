import http from "http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT) || 50080;
const rooms = new Map();

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createRoom(hostSocket) {
  let code = randomCode();
  while (rooms.has(code)) code = randomCode();

  const room = {
    code,
    host: hostSocket,
    guests: new Set(),
    state: null,
  };
  rooms.set(code, room);
  return room;
}

function roomParticipants(room) {
  return 1 + room.guests.size;
}

function roomInfo(room) {
  const participants = [];
  if (room.host?.clientId) {
    participants.push({ client_id: room.host.clientId, roles: ["owner"] });
  }
  for (const guest of room.guests) {
    if (guest.clientId) {
      participants.push({ client_id: guest.clientId, roles: ["listener"] });
    }
  }
  return participants;
}

function send(socket, payload) {
  if (socket.readyState === socket.OPEN) {
    const message = typeof payload === "string" ? payload : JSON.stringify(payload);
    socket.send(message);
  }
}

function broadcast(room, payload, excludeSocket = null) {
  const message = typeof payload === "string" ? payload : JSON.stringify(payload);
  for (const guest of room.guests) {
    if (guest.readyState === guest.OPEN && guest !== excludeSocket) {
      guest.send(message);
    }
  }
}

function notifyRoomUpdated(room) {
  const participants = roomParticipants(room);
  const message = JSON.stringify({ type: "room-updated", participants });
  send(room.host, message);
  broadcast(room, message);
}

function notifyParticipant(room, type, socket) {
  const payload = {
    type,
    client_id: socket.clientId || null,
    roles: socket.role === "host" ? ["owner"] : ["listener"],
  };
  send(room.host, payload);
  broadcast(room, payload);
}

function sendHandshake(ws, room) {
  send(ws, {
    client_id: ws.clientId,
    room_id: room.code,
    roles: ws.role === "host" ? ["owner"] : ["listener"],
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/room-info") {
    const roomId = String(url.searchParams.get("roomId") || "").toUpperCase();
    const room = rooms.get(roomId);
    const payload = room ? roomInfo(room) : [];
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(payload));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

const wss = new WebSocketServer({ server });

wss.on("error", (error) => {
  console.error("WebSocket server error:", error);
});

wss.on("connection", (ws, req) => {
  ws.roomCode = null;
  ws.role = null;
  ws.clientId = randomId();
  console.log("WS connection", {
    url: req?.url,
    clientId: ws.clientId,
  });

  ws.on("error", (error) => {
    console.error("WebSocket client error:", error);
  });

  if (req?.url) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/create-room") {
      const room = createRoom(ws);
      ws.roomCode = room.code;
      ws.role = "host";
      sendHandshake(ws, room);
      send(ws, {
        type: "room-created",
        code: room.code,
        role: "host",
        participants: roomParticipants(room),
      });
      notifyParticipant(room, "joined", ws);
    } else if (url.pathname === "/join-room") {
      const code = String(url.searchParams.get("roomId") || "").toUpperCase();
      const room = rooms.get(code);
      if (room) {
        ws.roomCode = code;
        ws.role = "guest";
        room.guests.add(ws);
        sendHandshake(ws, room);
        send(ws, {
          type: "room-joined",
          code,
          role: "guest",
          participants: roomParticipants(room),
          state: room.state,
        });
        notifyParticipant(room, "joined", ws);
        notifyRoomUpdated(room);
      } else {
        send(ws, { type: "error", message: "Room not found" });
      }
    }
  }

  ws.on("message", (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      console.log("WS message parse failed");
      return;
    }
    console.log("WS message", {
      type: message?.type,
      role: ws.role,
      roomCode: ws.roomCode,
      code: message?.code,
    });

    if (message.type === "create") {
      if (ws.roomCode) {
        leaveRoom(ws);
      }
      const room = createRoom(ws);
      ws.roomCode = room.code;
      ws.role = "host";
      sendHandshake(ws, room);
      send(ws, {
        type: "room-created",
        code: room.code,
        role: "host",
        participants: roomParticipants(room),
      });
      notifyParticipant(room, "joined", ws);
      return;
    }

    if (message.type === "join") {
      if (ws.roomCode) {
        leaveRoom(ws);
      }
      const code = String(message.code || "").toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        send(ws, { type: "error", message: "Room not found" });
        return;
      }
      ws.roomCode = code;
      ws.role = "guest";
      room.guests.add(ws);
      sendHandshake(ws, room);
      send(ws, {
        type: "room-joined",
        code,
        role: "guest",
        participants: roomParticipants(room),
        state: room.state,
      });
      notifyParticipant(room, "joined", ws);
      notifyRoomUpdated(room);
      return;
    }

    if (message.type === "leave") {
      leaveRoom(ws);
      return;
    }

    if (message.type === "state") {
      if (ws.role !== "host" || !ws.roomCode) return;
      const room = rooms.get(ws.roomCode);
      if (!room) return;
      room.state = message.state;
      broadcast(room, { type: "state", state: message.state });
    }

    if (!message.type) {
      if (ws.role !== "host" || !ws.roomCode) return;
      const room = rooms.get(ws.roomCode);
      if (!room) return;
      const hasTrackShape =
        typeof message.title === "string" ||
        typeof message.video_id === "string" ||
        typeof message.seconds === "number" ||
        typeof message.status === "number";
      if (hasTrackShape) {
        broadcast(room, message);
      }
      return;
    }

    if (message.type === "chat") {
      const code = ws.roomCode || String(message.code || "").toUpperCase();
      if (!code) return;
      const room = rooms.get(code);
      if (!room) return;
      const text = String(message.text || "").trim();
      if (!text) return;
      const payload = {
        type: "chat",
        text: text.slice(0, 500),
        role: ws.role,
        senderId: message.senderId || null,
        id: message.id || null,
        sentAt: Date.now(),
      };
      console.log("WS chat dispatch", {
        code,
        hostOpen: room.host?.readyState === room.host?.OPEN,
        guestCount: room.guests.size,
      });
      send(room.host, payload);
      broadcast(room, payload);
    }
  });

  ws.on("close", () => {
    leaveRoom(ws, true);
  });
});

function leaveRoom(ws, isDisconnect = false) {
  if (!ws.roomCode) return;
  const room = rooms.get(ws.roomCode);
  if (!room) {
    ws.roomCode = null;
    ws.role = null;
    return;
  }

  if (ws.role === "host") {
    const payload = { type: "error", message: "Host left the room" };
    broadcast(room, payload);
    rooms.delete(ws.roomCode);
  } else {
    room.guests.delete(ws);
    notifyParticipant(room, "left", ws);
    notifyRoomUpdated(room);
  }

  ws.roomCode = null;
  ws.role = null;

  if (!isDisconnect) {
    send(ws, { type: "room-left" });
  }
}

server.listen(PORT, () => {
  console.log(`Server listening on ws://localhost:${PORT}`);
});
