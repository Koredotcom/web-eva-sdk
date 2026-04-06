import { encodeHtml } from "../utils/helper";
import AgentAuthChallengeFunc, { getSessionProfiles } from "../functionality/agent-auth-challenge";

/**
 * Renders the agent auth challenge template.
 * Matches Kora-React AgentAuthChallenge.jsx + AgentAuthChallengeItemContainer.jsx
 *
 * data.content.payload.auth_profiles: Array of { displayName, idpName, url, isAuthorized }
 */
export function render(data) {
    const messageId = data?.messageId || data?.id;
    const authProfiles = getSessionProfiles(messageId) || data?.content?.payload?.auth_profiles || [];
    const allAuthorized = authProfiles.length > 0 && authProfiles.every(p => p?.isAuthorized);

    const profilesHtml = authProfiles.map((profile, index) => {
        const isDisabled = profile?.isAuthorized || profile?.loading;
        return `
            <div
                class="auth-profiles${isDisabled ? ' disabledClick' : ''}"
                id="auth-profile-${messageId}-${index}"
                data-idp-name="${encodeHtml(profile?.idpName || '')}"
                data-profile-index="${index}"
            >
                <div class="auth-profile-name">${encodeHtml(profile?.displayName || '')}</div>
                <div class="right-sec">
                    ${profile?.loading
                        ? `<div class="autonomous-loader"><div class="waLoader"></div></div>`
                        : profile?.isAuthorized
                            ? `<div class="auth-selected">
                                    <div class="tickicon">
                                        <svg width="12" height="9" viewBox="0 0 12 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M11.3317 0.665039L3.99837 7.99837L0.665039 4.66504" stroke="#17B26A" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </div>
                                    <div class="selected-title">Authorized</div>
                                </div>`
                            : `<div class="auth-profile-status">
                                    <div class="authorize">+ Authorize</div>
                                </div>`
                    }
                </div>
            </div>
        `;
    }).join('');

    const html = `
        <div class="autonomous-authorise-systems-wrapper" id="agent-auth-challenge-${messageId}">
            <div class="autonomous-authorise-systems">
                <div class="autonomous-title">Please authorize the application(s) to continue your conversation with the agent.</div>
                ${profilesHtml}
            </div>
            <div class="continue-btn">
                <button
                    class="kr-primary-btn-black${allAuthorized ? '' : ' disabled'}"
                    id="auth-continue-btn-${messageId}"
                >
                    Continue
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-left: 0.5rem;">
                        <path d="M1 6H11M11 6L6.5 1.5M11 6L6.5 10.5" stroke="${allAuthorized ? '#FFFFFF' : '#A0A0AB'}" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    setTimeout(() => {
        AgentAuthChallengeFunc(data);
    }, 200);

    return html;
}

export default { render };
