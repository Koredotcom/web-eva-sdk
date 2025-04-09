import store from "../../redux/store";
import { thirdPartySSO } from "../../redux/actions/global.action";

export default class SSOMethods {
    ssoListener = async (e) => {
        if (e?.data?.type === 'sso-ack') {
            window.removeEventListener('message', this.ssoListener);
            this.ssoWindow.close();
            // if(this.connectionId) {
            //     store.dispatch({
            //         type: UPDATE_THIRD_PARTY_SSO,
            //         payload: {
            //             type: this.ssoType,
            //             token: e?.data?.token,
            //             connectionId: this.connectionId,
            //             config: this.config,
            //             details: this.details
            //         },
            //     });
            // } 
            // else {
                if(e?.data?.token){
                    let userId = store.getState().global?.profile?.data?.id;
                    let payload = {
                        provider: this.ssoType,
                        token: e?.data?.token,
                        config: this.config,
                        details: this.details
                    }
                    const res = await store.dispatch(thirdPartySSO({userId: userId, payload: payload}));
                    console.log("res", res);
                }
            // }
        }
    };
    connect = (type, id, config, details = null) => {
        this.ssoType = type;
        this.connectionId = id;
        this.config = config;
        this.details = details;
        this.apiurl =  window.sdkConfig.api_url || "";
        let a = "https://eva-qa.kore.ai";
        let b = "https://dev.kore.ai";
        const popupWinWidth = 800,
            popupWinHeight = 500,
            // eslint-disable-next-line no-undef
            left = (screen.width - popupWinWidth) / 2,
            // eslint-disable-next-line no-undef
            top = (screen.height - popupWinHeight) / 2;
        this.ssoWindow = window.open(
            `${this.apiurl}serviceProvider/${type}/login?redirect_url=${a}/web-redirection.html`,
            '_blank',
            `width=${popupWinWidth},height=${popupWinHeight}, top=${top}, left=${left}, e_internal=true`,
        );
        window.addEventListener('message', this.ssoListener);
        const timer = setInterval(() => {
            if (this.ssoWindow.closed) {
                clearInterval(timer);
                window.removeEventListener('message', this.ssoListener);
            }
        }, 1000);
        // this.props.showMeetPortlet({meetingNumber: 2131957515, pwd: "YWhZRDFxZzNMbDVENlJ3am12QjF3UT09"});
    };
}