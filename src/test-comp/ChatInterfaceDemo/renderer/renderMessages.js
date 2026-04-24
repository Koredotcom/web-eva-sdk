import { TemplateRenderer } from "../../../templateRenderer";
import { deduplicateQuestions } from "./deduplicate";
import { shouldSkipRender } from "./shouldSkipRender";

/**
 * Imperative renderer that takes the questions map from ChatInterface.subscribe
 * and writes the resulting per-template HTML directly into `container`.
 *
 * Each question is asked of the TemplateRenderer for its HTML (the "embed code"
 * per template type), wrapped in a `.chat-message-container` div, and appended
 * to a single innerHTML write. This avoids the React VDOM cost of re-keying
 * many templates on every websocket tick and keeps interactive subtrees
 * (Slack/Teams editors, smart-compose) intact.
 *
 * The `skipPredicate` lets callers special-case templates they want to render
 * via React instead of HTML (e.g. multi_intent_execution); skipped items leave
 * a placeholder that the caller can later mount React into.
 *
 * Ported from CDN_support: src/test-comp/ChatInterfaceDemo/ChatInterface.jsx
 */
export function renderMessages({
    questions,
    container,
    scrollContainer,
    loadingText = "Analyzing",
    extraClass = "",
    skipPredicate,
}) {
    if (!container) return [];
    if (shouldSkipRender(container)) return [];

    if (!questions || Object.keys(questions).length === 0) {
        container.innerHTML = '';
        return [];
    }

    const prevScrollTop = scrollContainer?.scrollTop || 0;
    const deduped = deduplicateQuestions(questions);
    const skipped = [];

    const html = deduped.map((item) => {
        if (item?.isTask) return '';
        if (typeof skipPredicate === 'function' && skipPredicate(item)) {
            skipped.push(item);
            const id = item?.messageId || item?.reqId || item?.id || '';
            return `<div class="chat-message-container chat-message-react-slot" data-message-id="${id}"></div>`;
        }
        const el = TemplateRenderer.generateHTMLTemplate(item, { loadingText });
        const cls = `chat-message-container${extraClass ? ' ' + extraClass : ''}`;
        return `<div class="${cls}">${el.innerHTML}</div>`;
    }).join('');

    container.innerHTML = html;

    if (scrollContainer) {
        scrollContainer.scrollTop = prevScrollTop;
    }

    return skipped;
}
