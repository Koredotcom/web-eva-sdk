import { initializeSDK } from "../config";
import { ssoLogin } from "../redux/actions/global.action";
import store from "../redux/store";
const constructLoginButton = () => {    
    return `
        <button class="login-btn" type="button">
            <span class="login-text">Google</span>
        </button>
    `;
};

// parse SSO callback parameters from URL
const handleSSOCallback = async () => {
    const fullUrl = window.location.href;    
    let paramString = '';
    
    if (window.location.search) {
        paramString = window.location.search.substring(1);
    } else if (window.location.hash && window.location.hash.includes('=')) {
        paramString = window.location.hash.substring(1);
    } else {
        const questionMarkIndex = fullUrl.indexOf('?');
        const hashIndex = fullUrl.indexOf('#');
        
        if (questionMarkIndex !== -1) {
            paramString = fullUrl.substring(questionMarkIndex + 1);
        } else if (hashIndex !== -1) {
            paramString = fullUrl.substring(hashIndex + 1);
        }
    }
    
    const urlParams = new URLSearchParams(paramString);
    const idToken = urlParams.get('id_token');
    const emailId = urlParams.get('emailId');
    const error = urlParams.get('error');
            
    if (error) {
        console.error('SSO Error:', error);
        return { success: false, error };
    }

    if (idToken && emailId) {        
        localStorage.setItem('id_token', idToken);
        localStorage.setItem('emailId', emailId);        

        window.history.replaceState({}, document.title, window.location.pathname);

        return { 
            success: true, 
            idToken, 
            emailId 
        };
    }

    return { success: false, reason: 'No SSO params found' };
};

// API base URL for SSO login (must be set before SDK initialization)
const SSO_API_URL = 'https://eva-dev.kore.ai/api/';

// Initialize SSO callback handling
const initSSOCallback = async () => {
    const ssoResult = await handleSSOCallback();
    if (ssoResult.success) {   
        if (!window.sdkConfig) {
            window.sdkConfig = { api_url: SSO_API_URL };
        }
        
        const loginResponse = await store.dispatch(ssoLogin({ payload: { id_token: ssoResult.idToken, emailId: ssoResult.emailId } }));
        localStorage.setItem('userId', loginResponse?.payload?.userInfo?.id);
        localStorage.setItem('expiresDate', loginResponse?.payload?.authorization?.expiresDate);
        localStorage.setItem('accessToken', loginResponse?.payload?.authorization?.accessToken);
        await initializeSDK({ 
            api_url: SSO_API_URL, 
            presence_url: SSO_API_URL, 
            userId: loginResponse?.payload?.userInfo?.id, 
            accessToken: loginResponse?.payload?.authorization?.accessToken 
        });
        return ssoResult;
    }
    return ssoResult;
};

// Execute SSO callback on module load
initSSOCallback();

// Build SSO URL
const baseUrl = window.location.origin;
const redirectURL = encodeURIComponent(`${baseUrl}/app`);
const scopes = encodeURIComponent('openid email profile https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/directory.readonly https://www.googleapis.com/auth/contacts.other.readonly https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive');
const ssoUrl = `https://eva-dev.kore.ai/api/sso/login?connection=google&redirect_url=${redirectURL}&scope=${scopes}`;

// Using event delegation to handle the login button click
document.addEventListener('click', (event) => {
    const loginButton = event.target.closest('.login-btn');
    if (loginButton) {                
        window.location.href = ssoUrl;
    }
});
export { constructLoginButton, handleSSOCallback, initSSOCallback };
