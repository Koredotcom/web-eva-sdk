import { isEmpty } from "lodash";
import { ChatInterface } from "../chat";
import RenderComposeBar from "../composebar/RenderComposeBar";
import RecentAgentsFunc from "../LandingPageRecentAgents/RecentAgents";
import { TemplateRenderer } from "../templateRenderer";
import { resolveSdkAssetPath } from "../utils/helpers";
const {renderRecentAgents} = RecentAgentsFunc();

let questions = {}
let quickActions = []
let errorStates = []
let searchResponse = null
let moreAvailable = false
let currentDivId = null  // Store the div ID for re-rendering
let prevQuestionCount = 0

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

    const landingPageContainer = document.querySelector('.landing-page-container')
    if (!landingPageContainer || !landingPageContainer.classList.contains('results-page-container')) {
        scrollArrow.classList.remove('visible')
        return
    }

    const overlayHeight = getOverlayHeight()
    const hasOverlay = overlayHeight > 0
    scrollArrow.style.bottom = hasOverlay ? '8rem' : 'calc(8rem - 1.25rem)'

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

const initScrollArrow = () => {
    const questionsContainer = document.getElementById('questions-container')
    const scrollArrow = document.getElementById('scroll-to-bottom-arrow')
    if (!questionsContainer || !scrollArrow) return

    questionsContainer.addEventListener('scroll', updateScrollArrowVisibility)
    scrollArrow.addEventListener('click', scrollToBottom)
}

const renderQuestionsOnly = () => {
    const questionsContainer = document.getElementById('questions-container')
    if (questionsContainer) {
        // Generate questions HTML like ChatInterface does
        let questionsHTML = '';
        const hasQuestions = questions && !isEmpty(questions);
        
        if (hasQuestions) {
            questionsHTML = Object.values(questions).map((item, index) => {
                if (item?.isTask) return '';
                
                const assistantIconTemplate = () => {
                    return `<div class="logo-icon"><img src="${resolveSdkAssetPath("images/eva-black-svg.svg")}" alt="AiForWork" /></div>`;
                };

                let html = TemplateRenderer.generateHTMLTemplate(item, {
                    // assistantIconTemplate,
                    loadingText: "Analyzing",
                });

                return html.outerHTML;
            }).join('');
        }
        
        // Add or remove class based on questions existence
        const landingPageContainer = document.querySelector('.landing-page-container');
        if (hasQuestions) {
            /*append  results-page-container to the class of landing-page-container*/
            landingPageContainer.classList.add('results-page-container');
        } else {
            landingPageContainer.classList.remove('results-page-container');
        }
        
        const prevScrollTop = questionsContainer.scrollTop

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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
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
    RenderComposeBar(document.getElementById('compose-bar-container'))
    initScrollArrow()
    setTimeout(() => {
        renderRecentAgents('recent-agents-container')
        renderQuestionsOnly()
    }, 1000)
}
