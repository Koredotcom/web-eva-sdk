import io from "socket.io-client";
import { ChatInterface } from "../chat";
import BotConversation from "../chat/botAgent/getBotConversation";
import Notification from "../notifications/notification";
import { presenceStart } from "../redux/actions/global.action";
import store from "../redux/store";
import { HistoryInterface } from "../history";

class WebSocketClient {
    constructor() {
        this.socket = null;
        this.url = null;
        this.options = null;
        this._presenceRefreshPromise = null;
        this._lastPresenceRefreshAt = 0;
    }

    shouldRefreshPresence(errorOrReason) {
        const text = String(errorOrReason?.message || errorOrReason || "").toLowerCase();
        // Only refresh presence when it likely helps (auth/token issues).
        return (
            text.includes("unauthor") ||
            text.includes("forbidden") ||
            text.includes("token") ||
            text.includes("jwt") ||
            text.includes("auth")
        );
    }

    async refreshPresenceToken() {
        // Avoid spamming /presence/start during socket reconnect loops.
        const MIN_INTERVAL_MS = 60_000;
        const now = Date.now();
        if (this._presenceRefreshPromise) return this._presenceRefreshPromise;
        if (now - this._lastPresenceRefreshAt < MIN_INTERVAL_MS) return;

        this._lastPresenceRefreshAt = now;
        this._presenceRefreshPromise = store
            .dispatch(presenceStart())
            .catch(() => {
                // Ignore; reconnect logic will keep trying the socket.
            })
            .finally(() => {
                this._presenceRefreshPromise = null;
            });
        return this._presenceRefreshPromise;
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
            reconnectionAttempts: 1000,
            reconnectionDelay: 1000,
            auth: (cb) => {
                // This function is called on every connection attempt (including reconnects)
                cb({
                    ...(options?.query || {}),
                    sToken: store.getState().global?.presenceStart?.data?.sToken,
                    rnd: new Date().getTime(),
                });
            },
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
                // Don't call presenceStart on every disconnect — it causes continuous API calls
                // when the socket is unstable. Refresh only for likely auth/token issues.
                if (this.shouldRefreshPresence(reason)) {
                    await this.refreshPresenceToken();
                }
                console.warn(`Socket disconnected: ${reason}`);
            });

            this.socket.on("connect_error", async (error) => {
                // Don't call presenceStart for generic network/CORS errors. Only refresh if auth/token issue.
                if (this.shouldRefreshPresence(error)) {
                    await this.refreshPresenceToken();
                }
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
                if(msg?.entity === "answerContext") {
                    /*In answer suggestion, will receive thoughts of agents, need to append to the question*/                    
                        ChatInterface().agentThoughts(msg)                                        
                }
                if (msg?.entity === "thoughts") {
                    ChatInterface().agentThoughts(msg)     
                }
                if(msg?.entity === "answerChunk"){
                    ChatInterface().contentStreaming(msg)
                }
                if (msg?.entity === "boardName") {
                    /*update the name in the history board */
                    HistoryInterface().updateHistoryBoardNameonSocketEvent(msg?.data)
                }
                if (msg?.entity === 'reqFlow') {
                    ChatInterface().responseFlowGeneration(msg)
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
