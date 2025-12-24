import { WebSocketService } from './websocket-service.js';
import { MESSAGES } from '../constants/messages.js';
import { renderSongInfo } from '../constants/templates.js';

export class RoomService {
    static instance = null;
    static HTTP_ROUTE = "https://music.norahc.com";
    
    constructor() {
        this.wsService = WebSocketService.getInstance();
        this.currentRoom = null;
        this.isHost = false;
        this.participants = new Map();
        this.songMessageHandler = null;
        this.participantUpdateHandler = null;
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
                if (!participant || !participant.client_id) return;
                this.participants.set(participant.client_id, {
                    client_id: participant.client_id,
                    roles: Array.isArray(participant.roles) ? participant.roles : ['listener']
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
            if (!state.roomCode) return;

            this.currentRoom = state.roomCode;
            this.isHost = state.isHost;

            if (this.isHost) {
                await this.clearExtensionState();
                this.currentRoom = null;
                this.isHost = false;
            }
        } catch (error) {
            console.error('Durum başlatılırken hata:', error);
            await this.clearExtensionState();
        }
    }

    async createRoom() {
        try {
            if (this.participantUpdateHandler) {
                this.wsService.removeEventListener('PARTICIPANTS_UPDATE', this.participantUpdateHandler);
            }
            this.participantUpdateHandler = (data) => {
                this.handleParticipantUpdate(data);
            };
            this.wsService.addEventListener('PARTICIPANTS_UPDATE', this.participantUpdateHandler);

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
            if (this.participantUpdateHandler) {
                this.wsService.removeEventListener('PARTICIPANTS_UPDATE', this.participantUpdateHandler);
            }
            this.participantUpdateHandler = (data) => {
                this.handleParticipantUpdate(data);
            };
            this.wsService.addEventListener('PARTICIPANTS_UPDATE', this.participantUpdateHandler);

            const response = await this.wsService.joinRoom(roomCode);
            if (response.success) {
                this.currentRoom = response.roomCode;
                this.isHost = response.isHost;

                if (this.wsService.socket) {
                    if (this.songMessageHandler) {
                        this.wsService.socket.removeEventListener('message', this.songMessageHandler);
                    }
                    this.songMessageHandler = (event) => {
                        try {
                            const songData = JSON.parse(event.data);
                            if (!this.isHost && songData && !songData.type && songData.title && songData.status !== undefined) {
                                this.handleSongUpdate(songData);
                            }
                        } catch (error) {
                            console.error('Mesaj işlenirken hata:', error);
                        }
                    };
                    this.wsService.socket.addEventListener('message', this.songMessageHandler);
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
                if (this.songMessageHandler && this.wsService.socket) {
                    this.wsService.socket.removeEventListener('message', this.songMessageHandler);
                    this.songMessageHandler = null;
                }
                if (this.participantUpdateHandler) {
                    this.wsService.removeEventListener('PARTICIPANTS_UPDATE', this.participantUpdateHandler);
                    this.participantUpdateHandler = null;
                }
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

    getParticipantsSnapshot() {
        return Array.from(this.participants.values());
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
