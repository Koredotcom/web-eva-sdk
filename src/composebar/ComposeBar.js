import NewChat from "../chat/NewChat.js";
import ChatInterface from "../chat/ChatInterface.js";
import InvokeAgent from "../chat/invokeAgent.js";
import store from "../redux/store.js";
import { fetchAgents } from "../redux/actions/global.action.js";
import { ActionsFlashIcon, arrowCirlceUpIcon, attachmentIcon, CheveronDownIcon, createCloseIcon, createDeleteIcon, createThumbsUpFilled, microphoneIcon, searchIcon, settingsIcon, Close, StopIcon, CurvedArrowForPreview, PlusIcon } from "../templateRenderer/icons-library.js";
import FileUpload from "../Attachments/fileUpload.js";
import { getAgentType, getFileExtension, hideElementImmediately, showElementImmediately, showElementDelayed, getIconsList, markdownToPlainText } from "../utils/helpers.js";
import { renderRecentFiles } from "./RenderRecentAttachments.js";
import { isMSEnv } from "../utils/helpers.js";

/**
 * ComposeBar - A standalone compose bar component in plain JavaScript
 * Can be embedded in any HTML page as a reusable component
 */
class ComposeBar {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        this.options = {
            placeholder: 'Ask or Search Anything...',
            showQuickActions: true,
            showNewButton: true,
            showStopButton: true,
            showCommonAgents: true,
            showAgentsDialog: true,
            ...options
        };

        this.input = '';
        this.contextChipData = null
        this.isLoading = false;
        this.isRecording = false;
        this.recognition = null;
        this.unsubscribe = null;
        this.fileUploaderUnsubscribe = null;
        this.selectedContextUnsubscribe = null;
        this.chatInterface = null;
        this.fileUploaderInterface = null;
        this.questions = {};
        this.commonAgents = [];
        this.showOverRideModal = false;
        this.pendingAgentInvocation = null;
        this.selectedAgent = null;
        this.attachments = [];
        this.quickActions = [];
        this.selectedCommonAgent = null;
        this.currentAnswerResponse = null;
        this.showBotComposeBarHeader = false;
        this.botEndConversationLoader = false;
        this.endConversationHandler = this.handleEndConversation.bind(this);
        this.detailsToggleHandler = this.handleDetailsToggle.bind(this);
        this.isMSEnv = isMSEnv();
        this.callbacks = {
            onSend: null,
            onNewChat: null,
            onStop: null,
            onQuickAction: null,
            onChange: null,
            onSpeechToText: null
        };
        this.init();
    }

    /**
     * Initialize the compose bar
     */
    async init() {
        if (!this.container) {
            throw new Error('ComposeBar container not found');
        }

        // Initialize chat interface
        try {
            this.chatInterface = ChatInterface();
            // Default options for chat interface
            this.chatInterface.options({ contentStreaming: true });

            // Subscribe to updates to toggle loading and update quick actions
            if (typeof this.chatInterface.subscribe === 'function') {
                this.unsubscribe = this.chatInterface.subscribe((questions, searchResponse, moreAvailable, errorStates, quickActions) => {
                    // Toggle loading state based on async status
                    const isLoading = searchResponse?.status === 'loading';
                    if (Object.values(questions)?.some(question => question?.loading)) {
                        this.currentAnswerResponse = null;
                    } else {
                        this.currentAnswerResponse = searchResponse?.data;
                    }
                    this.setLoading(!!isLoading);
                    if (Object.keys(questions).length > 0) {
                        this.questions = questions;
                        // this.showBotComposeBarHeader = Object.values(questions)?.find(question => question?.status === 'threadRunning');
                        // if(this.showBotComposeBarHeader){
                        //     console.log("showBotComposeBarHeader", this.showBotComposeBarHeader);
                        //     this.placeholder = `Chat with ${this.showBotComposeBarHeader?.context?.sources?.[0]?.name || this.showBotComposeBarHeader?.sources?.[0]?.title}`;


                        //     const botWrapper = this.container.querySelector('.composebar-bot-input-wrapper');
                        //     if (botWrapper) {
                        //         showElementDelayed(botWrapper, 100, 'block', true);
                        //         // Update content after the delay
                        //         setTimeout(() => {
                        //             this.updateBotHeaderContent(); 
                        //             this.updatePlaceholder();
                        //         }, 100);
                        //     }

                        // }else{
                        //     console.log("no threaded conversations available - hide bot wrapper");    
                        //     this.input = '';                        

                        //     this.botEndConversationLoader = false;
                        //     const botWrapper = this.container.querySelector('.composebar-bot-input-wrapper');
                        //     if (botWrapper) {
                        //         hideElementImmediately(botWrapper, { enableLogging: true });
                        //     }
                        //     this.placeholder = 'Ask or Search Anything...';
                        //     this.updatePlaceholder(); 
                        // }
                    } else {
                        /*clean up block */
                        const ifBotHeaderPresent = this.container.querySelector('.composebar-bot-input-wrapper');
                        if (ifBotHeaderPresent) {
                            hideElementImmediately(ifBotHeaderPresent, { enableLogging: true });
                        }
                        setTimeout(() => {
                            // if (this.selectedAgent) {
                            //     this.handleRemoveSelectedContext();
                            // }
                            this.placeholder = 'Ask or Search Anything...';
                            this.updatePlaceholder();
                            this.botEndConversationLoader = false;
                        }, 0);
                        this.questions = {};
                    }
                });
            }
        } catch (e) {
            console.warn('ChatInterface initialization failed:', e);
        }

        // Initialize file uploader     
        try {
            this.fileUploaderInterface = FileUpload();
            this.fileUploaderUnsubscribe = this.fileUploaderInterface.subscribe((sources, sessionId, quickActions, error, apiResp) => {
                console.log("fileUploaderInterface subscribe", sources, sessionId, quickActions, error, apiResp);
                if (sources) {
                    try {
                        // Get selectedContext from store to check if context is actually set
                        const state = store.getState()?.global;
                        const selectedContext = state?.selectedContext?.data;
                        
                        // Only show attachment pills when context is actually set (matching Kora-React behavior)
                        // In Kora-React, attachment pills are only shown when selectedContext?.sources?.length >= 1
                        const hasContextSet = selectedContext?.sources?.length >= 1;
                        
                        // Filter files: only show attachments that are actually set as context
                        // Don't show items that are only loading (not yet set as context)
                        let filesOnly = [];
                        if (hasContextSet && selectedContext?.sources) {
                            // Only show attachments that exist in selectedContext
                            filesOnly = Array.isArray(sources)
                                ? sources.filter(source => {
                                    if (source.type === "attachment") {
                                        // Check if this source exists in selectedContext
                                        const isInContext = selectedContext.sources.some(ctxSource => 
                                            ctxSource?.docId === source?.docId || 
                                            ctxSource?.uID === source?.uID ||
                                            ctxSource?.componentId === source?.componentId ||
                                            (ctxSource?.source === "attachment" && ctxSource?.title === source?.title)
                                        );
                                        return isInContext;
                                    }
                                    return false;
                                })
                                : [];
                        }
                        // If no context is set, don't show any attachment pills (even if loading)
                        // The loader should only appear temporarily during upload, and disappear if context isn't set
                        
                        this.attachments = filesOnly;
                        this.quickActions = quickActions || [];
                        // Only render attachments if context is set
                        // Match Kora-React: only show when selectedContext?.sources?.length >= 1
                        if (hasContextSet && this.attachments?.length > 0) {
                            this.renderAttachments();
                        } else {
                            // Clear attachments if no context is set
                            const attachmentsContainer = this.container.querySelector('[data-eva-attachments]');
                            if (attachmentsContainer) {
                                attachmentsContainer.innerHTML = '';
                                const inputContainer = attachmentsContainer.closest('.eva-input-container');
                                if (inputContainer) {
                                    inputContainer.classList.remove('file-uploaded');
                                }
                            }
                        }
                        
                        // Handle context chip data (for non-attachment sources)
                        if (!hasContextSet) {
                            if (sources?.length > 0) {
                                /*check whether it is an agent */
                                if (sources?.[0]?.isAgent) {
                                    this.selectedAgent = sources?.[0];
                                    this.contextChipData = sources?.[0];
                                } else {
                                    this.contextChipData = sources?.[0];
                                    /*check whether it is an answer of gptForm */
                                }
                            } else {
                                this.contextChipData = null;
                            }
                        }                        
                        if (this.contextChipData) {                            
                            setTimeout(() => {
                                const contextChipOnComposebarDiv = this.container.querySelector('.composebar-bot-input-wrapper');
                                if (contextChipOnComposebarDiv) {
                                    showElementDelayed(contextChipOnComposebarDiv, 100, 'block', true);
                                    // Update content after the delay
                                    setTimeout(() => {
                                        this.updateBotHeaderContent(this.contextChipData);
                                        this.updatePlaceholder();
                                    }, 0);
                                }
                            }, 100);
                            // this.renderContextChipInComposeBar();
                        }
                        this.renderQuickReplies();
                    } catch (err) {
                        console.warn('Failed processing file upload subscribe payload:', err);
                    }
                }else{                                  
                    this.contextChipData = null;
                }

            });
        } catch (e) {
            console.warn('FileUpload init failed:', e);
        }

        // Subscribe to selectedContext changes in Redux store
        // This ensures the context chip updates when selectedContext changes (e.g., after API success)
        this.selectedContextUnsubscribe = store.subscribe(() => {
            const state = store.getState()?.global;
            const selectedContext = state?.selectedContext?.data;
            
            // Only update if selectedContext has sources (context is set)
            if (selectedContext?.sources?.length > 0) {
                // Get the source to pass to updateBotHeaderContent
                const source = selectedContext?.sources?.[0];
                // Update the context chip display
                setTimeout(() => {
                    this.updateBotHeaderContent(source);
                }, 0);
            } else if (!selectedContext || !selectedContext?.sources?.length) {
                // Clear context chip if no context is set
                const composeBarWrapperDiv = this.container.querySelector('.composebar-bot-input-wrapper');
                const answerContextChipContainer = this.container.querySelector('.response-as-context-truncated-text');
                if (composeBarWrapperDiv) {
                    hideElementImmediately(composeBarWrapperDiv);
                }
                if (answerContextChipContainer) {
                    hideElementImmediately(answerContextChipContainer);
                }
            }
        });

        this.initSpeechRecognition();
        await this.getAgents();
        this.setCommonAgents();
        this.render();
        this.renderCommonAgents();
        this.renderAttachments(); // Render any initial attachments
        this.renderQuickReplies(); // Render any initial quick replies
        this.attachEventListeners();
        this.updateMicrophoneButton(); // Set initial button state
    }

    setCommonAgents() {
        const selectedContext = store.getState()?.global?.selectedContext;

        if (Object.keys(selectedContext).length > 0) {
            this.commonAgents = [];
        } else {
            try {
                const state = store.getState();
                /*if disabled is true then omit that agent from the list*/
                const commonAgents = state?.global?.allAgents?.data?.commonAgents?.filter(agent => !agent.disabled) || [];

                // Hide common agents if an agent is selected
                if (this.selectedAgent) {
                    this.commonAgents = [];
                } else {
                    this.commonAgents = commonAgents;
                }
            } catch (e) {
                console.error('Error setting common agents inside compose bar:', e);
            }
        }
        return;

    }

    /*need to render the common agents list, and on click of it invoke setAgentContext of ChatInterface*/
    renderCommonAgents() {
        /*make composebarcontextcontainer hidden */
        const composebarContextChipContainer = this.container.querySelector('.composebar-context-container');
        if (composebarContextChipContainer) {
            hideElementImmediately(composebarContextChipContainer);
        }
        /*make commonagentscontainer visible */
        const commonAgentsContainerDiv = this.container.querySelector('.common-agents-container');
        if (commonAgentsContainerDiv) {
            showElementImmediately(commonAgentsContainerDiv, 'flex');
        }

        // Only render in dialog now
        this.updateCommonAgentsInDialog();
    }

    // renderContextChipInComposeBar() {
    //     const commonAgentsContainer = this.container.querySelector('.common-agents-container');
    //     if (commonAgentsContainer) {
    //         hideElementImmediately(commonAgentsContainer);
    //     }
    //     const composebarContextChipContainer = this.container.querySelector('.composebar-context-container');
    //     if (!composebarContextChipContainer) return;
    //     showElementImmediately(composebarContextChipContainer, 'flex');
    //     /*innerHtml should display the selected agent name and close button */
    //     composebarContextChipContainer.innerHTML = `
    //         <button class="context-chip-button">
    //             <div class="composebar-context-agent-name-container ${this.selectedAgent?.agentType === "agenticApp" ? 'agenticApp' : ''}">
    //                 <div class="composebar-context-agent-icon">
    //                 ${this.selectedAgent?.agentType === "agenticApp" ? `${getIconsList({}, this.selectedAgent?.agenticAppIcons)}` : `<img src="${this.selectedAgent?.icon}" alt="agent-icon" width="16" height="16">`}                        
    //                 </div>
    //                 <div class="composebar-context-agent-name" title="${this.selectedAgent?.name}">${this.selectedAgent?.name}</div>
    //             </div>
    //             <div class="composebar-context-close-button">${createCloseIcon({ size: 10, color: "#667085" })}</div>                
    //         </button>
    //     `;

    //     /*change the placeholder to the selected agent name */
    //     this.placeholder = `Interact with ${this.selectedAgent?.name}`;
    //     this.updatePlaceholder();

    //     const removeSelectedContextInComposeBarBtn = this.container.querySelector('.composebar-context-close-button');
    //     if (removeSelectedContextInComposeBarBtn) {
    //         removeSelectedContextInComposeBarBtn.addEventListener('click', (e) => this.handleRemoveSelectedContext());
    //     }
    // }

    renderAttachments() {
        const attachmentsContainer = this.container.querySelector('[data-eva-attachments]');

        if (!attachmentsContainer) {
            return;
        }

        const escapeHtml = (str) => String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        const attachmentHtml = this.attachments?.map(file => {
            const name = file?.title || file?.fileName || file?.mediaName || 'Attachment';
            const uid = file?.uID || file?.componentId || file?.docId || name;
            const fileExtension = getFileExtension(name);

            return `<div class="eva-attachment-pill" data-attach-uid="${escapeHtml(uid)}" title="${escapeHtml(name)}">
                <div class="attachment-icon"><img src="images/${fileExtension}.png" alt=''/></div>
                <div class="eva-attachment-name">${escapeHtml(name)}</div>
                ${file?.loading ? `<div class="waloader"></div>` :
                    `<button type="button" class="eva-attachment-remove" data-remove-uid="${escapeHtml(uid)}" aria-label="Remove">&times;</button>`}
            </div>`;
        }).join('');

        attachmentsContainer.innerHTML = attachmentHtml;

        // Toggle class on eva-input-container when file(s) are uploaded
        const inputContainer = attachmentsContainer.closest('.eva-input-container');
        if (inputContainer) {
            if (this.attachments?.length > 0) {
                inputContainer.classList.add('file-uploaded');
            } else {
                inputContainer.classList.remove('file-uploaded');
            }
        }

        // Reattach event listeners for remove buttons
        this.attachAttachmentEventListeners();
    }

    renderQuickReplies() {
        const quickRepliesContainer = this.container.querySelector('[data-eva-quick-replies]');
        if (!quickRepliesContainer) {
            return;
        }

        const quickRepliesHtml = this.quickActions.map(action => {
            return `<div class="eva-quick-reply-chip" data-action-id="${action.id}">${action.label}</div>`;
        }).join('');

        quickRepliesContainer.innerHTML = quickRepliesHtml;
        // Attach event listeners for quick reply clicks
        this.attachQuickReplyEventListeners();
    }

    attachQuickReplyEventListeners() {
        const quickReplyChips = this.container.querySelectorAll('.eva-quick-reply-chip');
        quickReplyChips.forEach(chip => {
            chip.addEventListener('click', (e) => this.handleQuickAction(e));
        });
    }

    attachAttachmentEventListeners() {
        // Attachment remove button events
        const removeButtons = this.container.querySelectorAll('.eva-attachment-remove');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const uid = btn.getAttribute('data-remove-uid');
                this.removeAttachmentByUid(uid);
                e.stopPropagation();
                e.preventDefault();
            });
        });
    }

    /**
     * Initialize speech recognition
     */
    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();

            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                console.log('Speech recognition started');
            };

            this.recognition.onresult = (event) => {
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    }
                }

                // Update textarea with final transcript
                if (finalTranscript) {
                    const currentValue = this.getValue();
                    const newValue = currentValue + (currentValue ? ' ' : '') + finalTranscript;
                    this.setValue(newValue);
                }
            };

            this.recognition.onend = () => {
                this.isRecording = false;
                this.updateSpeechButton();
            };

            this.recognition.onerror = (event) => {
                this.isRecording = false;
                this.updateSpeechButton();
                console.error('Speech recognition error:', event.error);
            };
        } else {
            console.warn('Speech recognition not supported in this browser');
        }
    }

    /**
     * Update the bot header content dynamically
     */
    /**
     * Render response selected as context (similar to responseSelectedAsContext in Kora-React)
     * Shows question text and answer preview for GPT agent responses
     */
    responseSelectedAsContext(source) {
        const state = store.getState()?.global;
        const selectedContext = state?.selectedContext?.data;
        const questions = state?.questions || this.questions;
        
        // Find the response by searching through questions for matching messageId
        let response = null;
        if (selectedContext?.messageId && questions) {
            response = Object.values(questions).find(
                (q) => q.messageId === selectedContext.messageId,
            );
        }

        let responseText = response?.answer || '';
        // Convert markdown to plain text
        const plainText = markdownToPlainText(responseText);

        // use the full plain text for CSS line clamping
        const preview = plainText.trim();

        // Get the question text
        const questionText = response?.question || '';

        const answerContextChipContainer = this.container.querySelector('.response-as-context-truncated-text');
        const answerContextChipText = this.container.querySelector('.response-as-context-question-text') || 
                                      this.container.querySelector('.answer-context-chip-text');
        
        if (answerContextChipContainer && answerContextChipText) {
            // Set the question and answer preview (matching Kora-React structure)
            if (questionText) {
                answerContextChipText.innerHTML = `<strong>${this.escapeHtml(questionText)} -&gt; </strong>${this.escapeHtml(preview)}`;
            } else {
                answerContextChipText.innerText = preview;
            }
        }

        return answerContextChipContainer;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateBotHeaderContent(contextChipData) {
        console.log("contextChipData in updateBotHeaderContent", contextChipData);
        const composeBarWrapperDiv = this.container.querySelector('.composebar-bot-input-wrapper');  
        if (!composeBarWrapperDiv) return;
        const botInputHeaderDiv = composeBarWrapperDiv.querySelector('.bot-input-header'); 
        const answerContextChipContainer = this.container.querySelector('.response-as-context-truncated-text');
        if(!contextChipData){            
            hideElementImmediately(composeBarWrapperDiv);
            return;
        }

        // Get selectedContext from store to check for setViaMenuOptions/setViaGptAgent
        const state = store.getState()?.global;
        const selectedContext = state?.selectedContext?.data;
        const currentQuestion = state?.currentQuestion;
        const questions = state?.questions || this.questions;
        
        // Get source from selectedContext (matching Kora-React: source = selectedContext?.sources?.[0])
        // If selectedContext doesn't have sources, fall back to contextChipData
        const source = selectedContext?.sources?.[0] || contextChipData;
        
        // Check if source is an attachment (matching Kora-React: const attachment = source?.source === "attachment")
        const isAttachment = source?.source === "attachment" || source?.type === "attachment";
        
        // Check for mcpAgent from currentQuestion (matching Kora-React: questions?.[currentQuestion]?.context?.agentType === "mcpAgent")
        const isMcpAgent = currentQuestion && questions?.[currentQuestion]?.context?.agentType === "mcpAgent";
        
        // Check if this is a GPT agent response selected as context
        // Matching Kora-React exactly: (source?.templateType === 'gpt_form_template' || source?.agentType === 'gptAgent' || isMcpAgent) && (selectedContext?.setViaMenuOptions || selectedContext?.setViaGptAgent)
        // This check comes FIRST in Kora-React's singleChipRenderer
        // IMPORTANT: Only show response-as-context-truncated-text for GPT agent responses, NOT for attachments
        const isGptAgentResponse = !isAttachment && 
                                    (source?.templateType === 'gpt_form_template' || 
                                     source?.agentType === 'gptAgent' || 
                                     isMcpAgent) &&
                                    (selectedContext?.setViaMenuOptions || selectedContext?.setViaGptAgent);
        
        // Check if should return null (matching Kora-React conditions from singleChipRenderer)
        // If selectedContext?.type === "commonAgent" || selectedContext?.sources?.[0]?.isSupervisor || selectedContext?.type === "agent" || props?.from === "testAgent"
        // In ComposeBar context, we don't have props?.from === "testAgent", so we check the others
        // This check comes SECOND in Kora-React's singleChipRenderer (else if)
        const shouldReturnNull = selectedContext?.type === "commonAgent" || 
                                 selectedContext?.sources?.[0]?.isSupervisor || 
                                 selectedContext?.type === "agent";
        
        // If GPT agent response, show response preview (matching Kora-React: return responseSelectedAsContext(source))
        if (isGptAgentResponse) {
            if (botInputHeaderDiv) {
                hideElementImmediately(botInputHeaderDiv);
            }
            // Show the wrapper first so the context chip container is visible
            showElementImmediately(composeBarWrapperDiv, 'block');
            
            if(answerContextChipContainer){
                // Show the container (matching Kora-React)
                showElementImmediately(answerContextChipContainer, 'flex');
                // Render response selected as context
                this.responseSelectedAsContext(source);
                
                // Attach close button handler (matching Kora-React: renderCloseBtn)
                const answerContextCloseBtn = answerContextChipContainer.querySelector('.srCicon');
                if (answerContextCloseBtn) {
                    if (!answerContextCloseBtn.eventListenerAdded) {
                        answerContextCloseBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (this.fileUploaderInterface && typeof this.fileUploaderInterface.clearContext === 'function') {
                                this.fileUploaderInterface.clearContext({});
                            }
                            hideElementImmediately(answerContextChipContainer);
                            // Also hide the wrapper when context is cleared
                            hideElementImmediately(composeBarWrapperDiv);
                        });
                        answerContextCloseBtn.eventListenerAdded = true;
                    }
                }
            }
            return; // Early return after showing GPT agent response preview
        }
        
        // If should return null (commonAgent, supervisor, or agent type), don't show anything
        // Matching Kora-React: else if(...) return null
        if (shouldReturnNull) {
            if (botInputHeaderDiv) {
                hideElementImmediately(botInputHeaderDiv);
            }
            if (answerContextChipContainer) {
                hideElementImmediately(answerContextChipContainer);
            }
            if (composeBarWrapperDiv) {
                hideElementImmediately(composeBarWrapperDiv);
            }
            return;
        }

        // If it's an attachment, hide response-as-context-truncated-text (attachments use eva-attachment-pill instead)
        // Matching Kora-React: attachments show in chipCard with 'attachment' class, not in response-as-context-truncated-text
        if (isAttachment) {
            if (answerContextChipContainer) {
                hideElementImmediately(answerContextChipContainer);
            }
            // For attachments, we don't show the response-as-context-truncated-text
            // The attachment pill (eva-attachment-pill) is handled separately
            // Just hide the wrapper if no other context chip is needed
            if (composeBarWrapperDiv && !botInputHeaderDiv) {
                hideElementImmediately(composeBarWrapperDiv);
            }
            return;
        }

        /*check whether contextChipData is holding agent or answer */
        const iconElement = composeBarWrapperDiv.querySelector('.icon-image img');
        const nameElement = composeBarWrapperDiv.querySelector('.bot-input-header-left-text');
        
        if (contextChipData?.isAgent) {  
            if(botInputHeaderDiv){
                showElementImmediately(botInputHeaderDiv, 'flex');
            }          
            if(answerContextChipContainer){
                hideElementImmediately(answerContextChipContainer);
            }                       
            if (iconElement) {
                const agentIcon = contextChipData?.icon;
                if (agentIcon) {
                    iconElement.src = agentIcon;
                }
            }

            if (nameElement) {
                const agentName = contextChipData?.name;
                if (agentName) {
                    nameElement.textContent = agentName;
                }
            }
        } else {
            // For non-agent contexts, check if it's an attachment first
            // Attachments should NOT show response-as-context-truncated-text (they use eva-attachment-pill instead)
            if (isAttachment) {
                // Hide response-as-context-truncated-text for attachments
                if (answerContextChipContainer) {
                    hideElementImmediately(answerContextChipContainer);
                }
                // Hide the wrapper for attachments (attachments are shown via eva-attachment-pill)
                if (composeBarWrapperDiv) {
                    hideElementImmediately(composeBarWrapperDiv);
                }
                if (botInputHeaderDiv) {
                    hideElementImmediately(botInputHeaderDiv);
                }
                return; // Early return for attachments
            }
            
            // For other non-agent contexts (not attachments), show the answer context chip
            if (botInputHeaderDiv) {
                hideElementImmediately(botInputHeaderDiv);
            }                        
            if(answerContextChipContainer){
                showElementImmediately(answerContextChipContainer, 'flex');
                // Hide the bot input wrapper when response context is shown
                hideElementImmediately(composeBarWrapperDiv);
                    /*set answer inside response-as-context-truncated-text */
                    const answerContextChipText = this.container.querySelector('.response-as-context-question-text') || 
                                                  this.container.querySelector('.answer-context-chip-text');  
                    const currentQuestionsLength = Object.values(this.questions)?.length;
                    const currentAnswer = Object.values(this.questions)?.[currentQuestionsLength - 1]?.answer || 'Answer Context';
                    if (answerContextChipText) {
                        answerContextChipText.innerText = markdownToPlainText(currentAnswer);
                    }
                    // answerContextChipText.innerHTML = this.answerContextHTML(markdownToPlainText(currentAnswer));
                
            }            
            // composeBarWrapperDiv.innerHTML = this.answerContextHTML(markdownToPlainText(currentAnswer));
            const answerContextCloseBtn = this.container.querySelector('.srCicon');
            if (answerContextCloseBtn) {
                if (!answerContextCloseBtn.eventListenerAdded) {
                    answerContextCloseBtn.addEventListener('click', () => {
                        this.fileUploaderInterface.clearContext({});
                        hideElementImmediately(answerContextChipContainer);
                        // Hide the bot input wrapper as well when response context is closed
                        hideElementImmediately(composeBarWrapperDiv);
                    });
                    answerContextCloseBtn.eventListenerAdded = true;
                }
            }

            // if (iconElement) {
            //     iconElement.src = CurvedArrowForPreview({ size: 12 });
            // }
            // if (nameElement) {
            //     nameElement.textContent = markdownToPlainText(currentAnswer);
            // }
        }

        const endConversationBtn = composeBarWrapperDiv.querySelector('.bot-input-header-right-text');
        const agentDetailsBtn = composeBarWrapperDiv.querySelector('.details-section');
        
        if (!agentDetailsBtn) return;


        if (endConversationBtn) {
            endConversationBtn.innerHTML = this.botEndConversationLoader ? '<div class="waloader"></div>' : `${createCloseIcon({ size: 10, color: "#667085" })}`;
            endConversationBtn.removeEventListener('click', this.endConversationHandler);
            endConversationBtn.addEventListener('click', this.endConversationHandler);
        }

    }

    updatePlaceholder() {
        const textarea = this.container.querySelector('[data-eva-input]');
        if (textarea) {
            textarea.placeholder = this.placeholder || this.options.placeholder;
        }
    }

    answerContextHTML(answerContext) {
        return `<div class="response-as-context-truncated-text">
            <div class='arrow-down-icon'>${CurvedArrowForPreview({ size: 12 })}</div>
            <button class="answer-context-chip-close-button">${createCloseIcon({ size: 10, color: "#667085" })}</button>
            <div class="answer-context-chip-text"></div>
        </div>`
    }


    getSendButtonIcon() {
        const env = store.getState()?.global?.env;
        if (env === 'MS') {
            return `<img src="images/MS-Icons/send-ms.svg" alt="Send" width="20" height="20" />`;
        }
        return arrowCirlceUpIcon({ size: 20, color: "#101828" });
    }


    getAttachmentButtonIcon() {
        const env = store.getState()?.global?.env;
        if (env === 'MS') {
            return `<img src="images/MS-Icons/attachment-ms.svg" alt="Attach" width="20" height="20" />`;
        }
        return attachmentIcon({ size: 16, color: "#0F0F0F" });
    }

    handleEndConversation() {
        if (this.selectedAgent?.agentType === 'botAgent') {
            this.botEndConversationLoader = true;

            const endConversationBtn = this.container.querySelector('.bot-input-header-right-text');
            if (endConversationBtn) {
                endConversationBtn.innerHTML = '<div class="waloader"></div>';
            }

            this.chatInterface.stopBotAnswer();
        } else {
            this.fileUploaderInterface.clearContext();
        }
    }

    /**
     * Handle details toggle functionality
     */
    handleDetailsToggle() {
        const composeBarWrapper = this.container.querySelector('.composebar-bot-input-wrapper');
        if (!composeBarWrapper) return;

        const detailsContent = composeBarWrapper.querySelector('.details-content');
        const moreDetailsText = composeBarWrapper.querySelector('.more-details-text');
        
        if (!detailsContent || !moreDetailsText) return;

        // Check if details are currently visible
        const isDetailsVisible = detailsContent.style.display !== 'none';
        
        if (isDetailsVisible) {
            // Currently showing details, user wants to hide them
            detailsContent.style.display = 'none';
            moreDetailsText.textContent = 'Show Details';
            composeBarWrapper.classList.add('details-hidden');
            // Don't hide wrapper - keep it visible so user can access "Show Details" button
        } else {
            // Currently hiding details, user wants to show them
            detailsContent.style.display = 'block';
            moreDetailsText.textContent = 'Hide Details';
            composeBarWrapper.classList.remove('details-hidden');
            // Ensure wrapper is visible when showing details
            showElementImmediately(composeBarWrapper, 'block');
        }
    }

    /**
     * Set up details toggle functionality
     */
    setupDetailsToggle() {
        const composeBarWrapper = this.container.querySelector('.composebar-bot-input-wrapper');
        if (!composeBarWrapper) return;

        const infoDetailsDiv = composeBarWrapper.querySelector('.info-details');
        if (infoDetailsDiv) {
            infoDetailsDiv.removeEventListener('click', this.detailsToggleHandler);
            infoDetailsDiv.addEventListener('click', this.detailsToggleHandler);
            
            // Ensure details content starts hidden and add corresponding class
            const detailsContent = composeBarWrapper.querySelector('.details-content');
            if (detailsContent) {
                detailsContent.style.display = 'none';
                composeBarWrapper.classList.add('details-hidden');
                // Note: Don't hide wrapper initially - it needs to be visible for user to access "Show Details"
            }
        }
    }

    /**
     * Render the compose bar HTML
     */
    render() {
        const escapeHtml = (str) => String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');


        this.container.innerHTML = `
            <div class="ComposeBarContainer new-layout">
                <div class="eva-composebar-parent">     
                    <div class="eva-quick-reply-container" data-eva-quick-replies></div>                           
                    ${this.showOverRideModal ? `
                    <div class='overridingMsgModal'>
                        <div class='headerGroup'>
                            <div class="_heading">Remove Attachments</div>
                            <div class="msg">The required agent conflicts with the attached context. Do you want to remove the context and set the agent?</div>
                        </div>

                        <div class="_content">
                            <button class="kr-primary-btn-black btn-sm" label='Remove'>Remove</button>
                            <span class="closeBtn">${createCloseIcon({ size: 14, color: "#667085" })}</span>                        
                        </div>
                    </div>` : ''}

                    <div class="eva-composebar-area">
                        <div class="composebar-bot-input-wrapper" style="display: none;">
                            <div class="bot-input-header">
                                <div class="bot-input-header-left">
                                    <div class="bot-input-header-left-icon">                                        
                                        <span class="icon-image"><img src="" alt="bot-icon" width="24px" height="24px"></span>                            
                                    </div>  
                                    <div class="bot-input-header-left-text">                                                                                
                                    </div>
                                </div>
                                <div class="bot-input-header-right">
                                    <div class="info-details"><span class="more-details-text">Show Details</span></div>                                    
                                    <button class="details-section" title="Show Details">
                                        <div class="bot-input-header-right-text">
                                            
                                        </div>
                                    </button>
                                </div>
                            </div> 
                            <div class="details-content"></div>
                                              
                        </div>                        
                        
                        <div class="eva-input-container${this.attachments?.length ? ' file-uploaded' : ''}">
                            <div class="response-as-context-truncated-text" style="display: none;">
                                ${CurvedArrowForPreview({ size: 12, color: "#101828" })}
                                <div class="answer-context-chip-text response-as-context-question-text"></div>
                                <button class="srCicon">${createCloseIcon({ size: 10, color: "#667085" })}</button>
                            </div>         
                            <div class="eva-attachments-container" data-eva-attachments></div>
                            <div class='left-actions'>
                                <div class='common-agents-container'>
                                    <button class="agents-action-item" data-eva-agents-action data-eva-open-dialog>
                                        ${this.isMSEnv ? `<img src="images/MS-Icons/flash-ms.svg" alt="Agents" width="18" height="18" />` : PlusIcon({ size: 14, color: "#0F0F0F" })}
                                        <!-- ${this.isMSEnv ? CheveronDownIcon({ size: 14, color: "#1773b0" }) : CheveronDownIcon({ size: 14, color: "#0F0F0F" })} -->
                                    </button>
                                </div>
                                <div class="composebar-context-container" style="display: none;"></div>
                            </div>
                            <div class="eva-compose-textarea-container">
                                <textarea 
                                class="eva-compose-textarea" 
                                placeholder="${this.placeholder || this.options.placeholder}"
                                rows="1"
                                data-eva-input
                                ></textarea>
                            </div>
                            <div class="right-actions">
                                <sl-tooltip>
                                    <div slot="content" class="caTooltips">5 attachments, max 10MB each. <br/>PDF, XLS, DOC, CSV, TXT formats.</div>
                                    <button class="eva-input-action-btn attachment-btn" data-eva-attachment>
                                        ${this.getAttachmentButtonIcon()}
                                    </button>
                                </sl-tooltip>
                                ${!this.isMSEnv ? `<sl-tooltip>
                                    <div slot="content" class="caTooltips">Search using voice</div>
                                    <button class="eva-input-action-btn voice-btn" data-eva-speech>
                                        ${microphoneIcon({ size: 16, color: "#0F0F0F" })}
                                    </button>
                                </sl-tooltip>` : ''}
                                <button class="eva-input-action-btn send-btn" data-eva-send title="Send">
                                    ${this.getSendButtonIcon()}
                                </button>
                            </div>
                            
                            <!-- Hidden file input for attachment functionality -->
                            <input type="file" style="display: none;" data-eva-file-input multiple accept="*/*" />
                            
                        </div>
                    </div>
                                    
                    <sl-dialog data-eva-dialog class="eva-agents-dialog">
                        <div class="agentsTabWrapper">
                            <div class="agentsModalHeader">
                                <div class="modalTitle">
                                    Select Agent
                                </div>
                                <div class="modalClose" data-eva-dialog-close>
                                    ${createCloseIcon({ size: 12, color: "#667085" })}
                                </div>
                            </div>
                        <div class="eva-common-agents-dialog" data-eva-common-agents-dialog></div>
                        <div class="composebarFilter">
                            <div class="agentsTabWrapper">
                                <div class="agentsHeader">
                                    <div class="agentsTabHeadingWrapper">
                                        <div class="agentsTabHeading active">Agents</div>
                                        <div class="agentsTabHeading">Flows</div>
                                    </div>
                                    <div class="agentSearch">
                                        <div class="search-box">
                                            ${searchIcon({ size: 14, color: "#667085" })}
                                            <input 
                                            placeholder="Search" 
                                            class="agentSearchBar" 
                                            autocomplete="off" 
                                            value="" 
                                            data-eva-agent-search-input-box                                            
                                            />
                                        </div>
                                        <button class="agentSettings" style="display: none;">${settingsIcon({ size: 13, color: "#667085" })}</button>
                                    </div>
                                </div>
                            </div>
                            <div class="eva-agents-container" data-eva-agents-content>
                                <ul class="eva-agents-list" data-eva-all-agents></ul>
                            </div>
                            <div class="eva-flows-container" data-eva-flows-content style="display: none;">
                                <ul class="eva-flows-list" data-eva-all-flows></ul>
                            </div>
                        </div>     
                        </div>                   
                    </sl-dialog>
                    
                    <sl-dialog label="Attachments" data-eva-attachment-dialog class="eva-attachments-dialog">
                        <div class="composebarFilter">
                            <div class="attachmentsTabWrapper">
                                <div class="attachmentsHeader">
                                    <div class="attachmentsTitle">
                                        Attachments
                                    </div> 
                                    <div class="closeBtn" data-eva-attachment-dialog-close>${createCloseIcon({ size: 12, color: "#667085" })}</div>                                   
                                </div>
                                <div class="attachments-top-container">
                                    <div class="container-left">
                                        <div class="title">Upload from computer</div>
                                        <div class="description">Upload upto 5 files, max 10MB each: PDF, XLS, DOC, CSV, TXT formats</div>
                                    </div>
                                    <div class="container-right">
                                        <button class="recent-files-container-upload-file-btn" upload-file-btn>
                                            Upload
                                        </button>                                        
                                    </div>
                                </div>
                                <div class="recent-title">Recents</div>
                            </div>
                            <div class="eva-recent-attachments-container" data-eva-recent-attachments-content>
                                <ul class="eva-recent-attachments-list" data-eva-recent-files></ul>
                            </div>                            
                        </div>                        
                    </sl-dialog>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const textarea = this.container.querySelector('[data-eva-input]');
        const sendBtn = this.container.querySelector('[data-eva-send]');
        const newBtn = this.container.querySelector('[data-eva-new]');
        const stopBtn = this.container.querySelector('[data-eva-stop]');
        const attachmentBtn = this.container.querySelector('[data-eva-attachment]');
        const speechBtn = this.container.querySelector('[data-eva-speech]');
        const quickActionChips = this.container.querySelectorAll('.eva-quick-reply-chip');
        const openDialogBtn = this.container.querySelector('[data-eva-open-dialog]');
        const dialog = this.container.querySelector('[data-eva-dialog]');
        const attachmentDialog = this.container.querySelector('[data-eva-attachment-dialog]');
        const fileInput = this.container.querySelector('[data-eva-file-input]');
        const agentSearchInputBox = this.container.querySelector('[data-eva-agent-search-input-box]');
        const tabHeadings = this.container.querySelectorAll('.agentsTabHeading');
        const uploadFileBtn = this.container.querySelector('[upload-file-btn]'); //this event is for the upload button present in container for uploading files
        // Textarea events
        if (textarea) {
            textarea.addEventListener('input', (e) => this.handleInputChange(e));
            textarea.addEventListener('keydown', (e) => this.handleKeyDown(e));
            textarea.addEventListener('paste', (e) => this.handlePaste(e));
        }
        if (agentSearchInputBox) {
            agentSearchInputBox.addEventListener('input', (e) => this.handleAgentSearch(e));
        }


        // Button events
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                if (this.isLoading) {
                    this.handleStop();
                } else {
                    this.handleSend();
                }
            });
        }

        if (newBtn) {
            newBtn.addEventListener('click', () => this.handleNewChat());
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.handleStop());
        }

        if (openDialogBtn) {
            openDialogBtn.addEventListener('click', () => this.handleOpenDialog());
        }

        if (dialog) {
            const closeBtn = dialog.querySelector('[data-eva-dialog-close]');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.handleCloseDialog());
            }
        }

        if (attachmentDialog) {
            const closeBtn = attachmentDialog.querySelector('[data-eva-attachment-dialog-close]');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.handleCloseAttachmentDialog());
            }
        }


        // Attachment button event
        if (attachmentBtn) {
            attachmentBtn.addEventListener('click', () => this.handleAttachment());
        }

        if (uploadFileBtn) {
            uploadFileBtn.addEventListener('click', () => this.handleFileUpload());
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                try {
                    if (this.fileUploaderInterface && typeof this.fileUploaderInterface.uploadFile === 'function') {
                        this.fileUploaderInterface.uploadFile(e);
                    }
                }
                catch (e) {
                    console.error('Error uploading file:', e);
                }
                finally {
                    // reset so selecting the same file again still triggers change
                    /*once the file is uploaded we need to close the attachment dialog */
                    const attachmentDialog = this.container.querySelector('[data-eva-attachment-dialog]');
                    if (attachmentDialog) {
                        attachmentDialog.hide();
                    }
                    fileInput.value = '';
                }
            });
        }

        // Speech to text button event
        if (speechBtn) {
            speechBtn.addEventListener('click', () => this.handleSpeechToText());
        }

        // Override dialog button events
        const overrideDialog = this.container.querySelector('[data-eva-override-dialog]');
        if (overrideDialog) {
            const cancelBtn = overrideDialog.querySelector('[data-eva-override-cancel]');
            const confirmBtn = overrideDialog.querySelector('[data-eva-override-confirm]');

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.handleOverrideCancel());
            }

            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => this.handleOverrideConfirm());
            }
        }

        // Attachment remove button events
        const removeButtons = this.container.querySelectorAll('.eva-attachment-remove');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const uid = btn.getAttribute('data-remove-uid');
                this.removeAttachmentByUid(uid);
                e.stopPropagation();
                e.preventDefault();
            });
        });

        // Tab switching events
        if (tabHeadings) {
            tabHeadings.forEach(tab => {
                tab.addEventListener('click', (e) => this.handleTabSwitch(e));
            });
        }

        // Set up info details toggle functionality
        this.setupDetailsToggle();
    }

    handleRemoveSelectedContext() {
        if (this.fileUploaderInterface && typeof this.fileUploaderInterface.clearContext === 'function') {
            this.fileUploaderInterface.clearContext();
        }
        this.selectedAgent = null;
        this.setCommonAgents();
        this.renderCommonAgents();
        /*update the placeholder name to default */
        this.placeholder = this.options.placeholder;
        this.updatePlaceholder();
    }

    /**
     * Handle input change
     */
    handleInputChange(event) {
        this.input = event.target.value;
        if (this.quickActions?.length > 0) {
            this.quickActions = [];
            setTimeout(() => {
                this.renderQuickReplies();
            }, 0);
        }
        this.autoResize(event.target);
        this.updateMicrophoneButton();

        if (this.callbacks.onChange) {
            this.callbacks.onChange(this.input, event);
        }
    }

    /**
     * Handle tab switching between Agents and Flows
     */
    handleTabSwitch(event) {
        const clickedTab = event.target;
        const tabText = clickedTab.textContent.trim();

        // Get all tab headings
        const allTabs = this.container.querySelectorAll('.agentsTabHeading');

        // Remove active class from all tabs
        allTabs.forEach(tab => tab.classList.remove('active'));

        // Add active class to clicked tab
        clickedTab.classList.add('active');

        // Get content containers
        const agentsContainer = this.container.querySelector('[data-eva-agents-content]');
        const flowsContainer = this.container.querySelector('[data-eva-flows-content]');

        // Show/hide content based on selected tab
        if (tabText === 'Agents') {
            if (agentsContainer) agentsContainer.style.display = 'block';
            if (flowsContainer) flowsContainer.style.display = 'none';
        } else if (tabText === 'Flows') {
            if (agentsContainer) agentsContainer.style.display = 'none';
            if (flowsContainer) flowsContainer.style.display = 'block';

            // Render agenticFlows when Flows tab is selected
            this.renderFlows();
        }
    }

    /**
     * Render agenticFlows in the flows container
     */
    renderFlows() {
        const flowsListEl = this.container.querySelector('[data-eva-all-flows]');
        if (!flowsListEl) return;

        // Show loading state
        flowsListEl.innerHTML = `<li>Loading flows...</li>`;

        try {
            // Use the stored agenticFlows or get them from store if not available
            let agenticFlows = this.agenticFlows;

            if (!agenticFlows) {
                const state = store.getState();
                const allAgents = state?.global?.allAgents?.data?.agents || [];
                agenticFlows = allAgents.filter(agent => (agent?.type === "agenticApp" && agent?.enabled));
                this.agenticFlows = agenticFlows;
            }

            // Render agenticFlows using the same method as agents
            this.renderAgentsList(flowsListEl, agenticFlows, 'flows');

        } catch (e) {
            console.error('Error rendering flows:', e);
            flowsListEl.innerHTML = `<li>Failed to load flows</li>`;
        }
    }

    /**
     * Search and render filtered agenticFlows
     */
    searchAndRenderFlows(searchTerm = '') {
        const flowsListEl = this.container.querySelector('[data-eva-all-flows]');
        if (!flowsListEl) return;

        // Show loading state
        flowsListEl.innerHTML = `<li>Searching flows...</li>`;

        try {
            // Use the stored agenticFlows or get them from store if not available
            let agenticFlows = this.agenticFlows;

            if (!agenticFlows) {
                const state = store.getState();
                const allAgents = state?.global?.allAgents?.data?.agents || [];
                agenticFlows = allAgents.filter(agent => (agent?.type === "agenticApp" && agent?.enabled));
                this.agenticFlows = agenticFlows;
            }

            // Filter flows by search term if provided
            let filteredFlows = agenticFlows;
            if (searchTerm?.length > 0) {
                filteredFlows = agenticFlows.filter(flow =>
                    flow?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    flow?.description?.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            // Render filtered agenticFlows using the same method as agents
            this.renderAgentsList(flowsListEl, filteredFlows, 'flows');

        } catch (e) {
            console.error('Error searching flows:', e);
            flowsListEl.innerHTML = `<li>Failed to search flows</li>`;
        }
    }

    /**
     * Update microphone button based on input length
     */
    updateMicrophoneButton() {
        // Skip if MS env (mic button is hidden)
        if (this.isMSEnv) return;

        const micButton = this.container.querySelector('[data-eva-speech]');
        if (!micButton) {
            return;
        }



        if (this.input?.length > 0) {
            micButton.innerHTML = Close({ size: 12, color: "#0F0F0F" });
            micButton.title = "Clear input";
        } else {
            micButton.innerHTML = microphoneIcon({ size: 16, color: "#0F0F0F" });
            micButton.title = "Search using voice";
        }
    }

    /**
     * Handle key down events
     */
    handleKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.handleSend();
        }
    }

    /**
     * Handle paste events
     */
    handlePaste(event) {

        setTimeout(() => {
            this.autoResize(event.target);
        }, 0);
    }

    /**
     * Auto-resize textarea based on content
     */
    autoResize(textarea) {
        // Target the textarea with class "eva-compose-textarea" (rows='1', single line initially)
        const composeTextarea = this.container.querySelector('.eva-compose-textarea');
        if (!composeTextarea) return;
        
        // Get the input container to add class when textarea becomes multiline
        const inputContainer = this.container.querySelector('.eva-input-container');
        if (!inputContainer) return;
        
        // Temporarily remove the class to measure in base layout state
        // This prevents layout shift from affecting the measurement
        const hadMultilineClass = inputContainer.classList.contains('textarea-multiline');
        if (hadMultilineClass) {
            inputContainer.classList.remove('textarea-multiline');
            // Force a reflow to ensure layout has updated before measuring
            void inputContainer.offsetHeight;
        }
        
        // Measure scrollHeight in the base layout state (without multiline class)
        composeTextarea.style.height = 'auto';
        const scrollHeight = composeTextarea.scrollHeight;
        const newHeight = Math.min(scrollHeight, 150) + 'px';
        composeTextarea.style.height = newHeight;
        
        // Get the computed height after setting it
        const computedStyle = getComputedStyle(composeTextarea);
        const currentHeight = parseFloat(computedStyle.height);
        
        // Convert 1.5rem to pixels (1rem = root font size, typically 16px)
        const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const singleLineHeight = 1.5 * rootFontSize; // 1.5rem in pixels (single line height)
        
        // When single line goes to multiline, add class to eva-input-container
        if (currentHeight > singleLineHeight) {
            inputContainer.classList.add('textarea-multiline');
        } else {
            // Remove class when it reverts back to single line
            inputContainer.classList.remove('textarea-multiline');
        }
    }

    /**
     * Handle send action
     */
    handleSend() {
        if (!this.input.trim() || this.isLoading) return;

        // Default internal handling
        try {
            const currentQuestion = Object.values(this.questions)?.[Object.values(this.questions)?.length - 1];
            this.chatInterface.sendMessage(this.input.trim(), currentQuestion);
        } catch (e) {
            console.error('Error sending message from ComposeBar:', e);
        }

        if (this.callbacks.onSend) {
            this.callbacks.onSend(this.input.trim());
        }

        this.clearInput();
    }

    /**
     * Handle new chat action
     */
    handleNewChat() {
        NewChat();
    }

    /**
     * Handle stop action
     */
    handleStop() {
        // Default internal handling
        try {
            this.chatInterface.cancelMessageReqAction();
        } catch (e) {
            console.error('Error stopping message from ComposeBar:', e);
        }

    }

    /**
     * Handle quick action click
     */
    handleQuickAction(event) {
        const actionId = event.target.getAttribute('data-action-id');
        const action = this.quickActions.find(a => a.id === actionId);


        if (action) {
            try {
                if (this.chatInterface && typeof this.chatInterface.askQuickActions === 'function') {
                    this.chatInterface.askQuickActions(action);
                    setTimeout(() => {
                        this.quickActions = [];
                        this.renderQuickReplies();
                    }, 0);
                }
            } catch (e) {
                console.error('Error handling quick action from ComposeBar:', e);
            }
        }


        if (action && this.callbacks.onQuickAction) {
            this.callbacks.onQuickAction(action);
        }
    }

    /**
     * Handle attachment button click
     */
    handleAttachment() {
        this.handleOpenAttachmentDialog();
    }

    handleFileUpload() {
        const fileInput = this.container.querySelector('[data-eva-file-input]');
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * Handle speech to text button click or clear input
     */
    handleSpeechToText() {

        const textarea = this.container.querySelector('[data-eva-input]');
        const actualValue = textarea ? textarea.value : '';


        const hasInput = actualValue.length > 0;

        if (hasInput) {
            this.clearInput();
            return;
        }


        if (!this.recognition) {
            alert('Speech recognition is not supported in this browser');
            return;
        }

        if (this.isRecording) {

            this.recognition.stop();
        } else {

            this.isRecording = true;
            this.updateSpeechButton();
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                this.isRecording = false;
                this.updateSpeechButton();
            }
        }

        if (this.callbacks.onSpeechToText) {
            this.callbacks.onSpeechToText(this.isRecording);
        }
    }

    /**
     * Clear input and update UI
     */
    clearInput() {
        const textarea = this.container.querySelector('[data-eva-input]');
        if (textarea) {
            textarea.value = '';
            this.input = '';
            this.autoResize(textarea);
            this.updateMicrophoneButton();
        } else {
            console.log('textarea not found!');
        }
    }

    /**
     * Open Shoelace dialog
     */
    handleOpenDialog() {
        const dialog = this.container.querySelector('[data-eva-dialog]');
        if (!dialog) return;
        try {
            if (typeof dialog.show === 'function') {
                dialog.show();
            } else {
                dialog.setAttribute('open', '');
            }
        } catch (e) {
            dialog.setAttribute('open', '');
        }

        // Render common agents in the dialog
        this.updateCommonAgentsInDialog();

        this.loadAndRenderAgents('');
    }

    /**
     * Update common agents content in the dialog
     */
    updateCommonAgentsInDialog() {
        const dialog = this.container.querySelector('[data-eva-dialog]');
        if (!dialog) return;
        
        const commonAgentsDialog = dialog.querySelector('[data-eva-common-agents-dialog]');
        if (!commonAgentsDialog) return;
        
        // Render common agents directly in the dialog
        commonAgentsDialog.innerHTML = this.commonAgents.map(agent => {
            return `<div class="agents-action-item ${this.selectedCommonAgent?.id === agent.id ? 'active' : ''}" data-eva-common-agents-action data-agent-id="${agent.id}">
                <div class="modeCardIcon"><img src="${(this.isMSEnv && agent.id === 'webSearch') ? `images/MS-Icons/web-ms.svg` : agent.icon}" alt="" width="18" height="18" /></div>
                <div class="modeCardContent">
                    <div class="modeCardText">${agent?.name}</div>
                    <div class="modeCardDescription">${agent?.shortDescription}</div>
                </div>
            </div>`;
        }).join('');

        // Add click handlers for common agents in the dialog
        this.attachCommonAgentsEventListeners(commonAgentsDialog);
    }

    /**
     * Attach event listeners for common agents in the dialog
     */
    attachCommonAgentsEventListeners(container) {
        container.querySelectorAll('[data-eva-common-agents-action]').forEach(item => {
            item.addEventListener('click', () => {
                const agentId = item.getAttribute('data-agent-id');
                const agent = this.commonAgents.find(a => String(a.id) === String(agentId));
                if (!agent) return;
                if (this.selectedCommonAgent?.id === agentId) {
                    this.selectedCommonAgent = null;
                    if (this.chatInterface && this.chatInterface.setAgentContext) {
                        this.chatInterface.setAgentContext(null);
                    }
                } else {
                    this.selectedCommonAgent = agent;
                    if (this.chatInterface && this.chatInterface.setAgentContext) {
                        this.chatInterface.setAgentContext(agent);
                    }
                }
                this.renderCommonAgents();
                this.handleCloseDialog();
            });
        });
    }

    /**
     * Close Shoelace dialog
     */
    handleCloseDialog() {
        const dialog = this.container.querySelector('[data-eva-dialog]');
        if (!dialog) return;
        try {
            if (typeof dialog.hide === 'function') {
                dialog.hide();
            } else {
                dialog.removeAttribute('open');
            }
        } catch (e) {
            dialog.removeAttribute('open');
        } finally {
            /*need to clear the entered text if any in the data-eva-agent-search-input-box*/
            const agentSearchInputBox = this.container.querySelector('[data-eva-agent-search-input-box]');
            if (agentSearchInputBox) {
                agentSearchInputBox.value = '';
            }
        }
    }

    /**
     * Open attachment dialog
     */
    handleOpenAttachmentDialog() {
        const attachmentDialog = this.container.querySelector('[data-eva-attachment-dialog]');
        if (!attachmentDialog) return;
        try {
            if (typeof attachmentDialog.show === 'function') {
                attachmentDialog.show();
            } else {
                attachmentDialog.setAttribute('open', '');
            }
        } catch (e) {
            attachmentDialog.setAttribute('open', '');
        }

        this.loadAndRenderRecentFiles();
    }

    /**
     * Close attachment dialog
     */
    handleCloseAttachmentDialog() {
        const attachmentDialog = this.container.querySelector('[data-eva-attachment-dialog]');
        if (!attachmentDialog) return;
        try {
            if (typeof attachmentDialog.hide === 'function') {
                attachmentDialog.hide();
            } else {
                attachmentDialog.removeAttribute('open');
            }
        } catch (e) {
            attachmentDialog.removeAttribute('open');
        }
    }

    /**
     * Load and render recent files
     */
    loadAndRenderRecentFiles() {
        try {
            const recentFilesListEl = this.container.querySelector('[data-eva-recent-files]');
            if (!recentFilesListEl) return;

            // Show loading state
            recentFilesListEl.innerHTML = `<li>Loading recent files...</li>`;

            // Render recent files
            renderRecentFiles(recentFilesListEl, {
                onFileAttach: (file) => this.handleFileAttachFromRecent(file),
                onFileRemove: (file) => this.handleFileRemoveFromRecent(file),
                onFileClose: () => this.handleCloseAttachmentDialog()
            });
        } catch (error) {
            console.error('Error loading recent files:', error);
            const recentFilesListEl = this.container.querySelector('[data-eva-recent-files]');
            if (recentFilesListEl) {
                recentFilesListEl.innerHTML = `<li>Failed to load recent files</li>`;
            }
        }
    }

    /**
     * Handle file attachment from recent files
     */
    handleFileAttachFromRecent(file) {
        try {
            console.log('Attaching recent file:', file);

            // Close the attachment dialog
            this.handleCloseAttachmentDialog();

            // Call fileUploaderInterface.uploadFile just like in file input change event
            if (this.fileUploaderInterface && typeof this.fileUploaderInterface.uploadFile === 'function') {
                // Create a synthetic event object with the recent file
                const syntheticEvent = {
                    target: {
                        files: [file]
                    },
                    type: 'change'
                };
                this.fileUploaderInterface.uploadFile(syntheticEvent);
            }
        } catch (error) {
            console.error('Error attaching recent file:', error);
        }
    }

    /**
     * Handle file removal from recent files
     */
    handleFileRemoveFromRecent(file) {
        try {
            console.log('Removing file from recent:', file);

            // Here you can add logic to remove file from recent files store
            // This could dispatch a Redux action to remove from AllrecentFiles
            const event = new CustomEvent('eva-recent-file-remove', {
                detail: { file },
                bubbles: true
            });
            this.container.dispatchEvent(event);
        } catch (error) {
            console.error('Error removing recent file:', error);
        }
    }

    /**
     * Re-render while preserving textarea content and focus state
     */
    renderWithStatePreservation() {
        // Preserve textarea state
        const textarea = this.container.querySelector('[data-eva-input]');
        const currentValue = textarea ? textarea.value : '';
        const wasFocused = textarea ? document.activeElement === textarea : false;
        const cursorPosition = textarea ? textarea.selectionStart : 0;
        const currentAttachments = [...this.attachments];
        // Re-render
        this.render();
        this.renderCommonAgents();

        // Restore textarea state
        const newTextarea = this.container.querySelector('[data-eva-input]');
        if (newTextarea) {
            newTextarea.value = currentValue;
            this.input = currentValue; // Update internal state

            if (wasFocused) {
                newTextarea.focus();
                newTextarea.setSelectionRange(cursorPosition, cursorPosition);
            }
        }

        // Restore attachments if they exist
        if (currentAttachments.length > 0) {
            this.attachments = currentAttachments;
        }

    }

    /**
     * Set up event listeners for override modal buttons
     */
    setupOverrideModalEvents() {
        const modal = this.container.querySelector('.overridingMsgModal');
        if (!modal) return;

        const removeBtn = modal.querySelector('.kr-primary-btn-black');
        const closeBtn = modal.querySelector('.closeBtn');

        if (removeBtn) {
            removeBtn.addEventListener('click', () => this.handleOverrideConfirm());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.handleOverrideCancel());
        }
    }

    /**
     * Show override confirmation dialog
     */
    showOverrideDialog() {
        const dialog = this.container.querySelector('[data-eva-override-dialog]');
        if (!dialog) return;
        try {
            if (typeof dialog.show === 'function') {
                dialog.show();
            } else {
                dialog.setAttribute('open', '');
            }
        } catch (e) {
            dialog.setAttribute('open', '');
        }
    }

    /**
     * Close override confirmation dialog
     */
    closeOverrideDialog() {
        const dialog = this.container.querySelector('[data-eva-override-dialog]');
        if (!dialog) return;
        try {
            if (typeof dialog.hide === 'function') {
                dialog.hide();
            } else {
                dialog.removeAttribute('open');
            }
        } catch (e) {
            dialog.removeAttribute('open');
        }
    }

    /**
     * Handle override cancel button click
     */
    handleOverrideCancel() {
        this.showOverRideModal = false;
        this.renderWithStatePreservation(); // Re-render while preserving textarea content
    }

    /**
     * Handle override confirm button click
     */
    handleOverrideConfirm() {
        // Clear attachments and hide dialog
        this.attachments = [];
        this.showOverRideModal = false;
        this.renderWithStatePreservation(); // Re-render while preserving textarea content

        // Continue with agent invocation
        if (this.selectedAgent) {
            try {
                InvokeAgent(this.selectedAgent);
            } catch (e) {
                console.error(`InvokeAgent failed for ${this.selectedAgent.name}`, e);
            }
            this.selectedAgent = null;
        }
    }

    handleAgentSearch(event) {
        const searchValue = event.target.value;

        // Check which tab is currently active
        const activeTab = this.container.querySelector('.agentsTabHeading.active');
        const activeTabText = activeTab ? activeTab.textContent.trim() : 'Agents';

        if (activeTabText === 'Flows') {
            this.searchAndRenderFlows(searchValue);
        } else {
            this.loadAndRenderAgents(searchValue);
        }
        /*filter the agents list by their name and render the filtered list */

    }

    /**
     * Fetch and render agents in the dialog
     */

    async getAgents() {
        return new Promise((resolve) => {
            try {
                const state = store.getState();
                const status = state?.global?.allAgents?.status;

                // If already loaded, resolve immediately
                if (status === 'success') {
                    resolve();
                    return;
                }

                // If not loaded, dispatch fetch
                if (!status || status === 'idle') {
                    const userId = window?.sdkConfig?.userId;
                    if (userId) {
                        store.dispatch(fetchAgents({ userId }));
                    }
                }

                // Wait for agents to load
                const unsubscribe = store.subscribe(() => {
                    const currentState = store.getState();
                    const currentStatus = currentState?.global?.allAgents?.status;

                    if (currentStatus === 'success' || currentStatus === 'failed') {
                        unsubscribe();
                        resolve();
                    }
                });

            } catch (e) {
                console.error('Error loading agents inside compose bar:', e);
                resolve(); // Resolve anyway to not block the UI
            }
        });
    }
    async loadAndRenderAgents(searchTerm = '') {
        const allListEl = this.container.querySelector('[data-eva-all-agents]');
        if (!allListEl) return;

        // Show loading state
        allListEl.innerHTML = `<li>Loading...</li>`;

        try {
            const state = store.getState();
            const allAgents = state?.global?.allAgents?.data?.agents || [];
            const recents = state?.global?.allAgents?.data?.recents || [];
            const agenticFlows = allAgents.filter(agent => (agent?.type === "agenticApp" && agent?.enabled));

            // Store agenticFlows as a class property for tab switching
            this.agenticFlows = agenticFlows;

            let enabledAgents = Array.isArray(allAgents)
                ? allAgents.filter(agent => agent?.enabled)
                : [];
            enabledAgents = enabledAgents.filter(agent => agent?.type !== "agenticApp");
            if (searchTerm?.length > 0) {
                enabledAgents = enabledAgents.filter(agent => agent?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
            }
            this.renderAgentsList(allListEl, enabledAgents, 'recent');


        } catch (e) {
            allListEl.innerHTML = `<li>Failed to load agents</li>`;
        }
    }

    /**
     * Render a list of agents into a target element
     */
    renderAgentsList(targetEl, agents, listType) {
        if (!agents || agents.length === 0) {
            targetEl.innerHTML = `<li>No agents found</li>`;
            return;
        }
        /*get attachments from DOM */
        const attachments = this.container.querySelectorAll('[data-attach-uid]');
        const itemsHtml = agents.map(agent => {
            const safeName = (agent?.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const icon = agent?.type === "agenticApp" ? `${getIconsList(agent, [])}` : `<img src="${agent?.icon}" alt="" width="18" height="18" />`;
            const agentType = getAgentType(agent?.type);
            return `<li class="eva-agent-item" data-agent-id="${agent.id}" data-agent-type="${listType}">
            <div class="agent-icon">${icon}</div>
                <div class="agent-details">
                <div class="agent-name">${safeName}</div>
                <div class="agent-desc">
                    <span class="agent-type" style="${agent?.type === "agenticApp" ? "display:none;" : ""}">${agentType}<span class="agent-type-separator">•</span></span>                    
                    ${agent?.description}
                </div>
            </div>
            </li>`;
        }).join('');
        targetEl.innerHTML = itemsHtml;

        // Attach click handlers
        targetEl.querySelectorAll('.eva-agent-item').forEach(item => {
            item.addEventListener('click', () => {
                const agentId = item.getAttribute('data-agent-id');
                const agent = agents.find(a => String(a.id) === String(agentId));
                if (!agent) return;
                this.selectedAgent = agent;
                if (attachments?.length > 0) {
                    // Store the agent for later invocation after user confirms
                    // this.pendingAgentInvocation = agent;
                    this.showOverRideModal = true;
                    this.renderWithStatePreservation();
                    this.setupOverrideModalEvents(); // Set up event listeners for modal buttons
                } else {
                    this.commonAgents = [];
                    try { InvokeAgent(agent); } catch (e) { console.error('InvokeAgent failed', e); }
                }
                this.handleCloseDialog();
            });
        });
    }

    /**
     * Update speech button appearance based on recording state
     */
    updateSpeechButton() {
        const speechBtn = this.container.querySelector('[data-eva-speech]');
        if (speechBtn) {
            if (this.isRecording) {
                speechBtn.classList.add('recording');
                speechBtn.setAttribute('title', 'Stop recording');
            } else {
                speechBtn.classList.remove('recording');
                speechBtn.setAttribute('title', 'Voice input');
            }
        }
    }

    /**
     * Set callback functions
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty('on' + event.charAt(0).toUpperCase() + event.slice(1))) {
            this.callbacks['on' + event.charAt(0).toUpperCase() + event.slice(1)] = callback;
        }
        return this;
    }

    /**
     * Set input value
     */
    setValue(value) {
        this.input = value;
        const textarea = this.container.querySelector('[data-eva-input]');
        if (textarea) {
            textarea.value = value;
            this.autoResize(textarea);
        }
        return this;
    }

    /**
     * Get current input value
     */
    getValue() {
        return this.input;
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;
        const sendBtn = this.container.querySelector('[data-eva-send]');
        const stopBtn = this.container.querySelector('[data-eva-stop]');
        const activeCommonAgent = this.container.querySelector('.agents-action-item.active');

        if (sendBtn) {
            // Preserve the icon instead of replacing with text
            if (loading) {
                sendBtn.innerHTML = StopIcon({ size: 16, color: "#F97066" });
                sendBtn.title = 'Stop';
                sendBtn.classList.add('stop-btn');
            } else {
                sendBtn.innerHTML = this.getSendButtonIcon();
                sendBtn.title = 'Send';
                sendBtn.classList.remove('stop-btn');
                if (this.currentAnswerResponse?.status === 'completed' || this.currentAnswerResponse?.status === 'terminated') {
                    if (activeCommonAgent) {
                        activeCommonAgent.classList.remove('active');
                    }
                    this.currentAnswerResponse = null;
                }
            }
        }

        if (stopBtn) {
            stopBtn.disabled = !loading;
        }

        return this;
    }



    /**
     * Remove an attachment by UID using FileUpload interface
     */
    removeAttachmentByUid(uid) {
        if (!uid) return;
        const file = (this.attachments || []).find(f => String(f?.uID || f?.componentId || f?.docId) === String(uid));
        if (!file) {
            console.log('File not found for removal, uid:', uid);
            return;
        }
        try {
            console.log('Removing file:', file);

            // Add safety check for consistency
            if (this.fileUploaderInterface && typeof this.fileUploaderInterface.removeContext === 'function') {
                this.fileUploaderInterface.removeContext(file);
            }

            this.attachments = this.attachments.filter(f => String(f?.uID || f?.componentId || f?.docId) !== String(uid));
            this.renderAttachments();

        } catch (err) {
            console.warn('Failed to remove attachment:', err);
        }
    }

    /**
     * Show/hide the compose bar
     */
    setVisible(visible) {
        this.container.style.display = visible ? 'block' : 'none';
        return this;
    }

    /**
     * Focus on the input
     */
    focus() {
        const textarea = this.container.querySelector('[data-eva-input]');
        if (textarea) {
            textarea.focus();
        }
        return this;
    }

    /**
     * Disable/enable the compose bar
     */
    setDisabled(disabled) {
        const textarea = this.container.querySelector('[data-eva-input]');
        const buttons = this.container.querySelectorAll('button');

        if (textarea) {
            textarea.disabled = disabled;
        }

        buttons.forEach(btn => {
            if (!disabled || !btn.hasAttribute('data-eva-stop')) {
                btn.disabled = disabled;
            }
        });

        return this;
    }

    /**
     * Clean up ComposeBar resources
     */
    cleanup() {
        console.log('🧹 ComposeBar cleanup completed');
    }

    destroy() {
        // Clean up timers and observers first
        this.cleanup();

        if (this.container) {
            this.container.innerHTML = '';
        }
        if (typeof this.unsubscribe === 'function') {
            try { this.unsubscribe(); } catch (e) { }
            this.unsubscribe = null;
        }
        if (typeof this.fileUploaderUnsubscribe === 'function') {
            try { this.fileUploaderUnsubscribe(); } catch (e) { }
            this.fileUploaderUnsubscribe = null;
        }
        if (typeof this.selectedContextUnsubscribe === 'function') {
            try { this.selectedContextUnsubscribe(); } catch (e) { }
            this.selectedContextUnsubscribe = null;
        }
    }
}

export default ComposeBar;
