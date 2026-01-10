import { isEmpty } from "lodash";
import { ChatInterface } from "../chat";
import RenderComposeBar from "../composebar/RenderComposeBar";
import RecentAgentsFunc from "../LandingPageRecentAgents/RecentAgents";
import { TemplateRenderer } from "../templateRenderer";
import { constructLoginButton } from "../Login";
import store from "../redux/store";
import { initializeSDK } from "../config";
const { renderRecentAgents } = RecentAgentsFunc();


let questions = {}
let quickActions = []
let errorStates = []
let searchResponse = null
let moreAvailable = false
let currentDivId = null  // Store the div ID for re-rendering
let isUserAuthorized = false;
let previousProfileStatus = null  // Track profile status changes

// Subscribe to ChatInterface for questions updates
const unsubscribe = ChatInterface().subscribe((questionsData, searchResponse, moreAvailable, errorStates, quickActions) => {
    questions = questionsData
    console.log(questions, searchResponse, moreAvailable, errorStates, quickActions)    
    renderQuestionsOnly()
})

// Subscribe to Redux store for profile changes
const unsubscribeProfile = store.subscribe(() => {
    const currentProfileStatus = store.getState().global.profile?.status
    
    if (currentProfileStatus !== previousProfileStatus) {
        previousProfileStatus = currentProfileStatus
        isUserAuthorized = currentProfileStatus === 'success'
                
        if (currentDivId) {
            const parentComponentDiv = document.getElementById(currentDivId)
            if (parentComponentDiv) {
                if (isUserAuthorized) {
                    parentComponentDiv.innerHTML = constructParentComponent()
                    RenderComposeBar(document.getElementById('compose-bar-container'))
                    setTimeout(() => {
                        renderRecentAgents('recent-agents-container')
                        renderQuestionsOnly()
                    }, 1000)
                }
            }
        }
    }
})

const scrollToBottom = () => {
    const questionsContainer = document.getElementById('questions-container')
    if (questionsContainer) {
        setTimeout(() => {
            questionsContainer.scrollTop = questionsContainer.scrollHeight
        }, 100)
    }
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
                    return `<div class="logo-icon"><img src="/images/eva-black-svg.svg" alt="AiForWork" /></div>`;
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

        questionsContainer.innerHTML = questionsHTML

        // Auto-scroll to bottom 
        scrollToBottom()
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

export const constructLoginComponent = () => {
    return `
    <div id='login-container' class='login-container'>
        ${constructLoginButton()}
    </div>
    `
}

export const renderParentComponent = (divId) => {
    const parentComponentDiv = document.getElementById(divId)
    if (!parentComponentDiv) {
        console.error(`Element with ID "${divId}" not found`)
        return
    }
    
    currentDivId = divId
    
    const userId = localStorage.getItem('userId')
    const accessToken = localStorage.getItem('accessToken')
    const tokenExpiryDate = localStorage.getItem('expiresDate')
    
    const hasSessionData = userId && accessToken && tokenExpiryDate
    const isTokenValid = hasSessionData && new Date() < new Date(tokenExpiryDate)
    
    if (!hasSessionData || !isTokenValid) {
        // No session or expired token - show login
        if (!hasSessionData) {
            console.log('No session data found, need to show login')
        } else {            
            localStorage.removeItem('userId')
            localStorage.removeItem('accessToken')
            localStorage.removeItem('expiresDate')
        }
        parentComponentDiv.innerHTML = constructLoginComponent()
    } else {
        console.log('Valid session found, initializing SDK...')
        initializeSDK({
            userId: userId,
            accessToken: accessToken,
            api_url: "https://eva-dev.kore.ai/api/",
            presence_url: "https://eva-dev.kore.ai/",
        })
    }
}

