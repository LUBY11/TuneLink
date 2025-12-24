export class WebSocketService {
    static instance = null;
    static WS_BASE_URL = 'wss://music.norahc.com';

    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.clientId = null;
        this.roomId = null;
        this.roles = [];
        this.messageCallbacks = new Map();
        this.eventListeners = new Map();
        this.manualDisconnect = false;
    }

    static getInstance() {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService();
        }
        return WebSocketService.instance;
    }

    connect(endpoint) {
        return new Promise((resolve, reject) => {
            try {
                this.manualDisconnect = false;
                this.socket = new WebSocket(`${WebSocketService.WS_BASE_URL}${endpoint}`);

                this.socket.onopen = () => {
                    this.isConnected = true;
                };

                this.socket.onmessage = (event) => {
                    const data = JSON.parse(event.data);

                    if (data.type === 'joined' || data.type === 'left') {
                        const listeners = this.eventListeners.get('PARTICIPANTS_UPDATE') || [];
                        listeners.forEach(listener => listener(data));
                        return;
                    }

                    if (data.client_id && !data.type) {
                        this.clientId = data.client_id;
                        this.roomId = data.room_id;
                        this.roles = data.roles;
                        resolve({
                            success: true,
                            roomCode: this.roomId,
                            isHost: this.roles.includes('owner')
                        });
                        return;
                    }

                    const callback = this.messageCallbacks.get(data.type);
                    if (callback) {
                        callback(data);
                    }

                    const listeners = this.eventListeners.get(data.type) || [];
                    listeners.forEach(listener => listener(data));
                };

                this.socket.onclose = () => {
                    this.isConnected = false;
                };

                this.socket.onerror = (error) => {
                    console.error('WebSocket hatası:', error);
                    reject(error);
                };
            } catch (error) {
                console.error('WebSocket bağlantı hatası:', error);
                reject(error);
            }
        });
    }

    async createRoom() {
        try {
            const response = await this.connect('/create-room');
            if (response.success) {
                if (window.YouTubeMusicAPI) {
                    const currentTrack = window.YouTubeMusicAPI.getCurrentTrack();
                    if (currentTrack) {
                        this.sendMessage(currentTrack);
                    }
                }
            }
            return response;
        } catch (error) {
            console.error('Oda oluşturulurken hata:', error);
            throw error;
        }
    }

    async joinRoom(roomCode) {
        try {
            return await this.connect(`/join-room?roomId=${roomCode}`);
        } catch (error) {
            console.error('Odaya katılırken hata:', error);
            throw error;
        }
    }

    async leaveRoom() {
        if (this.socket) {
            this.manualDisconnect = true;
            this.socket.close();
        }
        this.clientId = null;
        this.roomId = null;
        this.roles = [];
        return { success: true };
    }

    addEventListener(type, callback) {
        if (!this.eventListeners.has(type)) {
            this.eventListeners.set(type, []);
        }
        this.eventListeners.get(type).push(callback);
    }

    removeEventListener(type, callback) {
        if (this.eventListeners.has(type)) {
            const listeners = this.eventListeners.get(type);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    sendMessage(message) {
        if (!this.isConnected) {
            throw new Error('WebSocket bağlantısı yok');
        }
        this.socket.send(JSON.stringify(message));
    }

    reconnect(endpoint) {
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect(endpoint).catch(console.error);
            }
        }, 5000);
    }
}
