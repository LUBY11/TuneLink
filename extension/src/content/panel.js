const extensionURL = chrome.runtime.getURL('');

import { HomeView } from `${extensionURL}src/content/views/home-view.js`;
import { RoomView } from `${extensionURL}src/content/views/room-view.js`;
import { RoomService } from `${extensionURL}src/services/room-service.js`;
import { Alert } from `${extensionURL}src/content/views/alert.js`;
import { MESSAGES } from `${extensionURL}src/constants/messages.js`;
import { renderSongInfo, renderEmptySongInfo } from `${extensionURL}src/constants/templates.js`;

/*
 * NOT: Bu dosya content-script.js ile benzer işlevlere sahiptir ve gereksiz olabilir.
 * İki dosyadan birini kullanmak yeterlidir. content-script.js daha kapsamlı olduğu için
 * o dosyayı kullanmanız önerilir. Bu dosya sadece referans olarak tutulabilir.
 */

class MusicTogetherPanel {
    constructor() {
        this.panel = null;
        this.currentView = null;
        this.roomService = RoomService.getInstance();
        this.alert = null;
        this.createPanel();
        this.showHomeView();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'music-together-panel';
        this.panel.innerHTML = `
            <div class="mt-toggle"></div>
            <div class="mt-header">
                <h2>${MESSAGES.UI.APP_TITLE}</h2>
            </div>
            <div id="mt-content" class="mt-content"></div>
        `;
        document.body.appendChild(this.panel);

        // Panel açma/kapama mantığı
        const toggleBtn = this.panel.querySelector('.mt-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.panel.classList.toggle('open');
                chrome.storage.local.set({ 'panelOpen': this.panel.classList.contains('open') });
            });
        }

        // Panel durumunu kayıtlı değerden al
        chrome.storage.local.get('panelOpen', (result) => {
            if (result.panelOpen) {
                this.panel.classList.add('open');
            }
        });

        // Alert bileşenini başlat
        this.alert = new Alert(this.panel.querySelector('#alert-container'));
    }

    async handleCreateRoom() {
        try {
            const response = await this.roomService.createRoom();
            if (response.success) {
                this.showRoomView(response.roomCode, true);
            } else {
                this.alert.error(MESSAGES.ROOM.CREATE_ERROR);
            }
        } catch (error) {
            console.error('Oda oluşturulurken hata:', error);
            this.alert.error(MESSAGES.ROOM.CREATE_ERROR);
        }
    }

    async handleJoinRoom(roomCode) {
        if (!roomCode || !roomCode.trim()) {
            this.alert.error(MESSAGES.ROOM.EMPTY_CODE);
            return;
        }

        try {
            const response = await this.roomService.joinRoom(roomCode);
            if (response.success) {
                this.showRoomView(roomCode, false);
            } else {
                this.alert.error(MESSAGES.ROOM.NOT_FOUND);
            }
        } catch (error) {
            console.error('Odaya katılırken hata:', error);
            this.alert.error(MESSAGES.ROOM.JOIN_ERROR);
        }
    }

    async handleLeaveRoom() {
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
    }

    showHomeView() {
        const homeView = new HomeView(
            () => this.handleCreateRoom(),
            (roomCode) => this.handleJoinRoom(roomCode)
        );
        this.setCurrentView(homeView);
    }

    showRoomView(roomCode, isHost) {
        const roomView = new RoomView(
            roomCode,
            isHost,
            () => this.handleLeaveRoom()
        );
        this.setCurrentView(roomView);
    }

    setCurrentView(view) {
        const contentContainer = document.getElementById('mt-content');
        contentContainer.innerHTML = '';
        contentContainer.appendChild(view.render());
        this.currentView = view;
    }
}

new MusicTogetherPanel();
