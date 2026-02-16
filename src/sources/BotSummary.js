import { keyBy } from 'lodash';
import { encodeHtml } from '../utils/helpers.js';

/**
 * BotSummary - Renders bot conversation summary
 * Note: This is a simplified version. Full implementation would require bot conversation rendering
 */
class BotSummary {
    /**
     * Render bot summary
     * @param {Object} params - { data, botConversation, newBotConversations }
     */
    static render({ data, botConversation, newBotConversations }) {
        if (!data && !botConversation) {
            return '<div>No bot conversation data available</div>';
        }

        let html = `
            <div class="botConversation-block showExpandArea">
                <div class="flexendContent">
                    <div class="top-scoller-box">
                        <div class="top-header">
                            <div class="bot-conversation-icon-block">
                                <span class="icon-block">
                                    <img src="${encodeHtml(data?.sources?.[0]?.icon || data?.agentIcon || '')}" alt="" />
                                </span>
                                <span class="bot-agent-name">${encodeHtml(data?.sources?.[0]?.title || data?.agentName || 'Bot Agent')}</span>
                            </div>
                        </div>
        `;

        // Render bot conversation messages
        if (newBotConversations && Object.keys(newBotConversations).length > 0) {
            Object.keys(newBotConversations).forEach((key) => {
                const botMsg = newBotConversations[key];
                html += `
                    <div class="bot-answer-pair">
                        <div class="iconSec withoutBorder">
                            <img src="${encodeHtml(data?.sources?.[0]?.icon || '')}" alt="" />
                        </div>
                        <div class="bot-message-content">
                            ${botMsg?.question ? `<div class="bot-question">${encodeHtml(botMsg.question)}</div>` : ''}
                            ${botMsg?.answer ? `<div class="bot-answer">${encodeHtml(botMsg.answer)}</div>` : ''}
                        </div>
                    </div>
                `;
            });
        } else if (data?.answer) {
            html += `
                <div class="bot-answer-pair">
                    <div class="iconSec">
                        <img src="${encodeHtml(data?.sources?.[0]?.icon || '')}" alt="" />
                    </div>
                    <div class="botName font600">${encodeHtml(data.answer)}</div>
                </div>
            `;
        }

        html += `
                    </div>
                </div>
            </div>
        `;

        return html;
    }
}

export default BotSummary;

