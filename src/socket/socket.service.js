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
        // Prevent spamming presence/start on reconnect loops
        this._presenceStartPromise = null;
        this._lastPresenceStartAt = 0;
        this._presenceStartMinIntervalMs = 5000;
    }

    async ensurePresenceToken({ force = false } = {}) {
        const now = Date.now();
        const currentToken = store.getState().global?.presenceStart?.data?.sToken;

        // Always throttle refresh calls (even if forced) to avoid request storms.
        // If we have a token and we've refreshed recently, reuse it.
        if (currentToken && (now - this._lastPresenceStartAt) < this._presenceStartMinIntervalMs) {
            return currentToken;
        }

        // De-dupe in-flight refresh calls.
        if (this._presenceStartPromise) {
            try {
                await this._presenceStartPromise;
            } catch (e) { /* noop */ }
            return store.getState().global?.presenceStart?.data?.sToken;
        }

        // If not forcing and we already have a token, allow using it without refreshing.
        if (!force && currentToken) {
            return currentToken;
        }

        this._presenceStartPromise = (async () => {
            try {
                await store.dispatch(presenceStart());
            } finally {
                this._lastPresenceStartAt = Date.now();
                this._presenceStartPromise = null;
            }
        })();

        try {
            await this._presenceStartPromise;
        } catch (e) { /* noop */ }

        return store.getState().global?.presenceStart?.data?.sToken;
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
                // Don't refresh sToken on every disconnect. Socket.io will reconnect automatically.
                // Only refresh on auth-related connect errors (handled below).
                console.warn(`Socket disconnected: ${reason}`);
            });

            this.socket.on("connect_error", async (error) => {
                // Only refresh token for auth/token related errors to avoid continuous /presence/start calls.
                const msg = String(error?.message || '');
                const isAuthError =
                    /unauthorized|authentication|auth|token|stoken|jwt|invalid/i.test(msg);

                if (isAuthError || !store.getState().global?.presenceStart?.data?.sToken) {
                    await this.ensurePresenceToken({ force: true });
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
