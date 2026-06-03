import { useCallback, useEffect, useRef } from "react";
import { renderMessages } from "./renderMessages";
import { useComposebarBotVisibility } from "./useComposebarBotVisibility";
import { cleanupAllAuthChallenges } from "../../../templateRenderer/functionality/agent-auth-challenge";
import store from "../../../redux/store";
import { notifyAttachmentChipClick } from "../../../chat/ChatInterface";

/**
 * Glue hook that wires a ChatInterface SDK instance into the imperative
 * renderer. Call from a component that owns refs to the messages container
 * and (optionally) the scroll container.
 *
 *   const { onSubscribe, rerender, skippedItems } = useChatMessageRenderer({
 *     containerRef: messagesContainerRef,
 *     scrollContainerRef,
 *     skipPredicate: (item) => item?.templateType === 'multi_intent_execution',
 *   });
 *
 *   useEffect(() => chatInterface.subscribe(onSubscribe), [onSubscribe]);
 *
 * `skippedItems.current` holds the latest list of items the predicate skipped,
 * so callers can mount React for them into the corresponding
 * `.chat-message-react-slot[data-message-id="..."]` placeholders.
 *
 * Ported from CDN_support: src/test-comp/ChatInterfaceDemo/ChatInterface.jsx
 */
export function useChatMessageRenderer({
    containerRef,
    scrollContainerRef,
    loadingText = "Analyzing",
    skipPredicate,
    composebarBotSelector,
}) {
    const questionsRef = useRef(null);
    const skippedItems = useRef([]);

    const doRender = useCallback(
        (questions, extraClass = "") => {
            const skipped = renderMessages({
                questions,
                container: containerRef.current,
                scrollContainer: scrollContainerRef?.current,
                loadingText,
                extraClass,
                skipPredicate,
            });
            skippedItems.current = skipped;
        },
        [containerRef, scrollContainerRef, loadingText, skipPredicate]
    );

    const { visible: botVisible, expanded: botExpanded } = useComposebarBotVisibility({
        selector: composebarBotSelector,
        onChange: () => {
            if (questionsRef.current) {
                doRender(questionsRef.current, computeExtraClass(botVisible, botExpanded));
            }
        },
    });

    const onSubscribe = useCallback(
        (question /* , searchResponse, moreAvailable, errorStates, quickActions */) => {
            questionsRef.current = question;
            doRender(question, computeExtraClass(botVisible, botExpanded));
        },
        [doRender, botVisible, botExpanded]
    );

    const rerender = useCallback(() => {
        if (questionsRef.current) {
            doRender(questionsRef.current, computeExtraClass(botVisible, botExpanded));
        }
    }, [doRender, botVisible, botExpanded]);

    // Delegated click listener for attachment chips — survives container innerHTML re-renders
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleChipClick = (e) => {
            const chip = e.target.closest('.file-preview-chip[data-file-id]');
            if (!chip) return;
            const fileId = chip.dataset.fileId;
            if (!fileId) return;
            const reqId = chip.dataset.reqId || '';
            const fileName = chip.dataset.fileName || 'file';
            const fileExtension = chip.dataset.fileExtension || '';
            const source = chip.dataset.source || 'attachment';
            const questions = store.getState().global?.questions || {};
			const question = questions[reqId];
			const messageId = question?.messageId || '';
			// Only fire if messageId is available — during loading there's no messageId yet
			if (!messageId) return;
			notifyAttachmentChipClick({ fileId, messageId, fileName, fileExtension, source, reqId });
        };

        container.addEventListener('click', handleChipClick);
        return () => {
            container.removeEventListener('click', handleChipClick);
            cleanupAllAuthChallenges();
        };
    }, [containerRef]);

    return { onSubscribe, rerender, skippedItems, questionsRef };
}

function computeExtraClass(visible, expanded) {
    return [
        visible ? 'composebar-bot-input-visible' : '',
        expanded ? 'composebar-bot-input-expanded' : '',
    ].filter(Boolean).join(' ');
}
