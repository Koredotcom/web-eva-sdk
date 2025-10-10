import { isEmpty } from "lodash";
import { ChatInterface } from "../chat";
import RenderComposeBar from "../composebar/RenderComposeBar";
import RecentAgentsFunc from "../LandingPageRecentAgents/RecentAgents";
import { TemplateRenderer } from "../templateRenderer";
const {renderRecentAgents} = RecentAgentsFunc();

let questions = {}
let quickActions = []
let errorStates = []
let searchResponse = null
let moreAvailable = false
let currentDivId = null  // Store the div ID for re-rendering

const unsubscribe = ChatInterface().subscribe((questionsData, searchResponse, moreAvailable, errorStates, quickActions) => {
    questions = questionsData
    console.log(questions, searchResponse, moreAvailable, errorStates, quickActions)
        
    // Only re-render the questions container, not the entire component
    renderQuestionsOnly()
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
        if (questions && !isEmpty(questions)) {
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
        questionsContainer.innerHTML = questionsHTML
        
        // Auto-scroll to bottom 
        scrollToBottom()
    }
}

const constructParentComponent = () => {
    return `
    <div id='parent-component-container'>
        <div id='questions-container'>
            <!-- Questions will be rendered here -->
        </div>
        <div id='compose-bar-container'>
            Compose Bar container will appear here
        </div>
        <div id='recent-agents-container'>
            Recent agents container will appear here
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
    setTimeout(() => {
        renderRecentAgents('recent-agents-container')
        // Also render any existing questions after initialization
        renderQuestionsOnly()
    }, 1000)
}
