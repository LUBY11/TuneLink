export class WebSocketService {
    static instance = null;
    static WS_BASE_URL = 'wss://music.norahc.com';
    static BASE_URL_KEY = 'ymt-ws-base-url';

    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.clientId = null;
        this.roomId = null;
        this.roles = [];
        this.messageCallbacks = new Map();
        this.eventListeners = new Map();
        this.manualDisconnect = false;
        this.connectPromise = null;
        this.pendingRoomRequest = null;
    }

    static getInstance() {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService();
        }
        return WebSocketService.instance;
    }

    connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return this.connectPromise || Promise.resolve();
        }
        this.connectPromise = new Promise((resolve, reject) => {
            try {
                this.manualDisconnect = false;
                const baseUrl = WebSocketService.getBaseUrl();
                this.socket = new WebSocket(baseUrl);

                this.socket.onopen = () => {
                    this.isConnected = true;
                    resolve();
                };

                this.socket.onmessage = (event) => {
                    let data;
                    try {
                        data = JSON.parse(event.data);
                    } catch (error) {
                        console.warn('WebSocket mesaj parse hatasi:', error);
                        return;
                    }

                    if (data.type === 'joined' || data.type === 'left') {
                        const listeners = this.eventListeners.get('PARTICIPANTS_UPDATE');
                        if (listeners) {
                            for (const listener of listeners) {
                                listener(data);
                            }
                        }
                        return;
                    }

                    if (data.client_id && !data.type) {
                        this.clientId = data.client_id;
                        this.roomId = data.room_id;
                        this.roles = data.roles;
                        return;
                    }

                    if (data.type === 'room-joined' || data.type === 'room-created') {
                        if (this.pendingRoomRequest) {
                            const { resolve: pendingResolve, timeoutId } = this.pendingRoomRequest;
                            clearTimeout(timeoutId);
                            this.pendingRoomRequest = null;
                            this.roomId = data.code;
                            this.roles = data.role === 'host' ? ['owner'] : ['listener'];
                            pendingResolve({
                                success: true,
                                roomCode: this.roomId,
                                isHost: data.role === 'host'
                            });
                        }
                        return;
                    }

                    const callback = this.messageCallbacks.get(data.type);
                    if (callback) {
                        callback(data);
                    }

                    const listeners = this.eventListeners.get(data.type);
                    if (listeners) {
                        for (const listener of listeners) {
                            listener(data);
                        }
                    }
                };

                this.socket.onclose = () => {
                    this.isConnected = false;
                    this.connectPromise = null;
                    if (this.pendingRoomRequest) {
                        const { reject: pendingReject } = this.pendingRoomRequest;
                        this.pendingRoomRequest = null;
                        pendingReject(new Error('WebSocket disconnected'));
                    }
                    if (!this.manualDisconnect) {
                        this.reconnect();
                    }
                };

                this.socket.onerror = (error) => {
                    console.error('WebSocket hatası:', error);
                    this.connectPromise = null;
                    if (this.pendingRoomRequest) {
                        const { reject: pendingReject } = this.pendingRoomRequest;
                        this.pendingRoomRequest = null;
                        pendingReject(error);
                    }
                    reject(error);
                };
            } catch (error) {
                console.error('WebSocket bağlantı hatası:', error);
                this.connectPromise = null;
                reject(error);
            }
        });
        return this.connectPromise;
    }

    static getBaseUrl() {
        const stored = localStorage.getItem(WebSocketService.BASE_URL_KEY);
        if (stored && typeof stored === 'string') {
            return stored.trim() || WebSocketService.WS_BASE_URL;
        }
        return WebSocketService.WS_BASE_URL;
    }

    static setBaseUrl(url) {
        if (!url) return;
        localStorage.setItem(WebSocketService.BASE_URL_KEY, url.trim());
    }

    async createRoom() {
        try {
            await this.connect();
            return await this.sendRoomRequest({ type: 'create' });
        } catch (error) {
            console.error('Oda oluşturulurken hata:', error);
            throw error;
        }
    }

    async joinRoom(roomCode) {
        try {
            await this.connect();
            return await this.sendRoomRequest({ type: 'join', code: roomCode });
        } catch (error) {
            console.error('Odaya katılırken hata:', error);
            throw error;
        }
    }

    async leaveRoom() {
        if (this.socket) {
            this.manualDisconnect = true;
            if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
                try {
                    this.sendMessage({ type: 'leave' });
                } catch (error) {
                    console.warn('WebSocket ayrilma mesaji gonderilemedi:', error);
                }
            }
            this.socket.close();
        }
        this.connectPromise = null;
        this.pendingRoomRequest = null;
        this.clientId = null;
        this.roomId = null;
        this.roles = [];
        return { success: true };
    }

    addEventListener(type, callback) {
        if (!this.eventListeners.has(type)) {
            this.eventListeners.set(type, new Set());
        }
        this.eventListeners.get(type).add(callback);
    }

    removeEventListener(type, callback) {
        if (this.eventListeners.has(type)) {
            const listeners = this.eventListeners.get(type);
            listeners.delete(callback);
        }
    }

    sendMessage(message) {
        if (!this.socket || !this.isConnected || this.socket.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket bağlantısı yok');
        }
        this.socket.send(JSON.stringify(message));
    }

    sendRoomRequest(payload) {
        if (this.pendingRoomRequest) {
            this.pendingRoomRequest.reject(new Error('Room request already pending'));
            this.pendingRoomRequest = null;
        }
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                if (this.pendingRoomRequest) {
                    this.pendingRoomRequest = null;
                    reject(new Error('Room request timeout'));
                }
            }, 8000);
            this.pendingRoomRequest = { resolve, reject, timeoutId };
            this.sendMessage(payload);
        });
    }

    reconnect(endpoint) {
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect().catch(console.error);
            }
        }, 5000);
    }
}
