import { WebSocketService } from './websocket-service.js';
import { MESSAGES } from '../constants/messages.js';
import { renderSongInfo } from '../constants/templates.js';

export class RoomService {
    static instance = null;
    static HTTP_ROUTE = "https://music.eraycan.com"
    
    constructor() {
        this.wsService = WebSocketService.getInstance();
        this.currentRoom = null;
        this.isHost = false;
        this.participants = new Map();
        this.initializeState();
    }

    static getInstance() {
        if (!RoomService.instance) {
            RoomService.instance = new RoomService();
        }
        return RoomService.instance;
    }

    async getRoomInfo(roomId) {
        try {
            const response = await fetch(`${RoomService.HTTP_ROUTE}/room-info?roomId=${roomId}`);
            if (!response.ok) {
                throw new Error('Oda bilgileri alınamadı');
            }
            const roomInfo = await response.json();
            this.updateParticipants(roomInfo);
            return roomInfo;
        } catch (error) {
            console.error('Oda bilgileri alınırken hata:', error);
            throw error;
        }
    }

    updateParticipants(participants) {
        this.participants.clear();
        if (Array.isArray(participants)) {
            participants.forEach(participant => {
                this.participants.set(participant.client_id, {
                    client_id: participant.client_id,
                    roles: participant.roles || ['listener'],
                    type: 'joined'
                });
            });
        }
    }

    handleParticipantUpdate(data) {
        if (!data || !data.type) return;

        if (data.type === 'joined') {
            this.participants.set(data.client_id, data);

            if (this.isHost && window.YouTubeMusicAPI) {
                const currentTrack = window.YouTubeMusicAPI.getCurrentTrack();
                if (currentTrack) {
                    this.wsService.sendMessage(currentTrack);
                }
            }
        } else if (data.type === 'left') {
            this.participants.delete(data.client_id);
        }

        const participantsList = document.querySelector('.participants-list');
        const countBadge = document.querySelector('.participant-count-badge');

        if (participantsList) {
            const currentClientId = this.wsService.clientId;
            const allParticipants = Array.from(this.participants.values());

            if (countBadge) {
                countBadge.textContent = MESSAGES.UI.PARTICIPANTS_COUNT.replace('{count}', allParticipants.length);
            }

            const html = allParticipants.map(p => {
                const isHost = p.roles.includes('owner');
                const isCurrentUser = p.client_id === currentClientId;
                return `
                    <div class="participant ${isCurrentUser ? 'current-user' : ''} ${isHost ? 'host' : ''}">
                        <div class="participant-avatar">${isHost ? 'H' : (isCurrentUser ? 'S' : 'D')}</div>
                        <span class="participant-role">
                            ${isHost ? MESSAGES.UI.HOST : MESSAGES.UI.LISTENER}${isCurrentUser ? ' ' + MESSAGES.UI.YOU : ''}
                        </span>
                    </div>
                `;
            }).join('');

            participantsList.innerHTML = `<div class="participants-grid">${html}</div>`;
        }
    }

    handleSongUpdate(songData) {
        if (!songData.title || songData.status === undefined) return;

        const songInfoElement = document.getElementById('current-song-info');
        if (songInfoElement) {
            songInfoElement.innerHTML = renderSongInfo(songData);
        }

        if (window.YouTubeMusicAPI) {
            try {
                window.YouTubeMusicAPI.updateVideoState(songData);
            } catch (error) {
                console.error('Video durumu güncellenirken hata:', error);
            }
        } else {
            console.warn('YouTubeMusicAPI tanımlı değil, video güncellenemedi');
        }
    }

    async initializeState() {
        try {
            const state = await this.getExtensionState();
            if (state.roomCode) {
                this.currentRoom = state.roomCode;
                this.isHost = state.isHost;
                if (this.isHost) {
                    await this.wsService.createRoom();
                } else {
                    await this.wsService.joinRoom(this.currentRoom);
                }
            }
        } catch (error) {
            console.error('Durum başlatılırken hata:', error);
            await this.clearExtensionState();
        }
    }

    async createRoom() {
        try {
            const participantUpdateHandler = (data) => {
                this.handleParticipantUpdate(data);
            };

            this.wsService.addEventListener('PARTICIPANTS_UPDATE', participantUpdateHandler);

            const response = await this.wsService.createRoom();
            if (response.success) {
                this.currentRoom = response.roomCode;
                this.isHost = response.isHost;
                await this.updateExtensionState({
                    roomCode: this.currentRoom,
                    isHost: this.isHost,
                    clientId: this.wsService.clientId
                });
                return response;
            }
            throw new Error('Oda oluşturulamadı');
        } catch (error) {
            console.error('Oda oluşturulurken hata:', error);
            throw error;
        }
    }

    async joinRoom(roomCode) {
        try {
            const participantUpdateHandler = (data) => {
                this.handleParticipantUpdate(data);
            };

            this.wsService.addEventListener('PARTICIPANTS_UPDATE', participantUpdateHandler);

            const response = await this.wsService.joinRoom(roomCode);
            if (response.success) {
                this.currentRoom = response.roomCode;
                this.isHost = response.isHost;

                if (this.wsService.socket) {
                    this.wsService.socket.addEventListener('message', (event) => {
                        try {
                            const songData = JSON.parse(event.data);
                            if (!this.isHost) {
                                this.handleSongUpdate(songData);
                            }
                        } catch (error) {
                            console.error('Mesaj işlenirken hata:', error);
                        }
                    });
                }

                await this.updateExtensionState({
                    roomCode: this.currentRoom,
                    isHost: this.isHost,
                    clientId: this.wsService.clientId
                });
                return response;
            }
            throw new Error('Odaya katılınamadı');
        } catch (error) {
            console.error('Odaya katılırken hata:', error);
            throw error;
        }
    }

    async leaveRoom() {
        try {
            const response = await this.wsService.leaveRoom();
            if (response.success) {
                this.currentRoom = null;
                this.isHost = false;
                this.participants.clear();
                await this.clearExtensionState();
            }
            return response;
        } catch (error) {
            console.error('Odadan çıkarken hata:', error);
            throw error;
        }
    }

    getCurrentClientId() {
        return this.wsService.clientId;
    }

    addParticipantUpdateListener(callback) {
        this.wsService.addEventListener('PARTICIPANTS_UPDATE', callback);
    }

    removeParticipantUpdateListener(callback) {
        this.wsService.removeEventListener('PARTICIPANTS_UPDATE', callback);
    }

    addSongUpdateListener(callback) {
        this.wsService.addEventListener('SONG_UPDATE', callback);
    }

    removeSongUpdateListener(callback) {
        this.wsService.removeEventListener('SONG_UPDATE', callback);
    }

    getExtensionState() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'GET_EXTENSION_STATE' }, (response) => {
                resolve(response);
            });
        });
    }

    updateExtensionState(state) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: 'UPDATE_EXTENSION_STATE',
                state
            }, (response) => {
                resolve(response);
            });
        });
    }

    clearExtensionState() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'CLEAR_EXTENSION_STATE' }, (response) => {
                resolve(response);
            });
        });
    }
}
