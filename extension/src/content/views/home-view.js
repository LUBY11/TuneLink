import { Alert } from './alert.js';
import { MESSAGES } from '../../constants/messages.js';
import { renderEmptySongInfo } from '../../constants/templates.js';

export class HomeView {
    constructor(onCreateRoom, onJoinRoom) {
        this.onCreateRoom = onCreateRoom;
        this.onJoinRoom = onJoinRoom;
        this.alert = null;
    }

    render() {
        const view = document.createElement('div');
        view.className = 'mt-home-view';
        view.innerHTML = `
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

        // Alert bileşenini başlat
        this.alert = new Alert(view.querySelector('#alert-container'));

        this.attachEventListeners(view);
        return view;
    }

    attachEventListeners(view) {
        view.querySelector('#create-room-btn').addEventListener('click', () => {
            this.onCreateRoom();
        });

        view.querySelector('#join-room-btn').addEventListener('click', () => {
            const roomCode = view.querySelector('#room-code').value;

            if (!roomCode.trim()) {
                this.alert.error(MESSAGES.ROOM.EMPTY_CODE);
                return;
            }

            this.onJoinRoom(roomCode);
        });

        view.querySelector('#room-code').addEventListener('input', () => {
            // Kullanıcı yazmaya başladığında uyarıyı gizle
            if (this.alert) {
                this.alert.hide();
            }
        });
    }
}
