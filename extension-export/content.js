(() => {
  const PANEL_ID = "ymt-panel";
  const TOGGLE_ID = "ymt-toggle";
  const DEFAULT_SERVER = "ws://localhost:50080";

  if (document.getElementById(PANEL_ID)) return;

  const state = {
    socket: null,
    connected: false,
    role: null,
    roomCode: null,
    participants: 1,
    isApplyingRemote: false,
    lastSentAt: 0,
    lastTrackUrl: null,
    serverUrl: localStorage.getItem("ymt-server-url") || DEFAULT_SERVER,
    pendingMessages: [],
  };

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div id="ymt-header">
      <div id="ymt-title">Music Together</div>
      <div id="ymt-status"><span class="ymt-dot" id="ymt-dot"></span><span id="ymt-status-text">Offline</span></div>
    </div>
    <div id="ymt-body">
      <div class="ymt-section">
        <div class="ymt-label">Server</div>
        <div class="ymt-row">
          <input id="ymt-server" type="text" placeholder="ws://localhost:50080" />
          <button id="ymt-connect">Connect</button>
        </div>
      </div>
      <div class="ymt-section">
        <div class="ymt-label">Room</div>
        <div class="ymt-row">
          <button id="ymt-create" class="primary">Create</button>
          <input id="ymt-join-code" type="text" placeholder="CODE" />
          <button id="ymt-join">Join</button>
        </div>
        <div id="ymt-room-code">----</div>
        <div id="ymt-now">Not playing</div>
        <div id="ymt-participants">Participants: 1</div>
        <button id="ymt-leave" class="danger" style="display:none;">Leave Room</button>
      </div>
    </div>
    <div id="ymt-footer">Host controls playback. Guests follow.</div>
  `;

  const toggle = document.createElement("button");
  toggle.id = TOGGLE_ID;
  toggle.textContent = "Music Together";

  document.body.appendChild(panel);
  document.body.appendChild(toggle);

  const els = {
    dot: panel.querySelector("#ymt-dot"),
    statusText: panel.querySelector("#ymt-status-text"),
    server: panel.querySelector("#ymt-server"),
    connect: panel.querySelector("#ymt-connect"),
    create: panel.querySelector("#ymt-create"),
    joinCode: panel.querySelector("#ymt-join-code"),
    join: panel.querySelector("#ymt-join"),
    roomCode: panel.querySelector("#ymt-room-code"),
    now: panel.querySelector("#ymt-now"),
    participants: panel.querySelector("#ymt-participants"),
    leave: panel.querySelector("#ymt-leave"),
  };

  els.server.value = state.serverUrl;

  toggle.addEventListener("click", () => {
    const isHidden = panel.style.display === "none";
    panel.style.display = isHidden ? "block" : "none";
  });

  function setStatus(online, text) {
    els.dot.classList.toggle("online", online);
    els.statusText.textContent = text;
  }

  function setRoomInfo(code, participants) {
    els.roomCode.textContent = code || "----";
    els.participants.textContent = `Participants: ${participants || 1}`;
    els.leave.style.display = code ? "block" : "none";
  }

  function updateNowPlaying(text) {
    els.now.textContent = text || "Not playing";
  }

  function ensureSocket() {
    if (state.socket && (state.socket.readyState === WebSocket.OPEN || state.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const url = els.server.value.trim() || DEFAULT_SERVER;
    state.serverUrl = url;
    localStorage.setItem("ymt-server-url", url);

    const socket = new WebSocket(url);
    state.socket = socket;

    socket.addEventListener("open", () => {
      state.connected = true;
      setStatus(true, "Online");
      if (state.pendingMessages.length) {
        state.pendingMessages.forEach((message) => send(message));
        state.pendingMessages = [];
      }
    });

    socket.addEventListener("close", () => {
      state.connected = false;
      state.role = null;
      state.roomCode = null;
      setStatus(false, "Offline");
      setRoomInfo(null, 1);
    });

    socket.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      handleMessage(message);
    });

    socket.addEventListener("error", () => {
      setStatus(false, "Error");
    });
  }

  function send(message) {
    if (!state.socket) return;
    if (state.socket.readyState !== WebSocket.OPEN) {
      state.pendingMessages.push(message);
      return;
    }
    state.socket.send(JSON.stringify(message));
  }

  function handleMessage(message) {
    if (message.type === "room-created" || message.type === "room-joined") {
      state.role = message.role;
      state.roomCode = message.code;
      setRoomInfo(message.code, message.participants || 1);
      if (message.state) {
        applyRemoteState(message.state);
      }
      return;
    }

    if (message.type === "room-updated") {
      state.participants = message.participants;
      setRoomInfo(state.roomCode, message.participants);
      return;
    }

    if (message.type === "state" && state.role === "guest") {
      applyRemoteState(message.state);
      return;
    }

    if (message.type === "error") {
      setStatus(false, message.message || "Error");
    }
  }

  els.connect.addEventListener("click", () => {
    ensureSocket();
  });

  els.create.addEventListener("click", () => {
    ensureSocket();
    send({ type: "create" });
  });

  els.join.addEventListener("click", () => {
    const code = els.joinCode.value.trim().toUpperCase();
    if (!code) return;
    ensureSocket();
    send({ type: "join", code });
  });

  els.leave.addEventListener("click", () => {
    send({ type: "leave" });
    state.role = null;
    state.roomCode = null;
    setRoomInfo(null, 1);
  });

  function getPlayer() {
    return document.querySelector("video");
  }

  function getTrackText() {
    const title = document.querySelector("ytmusic-player-bar .title")?.textContent?.trim();
    const artist = document.querySelector("ytmusic-player-bar .subtitle")?.textContent?.trim();
    if (title && artist) return `${title} · ${artist}`;
    return title || "Unknown";
  }

  function buildState(player) {
    return {
      url: location.href,
      time: player?.currentTime || 0,
      paused: player?.paused ?? true,
      title: getTrackText(),
      timestamp: Date.now(),
    };
  }

  function applyRemoteState(remote) {
    const player = getPlayer();
    if (!player) return;

    state.isApplyingRemote = true;

    if (remote.url && remote.url !== location.href) {
      location.href = remote.url;
      updateNowPlaying(remote.title);
      setTimeout(() => {
        state.isApplyingRemote = false;
      }, 1500);
      return;
    }

    const drift = Math.abs(player.currentTime - remote.time);
    if (drift > 1.5) {
      player.currentTime = remote.time;
    }

    if (remote.paused) {
      player.pause();
    } else {
      player.play().catch(() => {});
    }

    updateNowPlaying(remote.title);

    setTimeout(() => {
      state.isApplyingRemote = false;
    }, 500);
  }

  function maybeSendState(reason) {
    if (state.role !== "host" || state.isApplyingRemote) return;
    const now = Date.now();
    const minInterval = reason === "timeupdate" ? 2000 : 400;
    if (now - state.lastSentAt < minInterval) return;

    const player = getPlayer();
    if (!player) return;

    const statePayload = buildState(player);
    state.lastSentAt = now;
    updateNowPlaying(statePayload.title);
    send({ type: "state", state: statePayload });
  }

  function attachPlayerListeners() {
    const player = getPlayer();
    if (!player) return;

    player.addEventListener("play", () => maybeSendState("play"));
    player.addEventListener("pause", () => maybeSendState("pause"));
    player.addEventListener("seeked", () => maybeSendState("seeked"));
    player.addEventListener("timeupdate", () => maybeSendState("timeupdate"));

    const titleNode = document.querySelector("ytmusic-player-bar .title");
    if (titleNode) {
      const observer = new MutationObserver(() => {
        if (state.role === "host") {
          maybeSendState("track");
        }
      });
      observer.observe(titleNode, { childList: true, subtree: true });
    }
  }

  let playerCheckCount = 0;
  const playerCheck = setInterval(() => {
    const player = getPlayer();
    playerCheckCount += 1;
    if (player) {
      attachPlayerListeners();
      clearInterval(playerCheck);
    } else if (playerCheckCount > 60) {
      clearInterval(playerCheck);
    }
  }, 1000);
})();
