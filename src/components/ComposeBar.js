import NewChat from "../chat/NewChat.js";

/**
 * ComposeBar - A standalone compose bar component in plain JavaScript
 * Can be embedded in any HTML page as a reusable component
 */
class ComposeBar {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            placeholder: 'Ask question...',
            showQuickActions: true,
            showNewButton: true,
            showStopButton: true,
            quickActions: [],
            ...options
        };
        
        this.input = '';
        this.isLoading = false;
        this.isRecording = false;
        this.recognition = null;
        this.callbacks = {
            onSend: null,
            onNewChat: null,
            onStop: null,
            onQuickAction: null,
            onChange: null,
            onAttachment: null,
            onSpeechToText: null
        };
        
        this.init();
    }
    
    /**
     * Initialize the compose bar
     */
    init() {
        if (!this.container) {
            throw new Error('ComposeBar container not found');
        }
        
        this.initSpeechRecognition();
        this.render();
        this.attachEventListeners();
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
                console.log('Speech recognition ended');
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
     * Render the compose bar HTML
     */
    render() {
        const quickActionsHtml = this.options.showQuickActions && this.options.quickActions.length > 0 
            ? `<div class="eva-quick-reply-container">
                ${this.options.quickActions.map(action => 
                    `<div class="eva-quick-reply-chip" data-action-id="${action.id}">
                        ${action.label}
                    </div>`
                ).join('')}
            </div>`
            : '';
            
        this.container.innerHTML = `
            <div class="eva-composebar-parent">
                <div class="eva-composebar-area">
                    ${quickActionsHtml}
                    <div class="eva-input-container">
                        <textarea 
                            class="eva-compose-textarea" 
                            placeholder="${this.options.placeholder}"
                            rows="1"
                            data-eva-input
                        ></textarea>
                        <div class="eva-input-actions">
                            <button class="eva-input-action-btn" data-eva-attachment title="Attach file">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M21.44 11.05L12.25 20.24C11.1242 21.3658 9.59722 22.0001 8.005 22.0001C6.41278 22.0001 4.88583 21.3658 3.76 20.24C2.63417 19.1142 1.99988 17.5872 1.99988 15.995C1.99988 14.4028 2.63417 12.8758 3.76 11.75L12.33 3.18C13.0506 2.45944 14.0251 2.05911 15.04 2.05911C16.0549 2.05911 17.0294 2.45944 17.75 3.18C18.4706 3.90056 18.8709 4.87507 18.8709 5.88C18.8709 6.88493 18.4706 7.85944 17.75 8.58L9.18 17.15C8.81944 17.5106 8.33056 17.7109 7.82 17.7109C7.30944 17.7109 6.82056 17.5106 6.46 17.15C6.09944 16.7894 5.89911 16.3006 5.89911 15.79C5.89911 15.2794 6.09944 14.7906 6.46 14.43L14.71 6.18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                            <button class="eva-input-action-btn" data-eva-speech title="Voice input">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M19 10V12C19 16.42 15.42 20 11 20H13C17.42 20 21 16.42 21 12V10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12 20V24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M8 24H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="eva-composebar-buttons">
                    <button class="eva-btn eva-btn-primary" data-eva-send ${this.isLoading ? 'disabled' : ''}>
                        ${this.isLoading ? 'Sending...' : 'Send'}
                    </button>
                    ${this.options.showNewButton ? 
                        `<button class="eva-btn eva-btn-secondary" data-eva-new>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            New
                        </button>` : ''
                    }
                    ${this.options.showStopButton ? 
                        `<button class="eva-btn eva-btn-secondary" data-eva-stop ${!this.isLoading ? 'disabled' : ''}>
                            Stop
                        </button>` : ''
                    }
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
        
        // Textarea events
        if (textarea) {
            textarea.addEventListener('input', (e) => this.handleInputChange(e));
            textarea.addEventListener('keydown', (e) => this.handleKeyDown(e));
            textarea.addEventListener('paste', (e) => this.handlePaste(e));
        }
        
        // Button events
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.handleSend());
        }
        
        if (newBtn) {
            newBtn.addEventListener('click', () => this.handleNewChat());
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.handleStop());
        }
        
        // Quick action chip events
        quickActionChips.forEach(chip => {
            chip.addEventListener('click', (e) => this.handleQuickAction(e));
        });
        
        // Attachment button event
        if (attachmentBtn) {
            attachmentBtn.addEventListener('click', () => this.handleAttachment());
        }
        
        // Speech to text button event
        if (speechBtn) {
            speechBtn.addEventListener('click', () => this.handleSpeechToText());
        }
    }
    
    /**
     * Handle input change
     */
    handleInputChange(event) {
        this.input = event.target.value;
        this.autoResize(event.target);
        
        if (this.callbacks.onChange) {
            this.callbacks.onChange(this.input, event);
        }
    }
    
    /**
     * Handle key down events
     */
    handleKeyDown(event) {
        // Send on Enter (without Shift)
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.handleSend();
        }
    }
    
    /**
     * Handle paste events
     */
    handlePaste(event) {
        // Handle file paste if needed in the future
        setTimeout(() => {
            this.autoResize(event.target);
        }, 0);
    }
    
    /**
     * Auto-resize textarea based on content
     */
    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
    
    /**
     * Handle send action
     */
    handleSend() {
        if (!this.input.trim() || this.isLoading) return;
        
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
        if (this.callbacks.onStop) {
            this.callbacks.onStop();
        }
    }
    
    /**
     * Handle quick action click
     */
    handleQuickAction(event) {
        const actionId = event.target.getAttribute('data-action-id');
        const action = this.options.quickActions.find(a => a.id === actionId);
        
        if (action && this.callbacks.onQuickAction) {
            this.callbacks.onQuickAction(action);
        }
    }
    
    /**
     * Handle attachment button click
     */
    handleAttachment() {
        if (this.callbacks.onAttachment) {
            this.callbacks.onAttachment();
        }
    }
    
    /**
     * Handle speech to text button click
     */
    handleSpeechToText() {
        if (!this.recognition) {
            alert('Speech recognition is not supported in this browser');
            return;
        }
        
        if (this.isRecording) {
            // Stop recording
            this.recognition.stop();
        } else {
            // Start recording
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
     * Clear input
     */
    clearInput() {
        this.setValue('');
        return this;
    }
    
    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;
        const sendBtn = this.container.querySelector('[data-eva-send]');
        const stopBtn = this.container.querySelector('[data-eva-stop]');
        
        if (sendBtn) {
            sendBtn.disabled = loading;
            sendBtn.textContent = loading ? 'Sending...' : 'Send';
        }
        
        if (stopBtn) {
            stopBtn.disabled = !loading;
        }
        
        return this;
    }
    
    /**
     * Update quick actions
     */
    setQuickActions(quickActions) {
        this.options.quickActions = quickActions;
        this.render();
        this.attachEventListeners();
        return this;
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
     * Destroy the compose bar
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComposeBar;
} else if (typeof define === 'function' && define.amd) {
    define([], function() { return ComposeBar; });
} else {
    window.ComposeBar = ComposeBar;
}