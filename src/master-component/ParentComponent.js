import { isEmpty } from "lodash";
import { ChatInterface } from "../chat";
import RenderComposeBar from "../composebar/RenderComposeBar";
import RecentAgentsFunc from "../LandingPageRecentAgents/RecentAgents";
import { TemplateRenderer } from "../templateRenderer";
import { resolveSdkAssetPath } from "../utils/helpers";
import { cleanupAllAuthChallenges } from "../templateRenderer/functionality/agent-auth-challenge";
const {renderRecentAgents} = RecentAgentsFunc();

let questions = {}
let quickActions = []
let errorStates = []
let searchResponse = null
let moreAvailable = false
let currentDivId = null  // Store the div ID for re-rendering
let prevQuestionCount = 0
let overlayObserver = null
let resizeListenerAttached = false
let scheduledArrowUpdate = null

const unsubscribe = ChatInterface().subscribe((questionsData, searchResponse, moreAvailable, errorStates, quickActions) => {
    questions = questionsData
    console.log(questions, searchResponse, moreAvailable, errorStates, quickActions)
        
    // Only re-render the questions container, not the entire component
    renderQuestionsOnly()
})


const getOverlayHeight = () => {
    const botWrapper = document.querySelector('.composebar-bot-input-wrapper')
    if (botWrapper && botWrapper.offsetParent !== null) return botWrapper.offsetHeight

    const attachments = document.querySelector('.eva-attachments-container')
    if (attachments && attachments.offsetParent !== null && attachments.children.length > 0) return attachments.offsetHeight

    return 0
}

const syncQuestionsContainerPaddingBottom = () => {
    const questionsContainer = document.getElementById('questions-container')
    if (!questionsContainer) return

    const botWrapper = document.querySelector('.composebar-bot-input-wrapper')
    const botWrapperHeight =
        botWrapper && botWrapper.offsetParent !== null ? botWrapper.offsetHeight : 0

    if (!botWrapperHeight) {
        questionsContainer.style.paddingBottom = ''
        return
    }

    const remToPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    questionsContainer.style.paddingBottom = `${botWrapperHeight + remToPx}px`
}

const pinLatestQuestionToTop = () => {
    const questionsContainer = document.getElementById('questions-container')
    if (!questionsContainer) return
    const messageContainers = questionsContainer.querySelectorAll('.message-container')
    if (messageContainers.length < 2) return

    messageContainers.forEach(mc => mc.style.marginBottom = '')

    const lastMessage = messageContainers[messageContainers.length - 1]
    const visibleHeight = questionsContainer.clientHeight - getOverlayHeight()
    const lastMessageHeight = lastMessage.offsetHeight
    const spacer = Math.max(0, visibleHeight - lastMessageHeight)
    lastMessage.style.marginBottom = spacer + 'px'

    requestAnimationFrame(() => {
        lastMessage.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
}

const scrollToBottom = () => {
    const questionsContainer = document.getElementById('questions-container')
    if (questionsContainer) {
        questionsContainer.scrollTo({ top: questionsContainer.scrollHeight, behavior: 'smooth' })
    }
}


const updateScrollArrowVisibility = () => {
    const questionsContainer = document.getElementById('questions-container')
    const scrollArrow = document.getElementById('scroll-to-bottom-arrow')
    if (!questionsContainer || !scrollArrow) return

    syncQuestionsContainerPaddingBottom()

    const landingPageContainer = document.querySelector('.landing-page-container')
    if (!landingPageContainer || !landingPageContainer.classList.contains('results-page-container')) {
        scrollArrow.classList.remove('visible')
        return
    }

    const overlayHeight = getOverlayHeight()
    const hasOverlay = overlayHeight > 0
    // Keep a consistent gap above the composebar area whether or not an overlay (bot wrapper/attachments) is visible.
    // When an overlay is present, offset by its actual height instead of using a fixed jump.
    scrollArrow.style.bottom = hasOverlay
        ? `calc(8rem - 1.25rem + ${overlayHeight}px)`
        : 'calc(8rem - 1.25rem)'

    const messageContainers = questionsContainer.querySelectorAll('.message-container')
    if (!messageContainers.length) {
        scrollArrow.classList.remove('visible')
        return
    }

    const lastMessage = messageContainers[messageContainers.length - 1]
    const composeBar = document.getElementById('compose-bar-container')
    if (!lastMessage || !composeBar) {
        scrollArrow.classList.remove('visible')
        return
    }

    const remToPx = parseFloat(getComputedStyle(document.documentElement).fontSize)
    const distanceFromBottom = questionsContainer.scrollHeight - questionsContainer.scrollTop - questionsContainer.clientHeight
    const isNearBottom = distanceFromBottom < (hasOverlay ? 1.875 * remToPx : 1.25 * remToPx)

    const lastMessageBottom = lastMessage.getBoundingClientRect().bottom
    const composeBarTop = composeBar.getBoundingClientRect().top
    const visibleEdge = composeBarTop - overlayHeight + 5
    const isContentBehindComposeBar = lastMessageBottom > visibleEdge

    if (isContentBehindComposeBar && !isNearBottom) {
        scrollArrow.classList.add('visible')
    } else {
        scrollArrow.classList.remove('visible')
    }
}

const scheduleScrollArrowUpdate = () => {
    if (scheduledArrowUpdate != null) return
    scheduledArrowUpdate = requestAnimationFrame(() => {
        scheduledArrowUpdate = null
        updateScrollArrowVisibility()
    })
}

const ensureOverlayWatcher = () => {
    const composeBar = document.getElementById('compose-bar-container')
    if (!composeBar) return

    if (overlayObserver) {
        overlayObserver.disconnect()
        overlayObserver = null
    }

    overlayObserver = new MutationObserver(() => {
        // Bot wrapper / attachments can appear/disappear without any scroll event.
        scheduleScrollArrowUpdate()
    })

    overlayObserver.observe(composeBar, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "hidden", "aria-hidden"],
    })
}

const initScrollArrow = () => {
    const questionsContainer = document.getElementById('questions-container')
    const scrollArrow = document.getElementById('scroll-to-bottom-arrow')
    if (!questionsContainer || !scrollArrow) return

    questionsContainer.addEventListener('scroll', updateScrollArrowVisibility)
    scrollArrow.addEventListener('click', scrollToBottom)

    ensureOverlayWatcher()
    if (!resizeListenerAttached) {
        window.addEventListener('resize', scheduleScrollArrowUpdate)
        resizeListenerAttached = true
    }

    // Initial positioning (no need to wait for a scroll)
    scheduleScrollArrowUpdate()
}

const renderQuestionsOnly = () => {
    const questionsContainer = document.getElementById('questions-container')
    if (!questionsContainer) return

    // When a TomSelect input has focus (user is typing/selecting recipients),
    // skip the re-render entirely. store.subscribe fires on EVERY Redux dispatch
    // — including getSuggestedContactListNew pending/fulfilled which don't change
    // any visible state. Re-rendering during that window destroys the TomSelect
    // instance (dropdown closes, typed text lost, height jumps).
    if (questionsContainer.querySelector('.ts-control input:focus')) return

    // Same guard for Slack / Teams recipient search inputs.
    // getChannelRecepients (resolveFields) dispatches trigger store.subscribe on
    // both pending and fulfilled, causing renderQuestionsOnly to wipe and recreate
    // questionsContainer.innerHTML. This destroys the focused search input, fires
    // blur, and the 500ms blur timer then closes the floating panel — identical to
    // the TomSelect problem above.
    if (questionsContainer.querySelector('.slack-search-input:focus, .teams-search-input:focus')) return

    // Same guard for Slack / Teams message body editor and smart compose prompt.
    // smartComposeEmail dispatches trigger store.subscribe, which would destroy
    // the focused message editor or smart compose input, wiping typed text and
    // clearing the selected recipients entirely.
    if (questionsContainer.querySelector('.slack-message-editor:focus, .teams-message-editor:focus')) return
    if (questionsContainer.querySelector('.sc-prompt-input:focus')) return

    // Guard while the smart compose panel is open — suggestion button clicks fire
    // smartComposeEmail which triggers store.subscribe before any input has focus.
    // Without this guard, the form re-renders and loses all recipients + message text.
    if (questionsContainer.querySelector('.emailSmartCompose')) return

    // Guard while a Slack/Teams message is being sent. The send button click removes
    // focus from all inputs, so no other guard fires. But sendIntegrationMessage
    // dispatches trigger store.subscribe, destroying templateEl before the .then()
    // callback can replace it with the success card.
    if (questionsContainer.querySelector('[data-sending="true"]')) return

    const hasQuestions = questions && !isEmpty(questions);

    const landingPageContainer = document.querySelector('.landing-page-container');
    if (hasQuestions) {
        landingPageContainer?.classList.add('results-page-container');
    } else {
        landingPageContainer?.classList.remove('results-page-container');
    }

    if (!hasQuestions) {
        cleanupAllAuthChallenges();
        questionsContainer.innerHTML = '';
        prevQuestionCount = 0;
        setTimeout(() => updateScrollArrowVisibility(), 150)
        return;
    }

    const prevScrollTop = questionsContainer.scrollTop

    // Defensive de-dupe: in some flows (notably 3-dot integration actions),
    // the same server message can transiently exist in `questions` under multiple keys.
    // Rendering `Object.values(questions)` would then show a duplicated "question" block
    // (commonly `agent_welcome_template`) even though only one advanceSearch happened.
    //
    // Keep the FIRST occurrence so that items stay in their original chronological position
    // (e.g., agent_welcome_template stays at the top, not shifted below a later integration action).
    const questionList = Object.values(questions);
    const seen = new Set();
    const deduped = [];
    for (let i = 0; i < questionList.length; i++) {
        const item = questionList[i];
        const key =
            (item?.messageId ? `m:${item.messageId}` : null) ||
            (item?.reqId ? `r:${item.reqId}` : null) ||
            (item?.cId ? `c:${item.cId}` : null) ||
            (item?.id ? `i:${item.id}` : `idx:${i}`);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(item);
    }

    let questionsHTML = '';
    questionsHTML = deduped.map((item) => {
        if (item?.isTask) return '';

        const el = TemplateRenderer.generateHTMLTemplate(item, {
            loadingText: "Analyzing",
        });

        return el.outerHTML;
    }).join('');

    questionsContainer.innerHTML = questionsHTML

    const messageContainers = questionsContainer.querySelectorAll('.message-container')
    const currentQuestionCount = messageContainers.length

    if (currentQuestionCount > prevQuestionCount && currentQuestionCount >= 2) {
        pinLatestQuestionToTop()
    } else if (currentQuestionCount >= 2) {
        const lastMessage = messageContainers[messageContainers.length - 1]
        const visibleHeight = questionsContainer.clientHeight - getOverlayHeight()
        const lastMessageHeight = lastMessage.offsetHeight
        lastMessage.style.marginBottom = Math.max(0, visibleHeight - lastMessageHeight) + 'px'
        questionsContainer.scrollTop = prevScrollTop
    }
    prevQuestionCount = currentQuestionCount

    setTimeout(() => updateScrollArrowVisibility(), 150)
}

const constructParentComponent = () => {
    return `
    <div id='parent-home-container' class='parent-home-container'>        
        <div class="landing-page-container">
            <div class="landing-page-content">
                <div class="landing-page-content-container">
                    <div id='questions-container' class='questions-container'>
                        <!-- Questions will be rendered here -->
                    </div>
                    <div id='scroll-to-bottom-arrow' class='scroll-to-bottom-arrow' title='Scroll to bottom'>
                       <svg width="18" height="18" class="wa-RightArrow" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1.33337 6.00016H10.6667M10.6667 6.00016L6.00004 1.3335M10.6667 6.00016L6.00004 10.6668" stroke="#737373" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </div>
                    <div id='compose-bar-container' class='compose-bar-container'>
                        <div class="ComposeBarContainer">
                            <div class="eva-composebar-parent">
                                <div class="eva-quick-reply-container"></div>
                                <div class="eva-composebar-area">
                                    <div class="eva-input-container skeleton-compose-bar">
                                        <div class="eva-attachments-container"></div>
                                        <div class="eva-compose-textarea-container">
                                            <sl-skeleton effect="pulse"></sl-skeleton>
                                        </div>
                                        <div class="eva-compose-textarea-actions">
                                            <div class="left-actions">
                                                <div class="common-agents-container">
                                                    <sl-skeleton effect="pulse"></sl-skeleton>
                                                    <sl-skeleton effect="pulse"></sl-skeleton>
                                                    <sl-skeleton effect="pulse"></sl-skeleton>
                                                </div>
                                            </div>
                                            <div class="right-actions">
                                                <sl-skeleton effect="pulse"></sl-skeleton>
                                                <sl-skeleton effect="pulse"></sl-skeleton>
                                                <sl-skeleton effect="pulse"></sl-skeleton>
                                            </div>
                                        </div>                                        
                                    </div>
                                </div>
                            </div>
                        </div>                        
                    </div>
                    <div id='recent-agents-container' class='recent-agents-parent-container'>
                        <div class="recent-agents-container">
                            <div class="recent-agent skeleton-agent">
                                <sl-skeleton effect="pulse"></sl-skeleton>
                            </div>
                            <div class="recent-agent skeleton-agent">
                                <sl-skeleton effect="pulse"></sl-skeleton>
                            </div>
                            <div class="recent-agent skeleton-agent">
                                <sl-skeleton effect="pulse"></sl-skeleton>
                            </div>
                            <div class="recent-agent skeleton-agent">
                                <sl-skeleton effect="pulse"></sl-skeleton>
                            </div>
                            <div class="recent-agent skeleton-agent">
                                <sl-skeleton effect="pulse"></sl-skeleton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>    
    </div>    
    `
}

export const renderParentComponent = (divId) => {
    const parentComponentDiv = document.getElementById(divId)
    if(!parentComponentDiv){
        console.error(`Element with ID "${divId}" not found`)
        return
    }
    // Store the div ID for re-rendering
    currentDivId = divId    
    parentComponentDiv.innerHTML = constructParentComponent()    
    
    // Initialize ComposeBar and RecentAgents
    RenderComposeBar(document.getElementById('compose-bar-container'), {
        showComposeBarPlusButton: window?.sdkConfig?.showComposeBarPlusButton !== false,
        showAgentBanner: window?.sdkConfig?.showAgentBanner !== false,
    })
    initScrollArrow()
    setTimeout(() => {
        renderRecentAgents('recent-agents-container')
        renderQuestionsOnly()
    }, 1000)
}
