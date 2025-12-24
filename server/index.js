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

const wss = new WebSocketServer({ port: PORT });

wss.on("error", (error) => {
  console.error("WebSocket server error:", error);
});

wss.on("connection", (ws) => {
  ws.roomCode = null;
  ws.role = null;
  ws.clientId = randomId();
  console.log("WS connection", {
    clientId: ws.clientId,
  });

  ws.on("error", (error) => {
    console.error("WebSocket client error:", error);
  });

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
      send(ws, {
        type: "room-created",
        code: room.code,
        role: "host",
        participants: roomParticipants(room),
      });
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
      send(ws, {
        type: "room-joined",
        code,
        role: "guest",
        participants: roomParticipants(room),
        state: room.state,
      });
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
        console.log("WS track dispatch", {
          code: ws.roomCode,
          guestCount: room.guests.size,
        });
        broadcast(room, message);
      }
      return;
    }

    if (message.type === "chat") {
      if (!ws.roomCode) return;
      const room = rooms.get(ws.roomCode);
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
    notifyRoomUpdated(room);
  }

  ws.roomCode = null;
  ws.role = null;

  if (!isDisconnect) {
    send(ws, { type: "room-left" });
  }
}

console.log(`WebSocket server listening on ws://localhost:${PORT}`);
