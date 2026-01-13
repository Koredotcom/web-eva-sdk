import store from "../../redux/store";
import { thirdPartySSO } from "../../redux/actions/global.action";
import eventBus from "./eventbus";

export default class SSOMethods {
	broadcastChannel = null;
	popupCheckTimer = null;
	isProcessed = false;

	
	handleSSOResponse = async (data) => {
		
		if (this.isProcessed) return;
		this.isProcessed = true;

		console.log("SSO: Processing response", data);

		
		this.cleanup();

		
		this.ssoWindow = null;

		if (data?.token) {
			let userId = store.getState().global?.profile?.data?.id;
			let payload = {
				provider: this.ssoType,
				id_token: data.token,
				config: this.config,
				details: this.details,
			};
			if(!this.details){
				delete payload.details;
			}
			const res = await store.dispatch(
				thirdPartySSO({ userId: userId, payload: payload })
			);
			if (res?.payload?.status === 200) {
				eventBus.dispatch("postOauth2Connection", { res });
			}
		} else if (data?.error) {
			console.error("SSO Error:", data.error);
		}
	};

	
	ssoListener = (e) => {
		if (e?.data?.type === "sso-ack") {
			console.log("SSO: Received via postMessage");
			this.handleSSOResponse(e.data);
		}
	};

	
	setupBroadcastChannel = () => {
		try {
			this.broadcastChannel = new BroadcastChannel('eva-sso-channel');
			this.broadcastChannel.onmessage = (e) => {
				if (e?.data?.type === "sso-ack") {
					console.log("SSO: Received via BroadcastChannel");
					this.handleSSOResponse(e.data);
				}
			};
			console.log("SSO: BroadcastChannel listener setup");
		} catch (e) {
			console.log("SSO: BroadcastChannel not supported");
		}
	};

	// localStorage listener (the date stored from call back url web-redirection.html)
	storageListener = (e) => {
		if (e.key === 'eva_sso_ack' && e.newValue) {
			try {
				const data = JSON.parse(e.newValue);
				if (data?.type === "sso-ack") {
					console.log("SSO: Received via localStorage event");					
					localStorage.removeItem('eva_sso_ack');
					this.handleSSOResponse(data);
				}
			} catch (err) {
				console.error("SSO: Failed to parse localStorage data", err);
			}
		}
	};

	// Also check localStorage on interval (in case storage event doesn't fire in same tab)
	checkLocalStorage = () => {
		try {
			const stored = localStorage.getItem('eva_sso_ack');
			if (stored) {
				const data = JSON.parse(stored);
				if (data?.type === "sso-ack") {
					console.log("SSO: Found in localStorage (polling)");
					localStorage.removeItem('eva_sso_ack');
					this.handleSSOResponse(data);
				}
			}
		} catch (e) {
			// Ignore
		}
	};

	cleanup = () => {
		
		window.removeEventListener('message', this.ssoListener);

		
		if (this.broadcastChannel) {
			try {
				this.broadcastChannel.close();
			} catch (e) {}
			this.broadcastChannel = null;
		}

		
		window.removeEventListener('storage', this.storageListener);

		
		if (this.popupCheckTimer) {
			clearInterval(this.popupCheckTimer);
			this.popupCheckTimer = null;
		}

		console.log("SSO: Cleanup complete");
	};

	connect = (type, id, config, details = null) => {
		
		this.isProcessed = false;
		this.ssoType = type;
		this.connectionId = id;
		this.config = config;
		this.details = details;
		this.apiurl = window.sdkConfig?.api_url || "";
		this.presenceUrl = window.sdkConfig?.presence_url || "";

		// Clear any existing localStorage entry
		try {
			localStorage.removeItem('eva_sso_ack');
		} catch (e) {}

		const popupWinWidth = 800,
			popupWinHeight = 500,
			left = (screen.width - popupWinWidth) / 2,
			top = (screen.height - popupWinHeight) / 2;

		
		this.ssoWindow = window.open(
			`${this.apiurl}serviceProvider/${type}/login?redirect_url=${window.location.origin}/web-redirection.html`,
			'_blank',
			`width=${popupWinWidth},height=${popupWinHeight},top=${top},left=${left}`
		);

		console.log("SSO: Popup opened, setting up listeners");

		window.addEventListener('message', this.ssoListener);
		this.setupBroadcastChannel();
		window.addEventListener('storage', this.storageListener);

		this.popupCheckTimer = setInterval(() => {
			
			this.checkLocalStorage();

			let isPopupClosed = false;
			try {
				isPopupClosed = this.ssoWindow && this.ssoWindow.closed;
			} catch (e) {
				console.log("SSO: Cannot check popup status (COOP restriction)");
			}

			if (isPopupClosed && !this.isProcessed) {
				console.log("SSO: Popup closed, checking localStorage one more time");
				this.checkLocalStorage();
				
				// set timeout to cleanup if popup is closed without completing auth
				setTimeout(() => {
					if (!this.isProcessed) {
						console.log("SSO: Popup closed without completing auth");
						this.cleanup();
					}
				}, 500);
			}
		}, 500);
	};
}
