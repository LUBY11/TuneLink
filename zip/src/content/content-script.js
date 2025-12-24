const extensionURL = chrome.runtime.getURL('');

async function initializePanel() {
    try {
        const { RoomService } = await import(`${extensionURL}src/services/room-service.js`);
        const { YouTubeMusicAPI } = await import(`${extensionURL}src/content/youtube-music-api.js`);
        const { Alert } = await import(`${extensionURL}src/content/views/alert.js`);
        const { MESSAGES } = await import(`${extensionURL}src/constants/messages.js`);
        const { renderSongInfo, renderEmptySongInfo } = await import(`${extensionURL}src/constants/templates.js`);

        class MusicTogetherPanel {
            constructor() {
                this.panel = null;
                this.currentView = null;
                this.roomService = RoomService.getInstance();
                this.alert = null;
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
                const songInfoElement = document.getElementById('current-song-info');
                if (songInfoElement) {
                    songInfoElement.innerHTML = renderSongInfo(trackInfo);
                }
            }

            createPanel() {
                this.panel = document.createElement('div');
                this.panel.id = 'music-together-panel';
                this.panel.innerHTML = `
                    <div class="mt-toggle"></div>
                    <div class="mt-header">
                        <h2>${MESSAGES.UI.APP_TITLE}</h2>
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

                // Alert bileşenini başlat
                this.alert = new Alert(this.panel.querySelector('#alert-container'));

                // Panel açma/kapama mantığı
                const toggleBtn = this.panel.querySelector('.mt-toggle');
                toggleBtn.addEventListener('click', () => {
                    this.panel.classList.toggle('open');
                    chrome.storage.local.set({ 'panelOpen': this.panel.classList.contains('open') });
                });

                // Panel durumunu kayıtlı değerden al
                chrome.storage.local.get('panelOpen', (result) => {
                    if (result.panelOpen) {
                        this.panel.classList.add('open');
                    }
                });

                const currentTrack = YouTubeMusicAPI.getCurrentTrack();
                if (currentTrack) {
                    this.updateCurrentSongInfo(currentTrack);
                }
            }

            initializeHomeView() {
                const createRoomBtn = document.getElementById('create-room-btn');
                const joinRoomBtn = document.getElementById('join-room-btn');
                const roomCodeInput = document.getElementById('room-code');

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
                const content = document.querySelector('.mt-content');
                content.innerHTML = `
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
                    <div class="mt-participants-section">
                        <h3>${MESSAGES.UI.PARTICIPANTS}</h3>
                        <div class="participants-list">
                            <div class="participant-count">${MESSAGES.INFO.LOADING}</div>
                        </div>
                    </div>
                    <div id="alert-container" class="mt-alert-container"></div>
                `;

                // Alert bileşenini yeniden başlat
                this.alert = new Alert(content.querySelector('#alert-container'));

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

                this.roomService.addParticipantUpdateListener((participants) => {
                    this.updateParticipantsList(participants);
                });

                if (initialRoomInfo && Array.isArray(initialRoomInfo)) {
                    this.updateParticipantsList(initialRoomInfo);
                } else {
                    try {
                        const roomInfo = await this.roomService.getRoomInfo(roomCode);
                        this.updateParticipantsList(roomInfo);
                    } catch (error) {
                        const participantsSection = document.querySelector('.participants-list');
                        if (participantsSection) {
                            participantsSection.innerHTML = `
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
                const participantsSection = document.querySelector('.participants-list');
                if (participantsSection && Array.isArray(participants)) {
                    const activeParticipants = participants.filter(p => p.type !== 'left');
                    const participantCount = activeParticipants.length;
                    const currentClientId = this.roomService.getCurrentClientId();

                    const countBadge = document.querySelector('.participant-count-badge');
                    if (countBadge) {
                        countBadge.textContent = MESSAGES.UI.PARTICIPANTS_COUNT.replace('{count}', participantCount);
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

                    participantsSection.innerHTML = `
                        <div class="participants-grid">
                            ${participantsHtml}
                        </div>
                    `;
                }
            }

            showHomeView() {
                const content = document.querySelector('.mt-content');
                content.innerHTML = `
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

                // Alert bileşenini yeniden başlat
                this.alert = new Alert(content.querySelector('#alert-container'));

                const currentTrack = YouTubeMusicAPI.getCurrentTrack();
                if (currentTrack) {
                    this.updateCurrentSongInfo(currentTrack);
                }

                this.initializeHomeView();
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
