import { MESSAGES } from '../../constants/messages.js';
import { Alert } from './alert.js';
import { renderEmptySongInfo } from '../../constants/templates.js';

export class RoomView {
    constructor(roomCode, isHost, onLeaveRoom, roomService = null) {
        this.roomCode = roomCode;
        this.isHost = isHost;
        this.onLeaveRoom = onLeaveRoom;
        this.roomService = roomService;
        this.alert = null;
    }

    render() {
        const view = document.createElement('div');
        view.className = 'mt-room-view';
        view.innerHTML = `
            <div class="mt-status online">
                <div class="mt-status-text">${MESSAGES.CONNECTION.ONLINE}</div>
                <div class="participant-count-badge">1 ${MESSAGES.UI.PARTICIPANTS_COUNT.replace('{count}', '1')}</div>
            </div>
            <div id="current-song-info" class="mt-song-info">
                ${renderEmptySongInfo()}
            </div>
            <div class="mt-room-info">
                <p>${MESSAGES.UI.ROOM_CODE_LABEL} <span id="current-room-code">${this.roomCode}</span></p>
                <button id="copy-code-btn">${MESSAGES.UI.COPY_CODE}</button>
                <button id="leave-room-btn">${MESSAGES.UI.LEAVE_ROOM}</button>
            </div>
            <div class="mt-participants-section">
                <h3>${MESSAGES.UI.PARTICIPANTS}</h3>
                <div class="participants-list">
                    <div class="participant-count">${MESSAGES.INFO.LOADING}</div>
                </div>
            </div>
            ${this.isHost ? this.renderHostControls() : ''}
            <div id="alert-container" class="mt-alert-container"></div>
        `;

        // Alert bileşenini başlat
        this.alert = new Alert(view.querySelector('#alert-container'));
        
        this.attachEventListeners(view);
        return view;
    }

    renderHostControls() {
        return `
            <div class="mt-host-controls">
                <h3>${MESSAGES.UI.ROOM_CONTROLS}</h3>
                <button id="sync-playback-btn">${MESSAGES.UI.SYNC_PLAYBACK}</button>
            </div>
        `;
    }

    attachEventListeners(view) {
        view.querySelector('#leave-room-btn').addEventListener('click', () => {
            this.onLeaveRoom();
        });

        const copyCodeBtn = view.querySelector('#copy-code-btn');
        if (copyCodeBtn) {
            copyCodeBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(this.roomCode)
                    .then(() => {
                        this.alert.success(MESSAGES.ROOM.COPY_SUCCESS);
                    })
                    .catch(err => {
                        console.error('Kopyalama hatası:', err);
                    });
            });
        }

        if (this.isHost) {
            const syncBtn = view.querySelector('#sync-playback-btn');
            if (syncBtn) {
                syncBtn.addEventListener('click', () => {
                    this.syncPlayback();
                });
            }
        }
    }

    syncPlayback() {
        // Bu fonksiyon host tarafından çağrılacak ve WebSocket üzerinden diğer katılımcılara bilgi gönderecek
        if (this.roomService && window.YouTubeMusicAPI) {
            const currentTrack = window.YouTubeMusicAPI.getCurrentTrack();
            if (currentTrack) {
                this.roomService.wsService.sendMessage(currentTrack);
                this.alert.success(MESSAGES.MUSIC.SYNC_SUCCESS);
            } else {
                this.alert.error(MESSAGES.MUSIC.NO_TRACK);
            }
        }
    }
}
