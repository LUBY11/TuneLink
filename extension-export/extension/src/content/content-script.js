const extensionURL = chrome.runtime.getURL('');

async function initializePanel() {
    try {
        const { RoomService } = await import(`${extensionURL}src/services/room-service.js`);
        const { YouTubeMusicAPI } = await import(`${extensionURL}src/content/youtube-music-api.js`);
        const { Alert } = await import(`${extensionURL}src/content/views/alert.js`);
        const { MESSAGES, setLanguage, getLanguage } = await import(`${extensionURL}src/constants/messages.js`);
        const { renderSongInfo, renderEmptySongInfo } = await import(`${extensionURL}src/constants/templates.js`);

        const LANGUAGE_KEY = 'ymt-language';
        const CHAT_ID_KEY = 'ymt-chat-id';
        const storedLanguage = localStorage.getItem(LANGUAGE_KEY) || 'ko';
        let chatClientId = localStorage.getItem(CHAT_ID_KEY);
        if (!chatClientId) {
            chatClientId = Math.random().toString(36).slice(2, 10);
            localStorage.setItem(CHAT_ID_KEY, chatClientId);
        }
        setLanguage(storedLanguage);

        class MusicTogetherPanel {
            constructor() {
                this.panel = null;
                this.currentView = null;
                this.roomService = RoomService.getInstance();
                this.alert = null;
                this.currentRoomCode = null;
                this.isHost = false;
                this.participantUpdateHandler = null;
                this.chatMessageHandler = null;
                this.content = null;
                this.songInfoElement = null;
                this.participantsSection = null;
                this.countBadge = null;
                this.statusText = null;
                this.chatMessages = null;
                this.chatInput = null;
                this.chatSendButton = null;
                this.createPanel();
                this.initializeHomeView();
                this.initializeMusicObserver();
            }

            initializeMusicObserver() {
                YouTubeMusicAPI.initializeTrackObserver(
                    (trackInfo) => {
                        this.updateCurrentSongInfo(trackInfo);
                    },
                    this.roomService.wsService,
                    this.roomService.isHost
                );
            }

            updateCurrentSongInfo(trackInfo) {
                if (this.songInfoElement) {
                    this.songInfoElement.innerHTML = renderSongInfo(trackInfo);
                }
            }

            createPanel() {
                this.panel = document.createElement('div');
                this.panel.id = 'music-together-panel';
                this.panel.innerHTML = `
                    <div class="mt-toggle"></div>
                    <div class="mt-header">
                        <h2>${MESSAGES.UI.APP_TITLE}</h2>
                        <div class="mt-header-actions">
                            <select id="mt-language-select" title="${MESSAGES.UI.LANGUAGE}">
                                <option value="ko">한국어</option>
                                <option value="en">English</option>
                            </select>
                        </div>
                    </div>
                    <div class="mt-content">
                        <div class="mt-status">${MESSAGES.CONNECTION.OFFLINE}</div>
                        <div id="current-song-info" class="mt-song-info">
                            ${renderEmptySongInfo()}
                        </div>
                        <div class="mt-create-room">
                            <button id="create-room-btn">${MESSAGES.UI.CREATE_ROOM}</button>
                        </div>
                        <div class="mt-join-room">
                            <input type="text" id="room-code" style="width: 173px; !important;" placeholder="${MESSAGES.UI.ROOM_CODE}">
                            <button id="join-room-btn">${MESSAGES.UI.JOIN_ROOM}</button>
                        </div>
                        <div id="alert-container" class="mt-alert-container"></div>
                    </div>
                `;
                document.body.appendChild(this.panel);
                this.content = this.panel.querySelector('.mt-content');

                this.alert = new Alert(this.panel.querySelector('#alert-container'));

                const languageSelect = this.panel.querySelector('#mt-language-select');
                if (languageSelect) {
                    languageSelect.value = getLanguage();
                    languageSelect.addEventListener('change', () => {
                        const nextLanguage = languageSelect.value;
                        localStorage.setItem(LANGUAGE_KEY, nextLanguage);
                        setLanguage(nextLanguage);
                        this.refreshView();
                    });
                }

                const toggleBtn = this.panel.querySelector('.mt-toggle');
                toggleBtn.addEventListener('click', () => {
                    this.panel.classList.toggle('open');
                    chrome.storage.local.set({ 'panelOpen': this.panel.classList.contains('open') });
                });

                chrome.storage.local.get('panelOpen', (result) => {
                    if (result.panelOpen) {
                        this.panel.classList.add('open');
                    }
                });

                this.songInfoElement = this.panel.querySelector('#current-song-info');
                const currentTrack = YouTubeMusicAPI.getCurrentTrack();
                if (currentTrack) {
                    this.updateCurrentSongInfo(currentTrack);
                }
            }

            initializeHomeView() {
                const createRoomBtn = this.panel.querySelector('#create-room-btn');
                const joinRoomBtn = this.panel.querySelector('#join-room-btn');
                const roomCodeInput = this.panel.querySelector('#room-code');

                createRoomBtn.addEventListener('click', async () => {
                    try {
                        const response = await this.roomService.createRoom();
                        if (response.success) {
                            const roomInfo = await this.roomService.getRoomInfo(response.roomCode);
                            this.showRoomView(response.roomCode, true, roomInfo);
                        }
                    } catch (error) {
                        console.error('Oda oluşturulurken hata:', error);
                        this.alert.error(MESSAGES.ROOM.CREATE_ERROR);
                    }
                });

                joinRoomBtn.addEventListener('click', async () => {
                    const roomCode = roomCodeInput.value;
                    if (!roomCode.trim()) {
                        this.alert.error(MESSAGES.ROOM.EMPTY_CODE);
                        return;
                    }

                    try {
                        const response = await this.roomService.joinRoom(roomCode);
                        if (response.success) {
                            const roomInfo = await this.roomService.getRoomInfo(roomCode);
                            this.showRoomView(roomCode, false, roomInfo);
                        } else {
                            this.alert.error(MESSAGES.ROOM.NOT_FOUND);
                        }
                    } catch (error) {
                        console.error('Odaya katılırken hata:', error);
                        this.alert.error(MESSAGES.ROOM.NOT_FOUND);
                    }
                });

                roomCodeInput.addEventListener('input', () => {
                    this.alert.hide();
                });
            }

            async showRoomView(roomCode, isHost, initialRoomInfo = null) {
                this.currentRoomCode = roomCode;
                this.isHost = isHost;

                this.content.innerHTML = `
                    <div class="mt-status online">
                        <div class="mt-status-text">${MESSAGES.CONNECTION.ONLINE}</div>
                        <div class="participant-count-badge">1 ${MESSAGES.UI.PARTICIPANTS_COUNT.replace('{count}', '1')}</div>
                    </div>
                    <div id="current-song-info" class="mt-song-info">
                        ${renderEmptySongInfo()}
                    </div>
                    <div class="mt-room-info">
                        <p>${MESSAGES.UI.ROOM_CODE_LABEL} <span id="current-room-code">${roomCode}</span></p>
                        <button id="leave-room-btn">${MESSAGES.UI.LEAVE_ROOM}</button>
                    </div>
                    ${isHost ? `
                    <div class="mt-room-controls">
                        <div class="mt-room-controls-title">${MESSAGES.UI.ROOM_CONTROLS}</div>
                        <button id="sync-playback-btn" class="primary">${MESSAGES.UI.SYNC_PLAYBACK}</button>
                    </div>
                    ` : ''}
                    <div class="mt-chat-section">
                        <div class="mt-chat-title">${MESSAGES.UI.CHAT}</div>
                        <div class="mt-chat-messages" id="mt-chat-messages"></div>
                        <div class="mt-chat-input">
                            <input type="text" id="mt-chat-input" placeholder="${MESSAGES.UI.CHAT_PLACEHOLDER}">
                            <button id="mt-chat-send" class="primary">${MESSAGES.UI.SEND}</button>
                        </div>
                    </div>
                    <div class="mt-participants-section">
                        <h3>${MESSAGES.UI.PARTICIPANTS}</h3>
                        <div class="participants-list">
                            <div class="participant-count">${MESSAGES.INFO.LOADING}</div>
                        </div>
                    </div>
                    <div id="alert-container" class="mt-alert-container"></div>
                `;

                this.alert = new Alert(this.content.querySelector('#alert-container'));
                this.songInfoElement = this.content.querySelector('#current-song-info');
                this.participantsSection = this.content.querySelector('.participants-list');
                this.countBadge = this.content.querySelector('.participant-count-badge');
                this.statusText = this.content.querySelector('.mt-status-text');
                this.chatMessages = this.content.querySelector('#mt-chat-messages');
                this.chatInput = this.content.querySelector('#mt-chat-input');
                this.chatSendButton = this.content.querySelector('#mt-chat-send');

                const currentTrack = YouTubeMusicAPI.getCurrentTrack();
                if (currentTrack) {
                    this.updateCurrentSongInfo(currentTrack);
                }

                const leaveRoomBtn = document.getElementById('leave-room-btn');
                leaveRoomBtn.addEventListener('click', async () => {
                    try {
                        const response = await this.roomService.leaveRoom();
                        if (response.success) {
                            this.showHomeView();
                        } else {
                            this.alert.error(MESSAGES.ROOM.LEAVE_ERROR);
                        }
                    } catch (error) {
                        console.error('Odadan çıkarken hata:', error);
                        this.alert.error(MESSAGES.ROOM.LEAVE_ERROR);
                    }
                });

                if (this.participantUpdateHandler) {
                    this.roomService.removeParticipantUpdateListener(this.participantUpdateHandler);
                }
                this.participantUpdateHandler = (participants) => {
                    this.updateParticipantsList(participants);
                };
                this.roomService.addParticipantUpdateListener(this.participantUpdateHandler);

                const syncPlaybackBtn = document.getElementById('sync-playback-btn');
                if (syncPlaybackBtn) {
                    syncPlaybackBtn.addEventListener('click', () => {
                        try {
                            const trackInfo = YouTubeMusicAPI.getCurrentTrack();
                            if (!trackInfo) {
                                this.alert.warning(MESSAGES.MUSIC.NO_TRACK);
                                return;
                            }
                            this.roomService.wsService.sendMessage(trackInfo);
                            this.alert.success(MESSAGES.MUSIC.SYNC_SUCCESS);
                        } catch (error) {
                            console.error('Senkronizasyon hatasi:', error);
                            this.alert.error(MESSAGES.MUSIC.SYNC_ERROR);
                        }
                    });
                }

                const sendChat = () => {
                    if (!this.chatInput) return;
                    const text = this.chatInput.value.trim();
                    if (!text) return;
                    try {
                        this.roomService.wsService.sendMessage({
                            type: 'chat',
                            text,
                            senderId: chatClientId
                        });
                        this.chatInput.value = '';
                    } catch (error) {
                        console.error('Chat gonderme hatasi:', error);
                        this.alert.error(MESSAGES.CONNECTION.ERROR);
                    }
                };

                if (this.chatSendButton) {
                    this.chatSendButton.addEventListener('click', sendChat);
                }

                if (this.chatInput) {
                    this.chatInput.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            sendChat();
                        }
                    });
                }

                if (this.chatMessageHandler) {
                    this.roomService.wsService.removeEventListener('chat', this.chatMessageHandler);
                }
                this.chatMessageHandler = (data) => {
                    this.appendChatMessage(data);
                };
                this.roomService.wsService.addEventListener('chat', this.chatMessageHandler);

                if (initialRoomInfo && Array.isArray(initialRoomInfo)) {
                    this.updateParticipantsList(initialRoomInfo);
                } else {
                    try {
                        const roomInfo = await this.roomService.getRoomInfo(roomCode);
                        this.updateParticipantsList(roomInfo);
                    } catch (error) {
                        if (this.participantsSection) {
                            this.participantsSection.innerHTML = `
                                <div class="error-message">
                                    ${MESSAGES.ROOM.PARTICIPANTS_ERROR}
                                </div>
                            `;
                        }
                        this.alert.error(MESSAGES.ROOM.PARTICIPANTS_ERROR);
                    }
                }
            }

            updateParticipantsList(participants) {
                if (this.participantsSection && Array.isArray(participants)) {
                    const activeParticipants = participants.filter(p => p.type !== 'left');
                    const participantCount = activeParticipants.length;
                    const currentClientId = this.roomService.getCurrentClientId();

                    if (this.countBadge) {
                        this.countBadge.textContent = MESSAGES.UI.PARTICIPANTS_COUNT.replace('{count}', participantCount);
                    }

                    const participantsHtml = activeParticipants.map(participant => {
                        const isHost = participant.roles.includes('owner');
                        const isListener = participant.roles.includes('listener');
                        const isCurrentUser = participant.client_id === currentClientId;
                        const roleText = isHost ? MESSAGES.UI.HOST : (isListener ? MESSAGES.UI.LISTENER : MESSAGES.UI.PARTICIPANT);
                        const avatarText = isHost ? 'H' : (isCurrentUser ? 'S' : 'D');

                        return `
                            <div class="participant ${isCurrentUser ? 'current-user' : ''} ${isHost ? 'host' : ''}">
                                <div class="participant-avatar">
                                    ${avatarText}
                                </div>
                                <span class="participant-role">
                                    ${roleText}${isCurrentUser ? ' ' + MESSAGES.UI.YOU : ''}
                                </span>
                            </div>
                        `;
                    }).join('');

                    this.participantsSection.innerHTML = `
                        <div class="participants-grid">
                            ${participantsHtml}
                        </div>
                    `;
                }
            }

            appendChatMessage(message) {
                if (!this.chatMessages || !message || !message.text) return;
                const isSelf = message.senderId && message.senderId === chatClientId;
                const roleLabel = message.role === 'host' ? MESSAGES.UI.HOST : MESSAGES.UI.PARTICIPANT;
                const wrapper = document.createElement('div');
                wrapper.className = `mt-chat-message ${isSelf ? 'self' : ''}`;
                wrapper.innerHTML = `
                    <div class="mt-chat-meta">${isSelf ? MESSAGES.UI.YOU : roleLabel}</div>
                    <div class="mt-chat-bubble">${message.text}</div>
                `;
                this.chatMessages.appendChild(wrapper);
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            }

            showHomeView() {
                this.currentRoomCode = null;
                this.isHost = false;
                this.content.innerHTML = `
                    <div class="mt-status">
                        <div class="mt-status-text">${MESSAGES.CONNECTION.OFFLINE}</div>
                        <div class="participant-count-badge">${MESSAGES.UI.PARTICIPANTS_COUNT.replace('{count}', '0')}</div>
                    </div>
                    <div id="current-song-info" class="mt-song-info">
                        ${renderEmptySongInfo()}
                    </div>
                    <div class="mt-create-room">
                        <button id="create-room-btn">${MESSAGES.UI.CREATE_ROOM}</button>
                    </div>
                    <div class="mt-join-room">
                        <input type="text" id="room-code" style="width: 173px; !important;" placeholder="${MESSAGES.UI.ROOM_CODE}">
                        <button id="join-room-btn">${MESSAGES.UI.JOIN_ROOM}</button>
                    </div>
                    <div id="alert-container" class="mt-alert-container"></div>
                `;

                this.alert = new Alert(this.content.querySelector('#alert-container'));
                this.songInfoElement = this.content.querySelector('#current-song-info');
                this.participantsSection = null;
                this.countBadge = this.content.querySelector('.participant-count-badge');
                this.statusText = this.content.querySelector('.mt-status-text');
                this.chatMessages = null;
                this.chatInput = null;
                this.chatSendButton = null;

                if (this.chatMessageHandler) {
                    this.roomService.wsService.removeEventListener('chat', this.chatMessageHandler);
                    this.chatMessageHandler = null;
                }

                const currentTrack = YouTubeMusicAPI.getCurrentTrack();
                if (currentTrack) {
                    this.updateCurrentSongInfo(currentTrack);
                }

                this.initializeHomeView();
            }

            refreshView() {
                const headerTitle = this.panel.querySelector('.mt-header h2');
                if (headerTitle) {
                    headerTitle.textContent = MESSAGES.UI.APP_TITLE;
                }
                const languageSelect = this.panel.querySelector('#mt-language-select');
                if (languageSelect) {
                    languageSelect.title = MESSAGES.UI.LANGUAGE;
                }
                const currentTrack = YouTubeMusicAPI.getCurrentTrack();
                if (this.currentRoomCode) {
                    this.showRoomView(this.currentRoomCode, this.isHost);
                } else {
                    this.showHomeView();
                }
                if (currentTrack) {
                    this.updateCurrentSongInfo(currentTrack);
                }
            }
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL('src/styles/panel.css');
        document.head.appendChild(link);

        new MusicTogetherPanel();
    } catch (error) {
    }
}

initializePanel().catch(error => {
    console.error('Panel başlatılırken hata:', error);
});
