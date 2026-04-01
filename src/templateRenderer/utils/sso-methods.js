import store from "../../redux/store";
import { thirdPartySSO, updateThirdPartySSO } from "../../redux/actions/global.action";
import eventBus from "./eventbus";

export default class SSOMethods {
	handleSsoAck = (data) => {
		if (data?.type === 'sso-ack') {
			this.cleanupSso();
			try { this.ssoWindow?.close(); } catch (e) {}
			if (this.connectionId) {
				store.dispatch(updateThirdPartySSO({
					userId: store.getState().global?.profile?.data?.id,
					payload: {
						type: this.ssoType,
						token: data?.token,
						connectionId: this.connectionId,
						config: this.config,
						details: this.details
					}
				})).then(res => {
					if (res?.payload) {
						eventBus.dispatch("postOauth2Connection", { res });
					}
				});
			} else {
				if (data?.token) {
					store.dispatch(thirdPartySSO({
						userId: store.getState().global?.profile?.data?.id,
						payload: {
							type: this.ssoType,
							token: data?.token,
							config: this.config,
							details: this.details
						}
					})).then(res => {
						if (res?.payload) {
							eventBus.dispatch("postOauth2Connection", { res });
						}
					});
				}
			}
		}
	};

	ssoListener = (e) => {
		this.handleSsoAck(e?.data);
	};

	cleanupSso = () => {
		try { window.removeEventListener('message', this.ssoListener); } catch (e) {}
		if (this.ssoBC) {
			try { this.ssoBC.close(); } catch (e) {}
			this.ssoBC = null;
		}
		if (this.onStorage) {
			try { window.removeEventListener('storage', this.onStorage); } catch (e) {}
			this.onStorage = null;
		}
	};

	connect = (type, id, config, details = null) => {
		this.ssoType = type;
		this.connectionId = id;
		this.config = config;
		this.details = details;
		this.apiurl = window.sdkConfig.api_url || "";
		this.presenceUrl = window.sdkConfig.presence_url || "";
		const popupWinWidth = 800,
			popupWinHeight = 700,
			// eslint-disable-next-line no-undef
			left = (screen.width - popupWinWidth) / 2,
			// eslint-disable-next-line no-undef
			top = (screen.height - popupWinHeight) / 2;
		const url = `${this.apiurl}serviceProvider/${type}/login?redirect_url=${window.location.origin}/web-redirection.html`;
		this.ssoWindow = window.open(
			url,
			'_blank',
			`width=${popupWinWidth},height=${popupWinHeight}, top=${top}, left=${left}, e_internal=true`,
		);

		this.ssoWindow.addEventListener('error', (error) => {
			console.error('SSO popup error:', error);
			try { this.ssoWindow.close(); } catch (e) {}
			this.cleanupSso();
		});

		window.addEventListener('message', this.ssoListener);
		try {
			this.ssoBC = new BroadcastChannel('kora-sso');
			this.ssoBC.onmessage = (event) => this.handleSsoAck(event?.data);
		} catch (e) {
			// ignore if BroadcastChannel unsupported
		}
		this.onStorage = (ev) => {
			if (ev?.key === 'kora_sso_ack' && ev?.newValue) {
				try {
					const data = JSON.parse(ev.newValue);
					localStorage.removeItem('kora_sso_ack');
					this.handleSsoAck(data);
				} catch (e1) {
					// ignore malformed storage
				}
			}
		};
		window.addEventListener('storage', this.onStorage);
		const timer = setInterval(() => {
			if (this.ssoWindow.closed) {
				clearInterval(timer);
				this.cleanupSso();
			}
		}, 1000);
	};
}
