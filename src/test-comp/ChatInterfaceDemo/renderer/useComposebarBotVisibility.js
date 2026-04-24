import { useEffect, useState } from "react";

/**
 * Watch the imperative compose-bar's bot input wrapper for visibility / expansion
 * changes and surface them to React. Returns { visible, expanded }.
 *
 * The wrapper is injected into the DOM by RenderComposeBar after mount, so we
 * poll via requestAnimationFrame until it appears, then attach a MutationObserver
 * on its style/class. The optional `onChange` callback fires after every sync so
 * callers can re-render the messages container with the right modifier classes.
 *
 * If the project does not use the imperative compose bar (e.g. UNIFIED_SDK uses a
 * React <Composebar> component), the wrapper will never appear, the hook simply
 * returns { visible: false, expanded: false } and the observer is never created.
 *
 * Ported from CDN_support: src/test-comp/ChatInterfaceDemo/ChatInterface.jsx
 */
export function useComposebarBotVisibility({
    selector = '#eva-composebar .composebar-bot-input-wrapper',
    onChange,
} = {}) {
    const [visible, setVisible] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        let observer = null;
        let rafId = null;
        let cancelled = false;

        const getEl = () => document.querySelector(selector);

        const computeVisible = (el) => {
            if (!el) return false;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            return el.getClientRects().length > 0;
        };

        const sync = () => {
            const el = getEl();
            const isVisible = computeVisible(el);
            const isExpanded = !!(isVisible && el && !el.classList.contains('details-hidden'));
            setVisible(isVisible);
            setExpanded(isExpanded);
            if (onChange) onChange({ visible: isVisible, expanded: isExpanded });
        };

        const start = () => {
            if (cancelled) return;
            const el = getEl();
            if (!el) {
                rafId = window.requestAnimationFrame(start);
                return;
            }
            sync();
            observer = new MutationObserver(() => sync());
            observer.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
        };

        start();

        return () => {
            cancelled = true;
            if (rafId) window.cancelAnimationFrame(rafId);
            if (observer) observer.disconnect();
        };
    }, [selector, onChange]);

    return { visible, expanded };
}
