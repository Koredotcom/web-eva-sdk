import store from "../../redux/store";
import { checkAuthStatus } from "../../redux/actions/global.action";
import { InitiateChatConversationAction } from "../../chat";

/**
 * Module-level registry so polling survives DOM re-renders.
 * ParentComponent.renderQuestionsOnly() replaces questionsContainer.innerHTML
 * on every Redux dispatch, destroying all DOM nodes. By keeping state here
 * the interval keeps ticking and re-attaches to fresh DOM each time the
 * template re-initialises via its setTimeout.
 *
 * Key: messageId → { interval, authProfiles, boardId, data, destroyed }
 */
const activeSessions = new Map();
let _storeUnsubscribe = null;
let _prevBoardId = null;

function ensureStoreWatcher() {
    if (_storeUnsubscribe) return;
    _prevBoardId = store.getState()?.global?.activeBoardId;

    _storeUnsubscribe = store.subscribe(() => {
        if (activeSessions.size === 0) return;

        const state = store.getState()?.global;
        const currentBoardId = state?.activeBoardId;
        const questions = state?.questions;

        if (currentBoardId !== _prevBoardId) {
            _prevBoardId = currentBoardId;
            cleanupAllAuthChallenges();
            return;
        }

        if (!questions || Object.keys(questions).length === 0) {
            cleanupAllAuthChallenges();
        }
    });
}

export function cleanupAuthChallenge(messageId) {
    const session = activeSessions.get(messageId);
    if (!session) return;
    if (session.interval) clearInterval(session.interval);
    session.destroyed = true;
    activeSessions.delete(messageId);
}

export function cleanupAllAuthChallenges() {
    activeSessions.forEach((_, id) => cleanupAuthChallenge(id));
}

export function getSessionProfiles(messageId) {
    return activeSessions.get(messageId)?.authProfiles || null;
}

// ── Helpers shared across all sessions ──────────────────────────────────

function getWrapper(messageId) {
    return document.getElementById(`agent-auth-challenge-${messageId}`);
}

function updateProfileDOM(messageId, profiles) {
    profiles.forEach((profile, index) => {
        const row = document.getElementById(`auth-profile-${messageId}-${index}`);
        if (!row) return;

        const isDisabled = profile?.isAuthorized || profile?.loading;
        row.className = `auth-profiles${isDisabled ? ' disabledClick' : ''}`;

        const rightSec = row.querySelector('.right-sec');
        if (!rightSec) return;

        if (profile?.loading) {
            rightSec.innerHTML = `
                <div class="autonomous-loader">
                    <div class="waLoader"></div>
                </div>
            `;
        } else if (profile?.isAuthorized) {
            rightSec.innerHTML = `
                <div class="auth-selected">
                    <div class="tickicon">
                        <svg width="12" height="9" viewBox="0 0 12 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.3317 0.665039L3.99837 7.99837L0.665039 4.66504" stroke="#17B26A" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="selected-title">Authorized</div>
                </div>
            `;
        } else {
            rightSec.innerHTML = `
                <div class="auth-profile-status">
                    <div class="authorize">+ Authorize</div>
                </div>
            `;
        }
    });

    const continueBtn = document.getElementById(`auth-continue-btn-${messageId}`);
    if (continueBtn) {
        const allAuthorized = profiles.length > 0 && profiles.every(p => p?.isAuthorized);
        continueBtn.className = `kr-primary-btn-black${allAuthorized ? '' : ' disabled'}`;
        const arrowPath = continueBtn.querySelector('svg path');
        if (arrowPath) {
            arrowPath.setAttribute('stroke', allAuthorized ? '#FFFFFF' : '#A0A0AB');
        }
    }
}

// ── Polling (module-level, independent of DOM lifecycle) ────────────────

function stopPolling(session) {
    if (session.interval) {
        clearInterval(session.interval);
        session.interval = null;
    }
}

function startPolling(session) {
    stopPolling(session);
    if (session.destroyed) return;

    const { boardId, messageId } = session;

    session.interval = setInterval(() => {
        if (session.destroyed) { stopPolling(session); return; }

        const state = store.getState()?.global;
        const currentBoardId = state?.activeBoardId;
        const questions = state?.questions;

        const boardChanged = currentBoardId && currentBoardId !== boardId;
        const questionsCleared = !questions || Object.keys(questions).length === 0;
        if (boardChanged || questionsCleared) {
            cleanupAuthChallenge(messageId);
            return;
        }

        store.dispatch(checkAuthStatus({ boardId, messageId }))
            .then((result) => {
                if (session.destroyed) return;

                const remoteProfiles = result?.payload?.auth_profiles;
                if (!remoteProfiles) return;

                let updated = false;
                remoteProfiles.forEach((d) => {
                    const match = session.authProfiles.find(p => p.idpName === d.idpName);
                    if (match && d.isAuthorized) {
                        delete match.loading;
                        match.isAuthorized = true;
                        updated = true;
                    }
                });

                if (updated) {
                    const allDone = session.authProfiles.every(p => p?.isAuthorized);
                    if (allDone) stopPolling(session);
                    updateProfileDOM(messageId, session.authProfiles);
                }
            })
            .catch(() => {});
    }, 5000);
}

// ── Main entry — called from the template's setTimeout ──────────────────

const AgentAuthChallengeFunc = (data) => {
    const messageId = data?.messageId || data?.id;
    const boardId = data?.boardId;
    const wrapper = getWrapper(messageId);
    if (!wrapper) return;

    // Retrieve or bootstrap session
    let session = activeSessions.get(messageId);
    if (!session) {
        ensureStoreWatcher();
        session = {
            messageId,
            boardId,
            data,
            authProfiles: JSON.parse(JSON.stringify(data?.content?.payload?.auth_profiles || [])),
            interval: null,
            destroyed: false,
        };
        activeSessions.set(messageId, session);
    }

    // Reflect current auth state onto the (potentially fresh) DOM
    updateProfileDOM(messageId, session.authProfiles);

    // ── Authorize click handler ─────────────────────────────────────────

    const handleAuthorize = (profileIndex) => {
        if (session.destroyed) return;
        const profile = session.authProfiles[profileIndex];
        if (!profile || profile.isAuthorized || profile.loading) return;

        session.authProfiles = session.authProfiles.map((p, i) => {
            if (i === profileIndex) return { ...p, loading: true };
            return p;
        });
        updateProfileDOM(messageId, session.authProfiles);

        if (profile?.url) window.open(profile.url, '_blank');
        startPolling(session);
    };

    // ── Continue click handler ──────────────────────────────────────────

    const handleContinue = () => {
        if (session.destroyed) return;
        cleanupAuthChallenge(messageId);

        const w = getWrapper(messageId);
        if (w) w.style.display = 'none';

        InitiateChatConversationAction({
            payload: {
                messageId,
                boardId,
                action: 'resume',
                source: 'autonomousFlow',
            },
            params: {
                qId: data?.id,
                reqId: data?.reqId,
                messageId,
            },
        });
    };

    // ── Attach event listeners to current DOM nodes ─────────────────────

    session.authProfiles.forEach((_profile, index) => {
        const row = document.getElementById(`auth-profile-${messageId}-${index}`);
        if (!row || row._authBound) return;
        row._authBound = true;
        row.addEventListener('click', () => handleAuthorize(index));
    });

    const continueBtn = document.getElementById(`auth-continue-btn-${messageId}`);
    if (continueBtn && !continueBtn._authBound) {
        continueBtn._authBound = true;
        continueBtn.addEventListener('click', () => {
            const allAuthorized = session.authProfiles.length > 0
                && session.authProfiles.every(p => p?.isAuthorized);
            if (allAuthorized) handleContinue();
        });
    }
};

export default AgentAuthChallengeFunc;
