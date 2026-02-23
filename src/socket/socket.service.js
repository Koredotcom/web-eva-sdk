import io from "socket.io-client";
import { ChatInterface } from "../chat";
import BotConversation from "../chat/botAgent/getBotConversation";
import Notification from "../notifications/notification";
import { HistoryInterface } from "../history";
import { presenceStart } from "../redux/actions/global.action";
import store from "../redux/store";
import { AnnouncementsInterface } from "../Announcements";

class WebSocketClient {
    constructor() {
        this.socket = null;
        this.url = null;
        this.options = null;
    }

    stopReconnectionOnUnauthorized() {
        if (!this.socket) {
            return;
        }
        const manager = this.socket.io;
        if (manager) {
            manager.reconnection(false);
            manager.disconnect();
        }
        this.socket = null;
    }

    async refreshPresenceTokenOrStop() {
        const action = await store.dispatch(presenceStart());
        if (action?.meta?.requestStatus === "rejected") {
            if (action?.payload?.status === 401) {
                console.warn("[socket] presenceStart unauthorized, stopping reconnects");
                this.stopReconnectionOnUnauthorized();
            }
            return false;
        }
        if (this.options.query) {
            this.options.query.sToken = store.getState().global?.presenceStart?.data?.sToken;
        }
        return true;
    }

    initialize({ url, options }) {
        if (this.socket) {
            console.warn("Socket already initialized");
            return;
        }
        this.url = url;
        this.options = {
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 30000,
            ...options,
        };
    }

    connect() {
        if (!this.url || !this.options) {
            console.error("Socket configuration is not initialized.");
            return;
        }
        if (this.socket) {
            console.warn("Socket already connected");
            return;
        }

        try {
            this.socket = io(this.url, this.options);
            console.log("connected socket data: ", this.socket)
            this.socket.on("connect", () => {
                console.info(`Socket connected: ${this.socket.id}`);
            });
            
            this.socket.on("disconnect", async (reason) => {
                await this.refreshPresenceTokenOrStop();
                console.warn(`Socket disconnected: ${reason}`);
            });

            this.socket.on("connect_error", async (error) => {
                await this.refreshPresenceTokenOrStop();
                console.error(`Socket connection Error: ${error.message}`);
            });

            this.socket.on("message", (data) => {
                console.log("Socket message received:", data);
            });

            this.socket.on("botMessage", (data) => {
                console.log("bot message received:", data);
                BotConversation().setBotConversation(data)
            });

            this.socket.on('live', (msg) => {
                if(msg?.entity === "answersuggestion") {
                    /*In answer suggestion, will receive thoughts of agents, need to append to the question*/                    
                        ChatInterface().agentThoughts(msg)                                        
                }
                if(msg?.entity === "answerChunk"){
                    ChatInterface().contentStreaming(msg)
                }
                if (msg?.entity === "boardName") {
                    /*update the name in the history board */
                    HistoryInterface().updateHistoryBoardNameonSocketEvent(msg?.data)
                }
                if(msg?.entity === "announcements"){
                    AnnouncementsInterface().setNewAnnouncements(msg)
                }
            });
            this.socket.on("notification", (msg) => {
                Notification().notifyLatestNotification(msg)
            })
        } catch (err) {
            console.error('AI for Work exception in socket connection', err?.message);
            return null;
        }

    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            console.info("Socket disconnected.");
            this.socket = null;
        }
    }

    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        } else {
            console.error("Socket is not connected.");
        }
    }

    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        } else {
            console.error("Socket is not connected.");
        }
    }

    off(event) {
        if (this.socket) {
            this.socket.off(event);
        } else {
            console.error("Socket is not connected.");
        }
    }
}

export const WebSocketService = new WebSocketClient();
