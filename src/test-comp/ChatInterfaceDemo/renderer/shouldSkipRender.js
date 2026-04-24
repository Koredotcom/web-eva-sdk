/**
 * Decide whether to skip an imperative re-render of the messages container.
 *
 * The chat surface contains several editable / focused elements (Slack and Teams
 * editors, smart-compose input, recipient search, GPT prompt input). Re-rendering
 * the container while one of those holds focus would blow away the input state
 * and cause a flicker, so we bail out and let the next subscribe tick try again.
 *
 * Ported from CDN_support: src/test-comp/ChatInterfaceDemo/ChatInterface.jsx
 */
export function shouldSkipRender(container) {
    if (!container) return false;
    if (container.querySelector('.ts-control input:focus')) return true;
    if (container.querySelector('.slack-search-input:focus, .teams-search-input:focus')) return true;
    if (container.querySelector('.slack-message-editor:focus, .teams-message-editor:focus')) return true;
    if (container.querySelector('.sc-prompt-input:focus')) return true;
    if (container.querySelector('.emailSmartCompose')) return true;
    if (container.querySelector('[data-sending="true"]')) return true;
    return false;
}
